const Database = require("better-sqlite3");
const path = require("path");
const logger = require("./logger");

const DB_PATH = path.join(__dirname, "../../../data/political_sphere.db");

// Connection pool configuration
const POOL_CONFIG = {
	maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
	minConnections: parseInt(process.env.DB_MIN_CONNECTIONS) || 2,
	acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
	createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT) || 30000,
	destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT) || 5000,
	reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL) || 1000,
	createRetryIntervalMillis:
		parseInt(process.env.DB_CREATE_RETRY_INTERVAL) || 200,
};

class DatabaseConnectionPool {
	constructor() {
		this.pool = [];
		this.available = [];
		this.waitingQueue = [];
		this.isShuttingDown = false;
		this.stats = {
			created: 0,
			destroyed: 0,
			acquired: 0,
			released: 0,
			pending: 0,
			borrowed: 0,
		};

		// Initialize minimum connections
		this.initializePool();

		// Start pool maintenance
		this.startMaintenance();
	}

	async initializePool() {
		try {
			for (let i = 0; i < POOL_CONFIG.minConnections; i++) {
				const connection = await this.createConnection();
				this.pool.push(connection);
				this.available.push(connection);
			}
			logger.info("Database connection pool initialized", {
				minConnections: POOL_CONFIG.minConnections,
				maxConnections: POOL_CONFIG.maxConnections,
			});
		} catch (error) {
			logger.error("Failed to initialize database connection pool", {
				error: error.message,
			});
			throw error;
		}
	}

	async createConnection() {
		const connection = {
			db: null,
			id: ++this.stats.created,
			createdAt: Date.now(),
			lastUsed: Date.now(),
			preparedStatements: new Map(),
		};

		try {
			connection.db = new Database(DB_PATH);
			connection.db.pragma("journal_mode = WAL");
			connection.db.pragma("foreign_keys = ON");
			connection.db.pragma("busy_timeout = 30000");
			connection.db.pragma("synchronous = NORMAL");
			connection.db.pragma("cache_size = 1000000"); // 1GB cache
			connection.db.pragma("temp_store = memory");

			logger.debug("Database connection created", {
				connectionId: connection.id,
			});
			return connection;
		} catch (error) {
			logger.error("Failed to create database connection", {
				error: error.message,
			});
			throw error;
		}
	}

