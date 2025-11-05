const { getConnection } = require("./database-connection");
const logger = require("./logger");

/**
 * Database Transaction Manager
 * Provides transaction support with automatic rollback on errors
 * @see docs/architecture/decisions/adr-0002-database-transactions.md
 */

class Transaction {
	constructor(connection) {
		this.connection = connection;
		this.isActive = false;
		this.savepoints = [];
	}

	async begin() {
		if (this.isActive) {
			throw new Error("Transaction already active");
		}

		try {
			this.connection.db.exec("BEGIN TRANSACTION");
			this.isActive = true;
			logger.debug("Database transaction started");
		} catch (error) {
			logger.error("Failed to start transaction", { error: error.message });
			throw error;
		}
	}

	async commit() {
		if (!this.isActive) {
			throw new Error("No active transaction to commit");
		}

		try {
			this.connection.db.exec("COMMIT");
			this.isActive = false;
			logger.debug("Database transaction committed");
		} catch (error) {
			logger.error("Failed to commit transaction", { error: error.message });
			throw error;
		}
	}

	async rollback() {
		if (!this.isActive) {
			return; // Nothing to rollback
		}

		try {
			this.connection.db.exec("ROLLBACK");
			this.isActive = false;
			logger.debug("Database transaction rolled back");
		} catch (error) {
			logger.error("Failed to rollback transaction", { error: error.message });
			throw error;
		}
	}

	async savepoint(name) {
		if (!this.isActive) {
			throw new Error("No active transaction for savepoint");
		}

		try {
			this.connection.db.exec(`SAVEPOINT ${name}`);
			this.savepoints.push(name);
			logger.debug("Transaction savepoint created", { savepoint: name });
		} catch (error) {
			logger.error("Failed to create savepoint", {
				savepoint: name,
				error: error.message,
			});
			throw error;
		}
	}

	async rollbackToSavepoint(name) {
		if (!this.isActive) {
			throw new Error("No active transaction for savepoint rollback");
		}

		try {
			this.connection.db.exec(`ROLLBACK TO SAVEPOINT ${name}`);
			// Remove savepoints after the rolled back one
			const index = this.savepoints.indexOf(name);
			if (index > -1) {
				this.savepoints = this.savepoints.slice(0, index + 1);
			}
			logger.debug("Rolled back to savepoint", { savepoint: name });
		} catch (error) {
			logger.error("Failed to rollback to savepoint", {
				savepoint: name,
				error: error.message,
			});
			throw error;
		}
	}

	async releaseSavepoint(name) {
		if (!this.isActive) {
			throw new Error("No active transaction for savepoint release");
		}

		try {
			this.connection.db.exec(`RELEASE SAVEPOINT ${name}`);
			const index = this.savepoints.indexOf(name);
			if (index > -1) {
				this.savepoints.splice(index, 1);
			}
			logger.debug("Savepoint released", { savepoint: name });
		} catch (error) {
			logger.error("Failed to release savepoint", {
				savepoint: name,
				error: error.message,
			});
			throw error;
		}
	}

	get isTransactionActive() {
		return this.isActive;
	}
}

/**
 * Execute a function within a database transaction
 * @param {Function} fn - Function to execute within transaction
 * @param {Object} options - Transaction options
 * @returns {Promise} Result of the function
 */
async function withTransaction(fn, options = {}) {
	const {
		isolationLevel = "DEFERRED", // DEFERRED, IMMEDIATE, or EXCLUSIVE
		timeout = 30000, // 30 seconds
		retryCount = 3,
		retryDelay = 1000,
	} = options;

	let lastError;

	for (let attempt = 0; attempt <= retryCount; attempt++) {
		const connection = await getConnection();

		try {
			// Set isolation level
			connection.db.exec(`PRAGMA read_uncommitted = 0`);
			// Validate isolation level against allowed set to avoid SQL injection
			const allowedLevels = new Set(["DEFERRED", "IMMEDIATE", "EXCLUSIVE"]);
			const level = String(isolationLevel).toUpperCase();
			if (!allowedLevels.has(level)) {
				throw new Error(`Invalid isolation level: ${isolationLevel}`);
			}
			connection.db.exec(`BEGIN ${level} TRANSACTION`);

			const transaction = new Transaction(connection);
			transaction.isActive = true;

			// Set timeout
			const timeoutId = setTimeout(() => {
				transaction.rollback().catch((err) =>
					logger.error("Failed to rollback timed out transaction", {
						error: err.message,
					}),
				);
			}, timeout);

			try {
				const result = await fn(transaction, connection);

				clearTimeout(timeoutId);
				connection.db.exec("COMMIT");

				logger.debug("Transaction completed successfully", {
					attempt: attempt + 1,
					isolationLevel,
				});

				return result;
			} catch (error) {
				clearTimeout(timeoutId);
				connection.db.exec("ROLLBACK");
				throw error;
			}
		} catch (error) {
			lastError = error;

			if (attempt < retryCount) {
				logger.warn("Transaction failed, retrying", {
					attempt: attempt + 1,
					error: error.message,
					retryDelay,
				});

				// Wait before retry
				await new Promise((resolve) => setTimeout(resolve, retryDelay));
			}
		}
	}

	logger.error("Transaction failed after all retries", {
		retryCount,
		error: lastError.message,
	});

	throw lastError;
}

/**
 * Execute multiple operations in a single transaction
 * @param {Array<Function>} operations - Array of operation functions
 * @param {Object} options - Transaction options
 * @returns {Promise<Array>} Results of all operations
 */
async function executeInTransaction(operations, options = {}) {
	return withTransaction(async (transaction, connection) => {
		const results = [];

		for (const operation of operations) {
			const result = await operation(transaction, connection);
			results.push(result);
		}

		return results;
	}, options);
}

/**
 * Create a transaction-aware query builder
 * @param {Transaction} transaction - Active transaction
 * @returns {Object} Query builder with transaction context
 */
function createTransactionalQuery(transaction) {
	if (!transaction.isTransactionActive) {
		throw new Error("Transaction is not active");
	}

	return {
		prepare: (sql) => {
			return transaction.connection.db.prepare(sql);
		},

		run: (sql, ...params) => {
			const stmt = transaction.connection.db.prepare(sql);
			return stmt.run(...params);
		},

		get: (sql, ...params) => {
			const stmt = transaction.connection.db.prepare(sql);
			return stmt.get(...params);
		},

		all: (sql, ...params) => {
			const stmt = transaction.connection.db.prepare(sql);
			return stmt.all(...params);
		},
	};
}

module.exports = {
	Transaction,
	withTransaction,
	executeInTransaction,
	createTransactionalQuery,
};
