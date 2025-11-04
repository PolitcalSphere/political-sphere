const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const logger = require("./logger");

/**
 * Database Backup Manager
 * Provides automated backup functionality with compression and retention
 * @see docs/architecture/decisions/adr-0004-database-backup.md
 */

class DatabaseBackupManager {
	constructor(options = {}) {
		this.backupDir = options.backupDir || path.join(process.cwd(), "backups");
		this.retentionDays = options.retentionDays || 30;
		this.compressionEnabled = options.compressionEnabled !== false;
		this.maxConcurrentBackups = options.maxConcurrentBackups || 3;
		this.backupQueue = [];
		this.activeBackups = 0;

		// Ensure backup directory exists
		if (!fs.existsSync(this.backupDir)) {
			fs.mkdirSync(this.backupDir, { recursive: true });
			logger.info("Backup directory created", { backupDir: this.backupDir });
		}
	}

	/**
	 * Create a database backup
	 * @param {string} dbPath - Path to database file
	 * @param {Object} options - Backup options
	 * @returns {Promise<Object>} Backup result
	 */
	async createBackup(dbPath, options = {}) {
		const {
			name = this.generateBackupName(),
			compress = this.compressionEnabled,
			verify = true,
		} = options;

		const backupPath = path.join(this.backupDir, name);

		// Queue backup if too many are running
		if (this.activeBackups >= this.maxConcurrentBackups) {
			return new Promise((resolve, reject) => {
				this.backupQueue.push({ dbPath, backupPath, compress, verify, resolve, reject });
			});
		}

		return this.performBackup(dbPath, backupPath, compress, verify);
	}

	async performBackup(dbPath, backupPath, compress, verify) {
		this.activeBackups++;

		const startTime = Date.now();
		const result = {
			success: false,
			backupPath,
			size: 0,
			duration: 0,
			compressed: compress,
			verified: false,
		};

		try {
			logger.info("Starting database backup", { dbPath, backupPath, compress });

			// Create backup using SQLite .backup command
			await this.createSQLiteBackup(dbPath, backupPath);

			// Get backup file size
			const stats = fs.statSync(backupPath);
			result.size = stats.size;

			// Compress if requested
			if (compress) {
				const compressedPath = await this.compressBackup(backupPath);
				// Remove uncompressed file
				fs.unlinkSync(backupPath);
				result.backupPath = compressedPath;
				result.size = fs.statSync(compressedPath).size;
			}

			// Verify backup if requested
			if (verify) {
				await this.verifyBackup(result.backupPath, dbPath);
				result.verified = true;
			}

			result.success = true;
			result.duration = Date.now() - startTime;

			logger.info("Database backup completed", {
				backupPath: result.backupPath,
				size: result.size,
				duration: result.duration,
				compressed: compress,
				verified: result.verified,
			});

		} catch (error) {
			logger.error("Database backup failed", {
				dbPath,
				backupPath,
				error: error.message,
			});
			throw error;
		} finally {
			this.activeBackups--;

			// Process next queued backup
			if (this.backupQueue.length > 0 && this.activeBackups < this.maxConcurrentBackups) {
				const next = this.backupQueue.shift();
				this.performBackup(next.dbPath, next.backupPath, next.compress, next.verify)
					.then(next.resolve)
					.catch(next.reject);
			}
		}

		return result;
	}