	async acquire() {
		if (this.isShuttingDown) {
			throw new Error("Connection pool is shutting down");
		}

		// Try to get available connection
		if (this.available.length > 0) {
			const connection = this.available.pop();
			connection.lastUsed = Date.now();
			this.stats.acquired++;
			this.stats.borrowed++;
			logger.debug("Database connection acquired from pool", {
				connectionId: connection.id,
				available: this.available.length,
				borrowed: this.stats.borrowed,
			});
			return connection;
		}

		// Create new connection if under max limit
		if (this.pool.length < POOL_CONFIG.maxConnections) {
			try {
				const connection = await this.createConnection();
				this.pool.push(connection);
				connection.lastUsed = Date.now();
				this.stats.acquired++;
				this.stats.borrowed++;
				return connection;
			} catch (error) {
				logger.warn("Failed to create new connection, will retry", {
					error: error.message,
				});
			}
		}

		// Wait for available connection
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.stats.pending--;
				const index = this.waitingQueue.indexOf(resolve);
				if (index > -1) {
					this.waitingQueue.splice(index, 1);
				}
				reject(new Error("Connection acquire timeout"));
			}, POOL_CONFIG.acquireTimeoutMillis);

			this.waitingQueue.push({ resolve, reject, timeout });
			this.stats.pending++;
		});
	}

	async release(connection) {
		if (this.isShuttingDown) {
			await this.destroyConnection(connection);
			return;
		}

		// Check if anyone is waiting
		if (this.waitingQueue.length > 0) {
			const waiter = this.waitingQueue.shift();
			this.stats.pending--;
			connection.lastUsed = Date.now();
			waiter.resolve(connection);
			return;
		}

		// Return to available pool
		this.available.push(connection);
		this.stats.released++;
		this.stats.borrowed--;

		logger.debug("Database connection released to pool", {
			connectionId: connection.id,
			available: this.available.length,
			borrowed: this.stats.borrowed,
		});
	}

	async destroyConnection(connection) {
		try {
			if (connection.db) {
				// Finalize prepared statements
				for (const stmt of connection.preparedStatements.values()) {
					stmt.finalize();
				}
				connection.preparedStatements.clear();

				connection.db.close();
				connection.db = null;
			}
			this.stats.destroyed++;

			// Remove from pool arrays
			const poolIndex = this.pool.indexOf(connection);
			if (poolIndex > -1) {
				this.pool.splice(poolIndex, 1);
			}

			const availableIndex = this.available.indexOf(connection);
			if (availableIndex > -1) {
				this.available.splice(availableIndex, 1);
			}

			logger.debug("Database connection destroyed", {
				connectionId: connection.id,
			});
		} catch (error) {
			logger.error("Error destroying database connection", {
				connectionId: connection.id,
				error: error.message,
			});
		}
	}

	startMaintenance() {
		setInterval(() => {
			this.reapStaleConnections();
		}, POOL_CONFIG.reapIntervalMillis);
	}

	reapStaleConnections() {
		const now = Date.now();
		const staleConnections = this.available.filter(
			(conn) => now - conn.lastUsed > 300000, // 5 minutes
		);

		for (const connection of staleConnections) {
			if (this.pool.length > POOL_CONFIG.minConnections) {
				this.destroyConnection(connection);
			}
		}
	}

	async close() {
		this.isShuttingDown = true;

		// Reject all pending acquires
		for (const waiter of this.waitingQueue) {
			clearTimeout(waiter.timeout);
			waiter.reject(new Error("Connection pool is shutting down"));
		}
		this.waitingQueue = [];
		this.stats.pending = 0;

		// Close all connections
		const closePromises = [];
		for (const connection of [...this.pool, ...this.available]) {
			closePromises.push(this.destroyConnection(connection));
		}

		await Promise.all(closePromises);

		logger.info("Database connection pool closed", {
			totalConnections: this.stats.created,
			destroyedConnections: this.stats.destroyed,
		});
	}

	getStats() {
		return {
			...this.stats,
			poolSize: this.pool.length,
			available: this.available.length,
			waiting: this.waitingQueue.length,
		};
	}
}

// Create singleton pool instance
const connectionPool = new DatabaseConnectionPool();

// Legacy compatibility - provide getConnection method
let legacyConnection = null;
function getConnection() {
	if (!legacyConnection) {
		legacyConnection = {
			prepare: (sql) => {
				return {
					run: async (...params) => {
						const conn = await connectionPool.acquire();
						try {
							const stmt = conn.preparedStatements.get(sql);
							if (!stmt) {
								const prepared = conn.db.prepare(sql);
								conn.preparedStatements.set(sql, prepared);
								return prepared.run(...params);
							}
							return stmt.run(...params);
						} finally {
							connectionPool.release(conn);
						}
					},
					get: async (...params) => {
						const conn = await connectionPool.acquire();
						try {
							const stmt = conn.preparedStatements.get(sql);
							if (!stmt) {
								const prepared = conn.db.prepare(sql);
								conn.preparedStatements.set(sql, prepared);
								return prepared.get(...params);
							}
							return stmt.get(...params);
						} finally {
							connectionPool.release(conn);
						}
					},
					all: async (...params) => {
						const conn = await connectionPool.acquire();
						try {
							const stmt = conn.preparedStatements.get(sql);
							if (!stmt) {
								const prepared = conn.db.prepare(sql);
								conn.preparedStatements.set(sql, prepared);
								return prepared.all(...params);
							}
							return stmt.all(...params);
						} finally {
							connectionPool.release(conn);
						}
					},
				};
			},
		};
	}
	return legacyConnection;
}

function close() {
	return connectionPool.close();
}

function getPoolStats() {
	return connectionPool.getStats();
}

module.exports = {
	getConnection,
	close,
	getPoolStats,
	connectionPool,
};