	async createSQLiteBackup(dbPath, backupPath) {
		return new Promise((resolve, reject) => {
			const sqlite3 = require("better-sqlite3");

			try {
				const db = sqlite3(dbPath);
				const backup = db.backup(backupPath);

				backup.step(-1); // Backup all pages
				backup.finish();

				db.close();
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	}

	async compressBackup(backupPath) {
		const compressedPath = `${backupPath}.gz`;

		return new Promise((resolve, reject) => {
			const gzip = require("zlib").createGzip();
			const input = fs.createReadStream(backupPath);
			const output = fs.createWriteStream(compressedPath);

			input.pipe(gzip).pipe(output);

			output.on("finish", () => resolve(compressedPath));
			output.on("error", reject);
		});
	}

	async verifyBackup(backupPath, originalDbPath) {
		// For compressed backups, we need to decompress first
		let tempPath = backupPath;
		if (backupPath.endsWith(".gz")) {
			tempPath = backupPath.replace(".gz", ".tmp");
			await this.decompressBackup(backupPath, tempPath);
		}

		try {
			const sqlite3 = require("better-sqlite3");

			// Open backup database and verify it has the expected tables
			const backupDb = sqlite3(tempPath);

			const tables = backupDb.prepare(
				"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
			).all();

			if (tables.length === 0) {
				throw new Error("Backup database contains no tables");
			}

			// Verify foreign key constraints
			const fkViolations = backupDb.prepare("PRAGMA foreign_key_check").all();
			if (fkViolations.length > 0) {
				throw new Error(`Backup has foreign key violations: ${JSON.stringify(fkViolations)}`);
			}

			backupDb.close();

			logger.debug("Backup verification completed", { backupPath });
		} finally {
			// Clean up temporary file
			if (tempPath !== backupPath && fs.existsSync(tempPath)) {
				fs.unlinkSync(tempPath);
			}
		}
	}

	async decompressBackup(compressedPath, outputPath) {
		return new Promise((resolve, reject) => {
			const gunzip = require("zlib").createGunzip();
			const input = fs.createReadStream(compressedPath);
			const output = fs.createWriteStream(outputPath);

			input.pipe(gunzip).pipe(output);

			output.on("finish", () => resolve());
			output.on("error", reject);
		});
	}

	/**
	 * Restore database from backup
	 * @param {string} backupPath - Path to backup file
	 * @param {string} dbPath - Path to restore database to
	 * @returns {Promise<Object>} Restore result
	 */
	async restoreBackup(backupPath, dbPath) {
		const startTime = Date.now();
		const result = {
			success: false,
			backupPath,
			dbPath,
			duration: 0,
		};

		try {
			logger.info("Starting database restore", { backupPath, dbPath });

			// Handle compressed backups
			let tempPath = backupPath;
			if (backupPath.endsWith(".gz")) {
				tempPath = backupPath.replace(".gz", ".tmp");
				await this.decompressBackup(backupPath, tempPath);
			}

			// Ensure target directory exists
			const dbDir = path.dirname(dbPath);
			if (!fs.existsSync(dbDir)) {
				fs.mkdirSync(dbDir, { recursive: true });
			}

			// Copy backup to target location
			fs.copyFileSync(tempPath, dbPath);

			// Clean up temp file
			if (tempPath !== backupPath) {
				fs.unlinkSync(tempPath);
			}

			// Verify restored database
			const sqlite3 = require("better-sqlite3");
			const db = sqlite3(dbPath);

			// Run integrity check
			const integrity = db.prepare("PRAGMA integrity_check").get();
			if (integrity.integrity_check !== "ok") {
				throw new Error("Database integrity check failed");
			}

			db.close();

			result.success = true;
			result.duration = Date.now() - startTime;

			logger.info("Database restore completed", {
				backupPath,
				dbPath,
				duration: result.duration,
			});

		} catch (error) {
			logger.error("Database restore failed", {
				backupPath,
				dbPath,
				error: error.message,
			});
			throw error;
		}

		return result;
	}

	/**
	 * Clean up old backups based on retention policy
	 * @returns {Promise<Array<string>>} List of deleted backup files
	 */
	async cleanupOldBackups() {
		const deletedFiles = [];
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

		try {
			const files = fs.readdirSync(this.backupDir);

			for (const file of files) {
				const filePath = path.join(this.backupDir, file);
				const stats = fs.statSync(filePath);

				if (stats.mtime < cutoffDate) {
					fs.unlinkSync(filePath);
					deletedFiles.push(file);
					logger.debug("Old backup deleted", { file, age: stats.mtime });
				}
			}

			if (deletedFiles.length > 0) {
				logger.info("Old backups cleaned up", {
					deletedCount: deletedFiles.length,
					retentionDays: this.retentionDays,
				});
			}

		} catch (error) {
			logger.error("Failed to cleanup old backups", { error: error.message });
		}

		return deletedFiles;
	}

	/**
	 * Get backup statistics
	 * @returns {Object} Backup statistics
	 */
	getBackupStats() {
		try {
			const files = fs.readdirSync(this.backupDir);
			let totalSize = 0;
			let oldestBackup = null;
			let newestBackup = null;

			for (const file of files) {
				const filePath = path.join(this.backupDir, file);
				const stats = fs.statSync(filePath);
				totalSize += stats.size;

				if (!oldestBackup || stats.mtime < oldestBackup.mtime) {
					oldestBackup = { file, mtime: stats.mtime };
				}

				if (!newestBackup || stats.mtime > newestBackup.mtime) {
					newestBackup = { file, mtime: stats.mtime };
				}
			}

			return {
				totalBackups: files.length,
				totalSize,
				oldestBackup,
				newestBackup,
				backupDir: this.backupDir,
				retentionDays: this.retentionDays,
			};
		} catch (error) {
			logger.error("Failed to get backup stats", { error: error.message });
			return { error: error.message };
		}
	}

	generateBackupName() {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		return `political-sphere-${timestamp}.db`;
	}

	/**
	 * Schedule automated backups
	 * @param {string} dbPath - Database path
	 * @param {Object} schedule - Backup schedule options
	 */
	scheduleAutomatedBackups(dbPath, schedule = {}) {
		const {
			intervalHours = 24, // Daily backups
			maxBackups = 30,
		} = schedule;

		const intervalMs = intervalHours * 60 * 60 * 1000;

		logger.info("Scheduling automated backups", {
			intervalHours,
			maxBackups,
			dbPath,
		});

		setInterval(async () => {
			try {
				await this.createBackup(dbPath);

				// Cleanup old backups
				await this.cleanupOldBackups();

				// Check if we exceed max backups
				const stats = this.getBackupStats();
				if (stats.totalBackups > maxBackups) {
					logger.warn("Too many backups, consider increasing retention or reducing schedule", {
						totalBackups: stats.totalBackups,
						maxBackups,
					});
				}
			} catch (error) {
				logger.error("Automated backup failed", { error: error.message });
			}
		}, intervalMs);
	}
}

// Create singleton instance
const backupManager = new DatabaseBackupManager();

module.exports = {
	DatabaseBackupManager,
	backupManager,
};
