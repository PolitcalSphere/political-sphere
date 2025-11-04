const fs = require("fs");
const path = require("path");
const { getConnection } = require("./database-connection");
const { withTransaction } = require("./database-transactions");
const logger = require("./logger");

/**
 * Database Export/Import Manager
 * Provides functionality to export and import database data in various formats
 * @see docs/architecture/decisions/adr-0006-database-export-import.md
 */

class DatabaseExportImportManager {
	constructor(options = {}) {
		this.exportDir = options.exportDir || path.join(process.cwd(), "exports");
		this.batchSize = options.batchSize || 1000;
		this.includeMetadata = options.includeMetadata !== false;

		// Ensure export directory exists
		if (!fs.existsSync(this.exportDir)) {
			fs.mkdirSync(this.exportDir, { recursive: true });
		}
	}

	/**
	 * Export database tables to JSON format
	 * @param {Object} options - Export options
	 * @returns {Promise<Object>} Export result
	 */
	async exportToJSON(options = {}) {
		const {
			tables = null, // null means all tables
			fileName = this.generateExportFileName("json"),
			pretty = true,
			includeSchema = false,
		} = options;

		const exportPath = path.join(this.exportDir, fileName);
		const result = {
			success: false,
			filePath: exportPath,
			tables: [],
			recordCount: 0,
			duration: 0,
			fileSize: 0,
		};

		const startTime = Date.now();

		try {
			logger.info("Starting JSON export", { exportPath, tables });

			const connection = await getConnection();
			const exportData = {
				metadata: this.includeMetadata
					? {
							exportedAt: new Date().toISOString(),
							version: "1.0",
							database: "political-sphere",
						}
					: undefined,
				tables: {},
			};

			// Get all tables if not specified
			let tablesToExport = tables;
			if (!tablesToExport) {
				const allTables = connection.db
					.prepare(
						"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
					)
					.all();
				tablesToExport = allTables.map((t) => t.name);
			}

			// Export each table
			for (const tableName of tablesToExport) {
				const tableData = await this.exportTableToJSON(connection, tableName);
				exportData.tables[tableName] = tableData;
				result.tables.push(tableName);
				result.recordCount += tableData.records.length;

				logger.debug("Table exported", {
					table: tableName,
					records: tableData.records.length,
				});
			}

			// Include schema if requested
			if (includeSchema) {
				exportData.schema = await this.exportSchema(connection);
			}

			// Write to file
			const jsonContent = pretty
				? JSON.stringify(exportData, null, 2)
				: JSON.stringify(exportData);

			fs.writeFileSync(exportPath, jsonContent, "utf8");

			result.success = true;
			result.duration = Date.now() - startTime;
			result.fileSize = fs.statSync(exportPath).size;

			logger.info("JSON export completed", {
				filePath: exportPath,
				tables: result.tables.length,
				recordCount: result.recordCount,
				fileSize: result.fileSize,
				duration: result.duration,
			});
		} catch (error) {
			logger.error("JSON export failed", { error: error.message, exportPath });
			throw error;
		}

		return result;
	}

	async exportTableToJSON(connection, tableName) {
		const tableData = {
			name: tableName,
			records: [],
			schema: null,
		};

		// Get table schema
		const schema = connection.db
			.prepare(`PRAGMA table_info(${tableName})`)
			.all();
		tableData.schema = schema;

		// Export data in batches
		let offset = 0;
		const rowIdColumn = schema.find((col) => col.pk === 1)?.name || "ROWID";

		while (true) {
			const rows = connection.db
				.prepare(
					`SELECT * FROM ${tableName} ORDER BY ${rowIdColumn} LIMIT ? OFFSET ?`,
				)
				.all(this.batchSize, offset);

			if (rows.length === 0) break;

			tableData.records.push(...rows);
			offset += this.batchSize;

			// Prevent memory issues with very large tables
			if (tableData.records.length > 100000) {
				logger.warn("Large table detected, consider splitting export", {
					table: tableName,
					records: tableData.records.length,
				});
			}
		}

		return tableData;
	}

	async exportSchema(connection) {
		const schema = {
			tables: {},
			indexes: {},
			triggers: {},
		};

		// Export table schemas
		const tables = connection.db
			.prepare(
				"SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
			)
			.all();

		for (const table of tables) {
			const columns = connection.db
				.prepare(`PRAGMA table_info(${table.name})`)
				.all();
			schema.tables[table.name] = {
				sql: table.sql,
				columns: columns,
			};
		}

		// Export indexes
		const indexes = connection.db
			.prepare(
				"SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'",
			)
			.all();

		for (const index of indexes) {
			schema.indexes[index.name] = {
				table: index.tbl_name,
				sql: index.sql,
			};
		}

		// Export triggers
		const triggers = connection.db
			.prepare(
				"SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger'",
			)
			.all();

		for (const trigger of triggers) {
			schema.triggers[trigger.name] = {
				table: trigger.tbl_name,
				sql: trigger.sql,
			};
		}

		return schema;
	}

	/**
	 * Import database from JSON export
	 * @param {string} filePath - Path to JSON export file
	 * @param {Object} options - Import options
	 * @returns {Promise<Object>} Import result
	 */
	async importFromJSON(filePath, options = {}) {
		const {
			tables = null, // null means all tables
			clearExisting = false,
			validateSchema = true,
			dryRun = false,
		} = options;

		if (!fs.existsSync(filePath)) {
			throw new Error(`Import file not found: ${filePath}`);
		}

		const result = {
			success: false,
			filePath,
			tables: [],
			recordCount: 0,
			duration: 0,
			skippedTables: [],
		};

		const startTime = Date.now();

		try {
			logger.info("Starting JSON import", {
				filePath,
				tables,
				clearExisting,
				dryRun,
			});

			// Read and parse JSON
			const jsonContent = fs.readFileSync(filePath, "utf8");
			const importData = JSON.parse(jsonContent);

			if (!importData.tables) {
				throw new Error("Invalid export format: missing tables");
			}

			await withTransaction(
				async (transaction, connection) => {
					// Validate schema if requested
					if (validateSchema && importData.schema) {
						await this.validateImportSchema(connection, importData.schema);
					}

					// Determine tables to import
					let tablesToImport = tables;
					if (!tablesToImport) {
						tablesToImport = Object.keys(importData.tables);
					}

					// Import each table
					for (const tableName of tablesToImport) {
						const tableData = importData.tables[tableName];
						if (!tableData) {
							result.skippedTables.push(tableName);
							continue;
						}

						await this.importTableFromJSON(
							connection,
							tableName,
							tableData,
							clearExisting,
							dryRun,
						);

						result.tables.push(tableName);
						result.recordCount += tableData.records.length;

						logger.debug("Table imported", {
							table: tableName,
							records: tableData.records.length,
							dryRun,
						});
					}
				},
				{ isolationLevel: "EXCLUSIVE" },
			);

			result.success = !dryRun;
			result.duration = Date.now() - startTime;

			logger.info("JSON import completed", {
				filePath,
				tables: result.tables.length,
				recordCount: result.recordCount,
				skippedTables: result.skippedTables.length,
				duration: result.duration,
				dryRun,
			});
		} catch (error) {
			logger.error("JSON import failed", { error: error.message, filePath });
			throw error;
		}

		return result;
	}

	async importTableFromJSON(
		connection,
		tableName,
		tableData,
		clearExisting,
		dryRun,
	) {
		// Clear existing data if requested
		if (clearExisting && !dryRun) {
			connection.db.exec(`DELETE FROM ${tableName}`);
			logger.debug("Cleared existing data", { table: tableName });
		}

		// Import records in batches
		const records = tableData.records;
		if (records.length === 0) return;

		// Get column names from first record
		const columns = Object.keys(records[0]);
		const placeholders = columns.map(() => "?").join(", ");
		const columnList = columns.join(", ");

		const insertSql = `INSERT OR REPLACE INTO ${tableName} (${columnList}) VALUES (${placeholders})`;
		const insertStmt = dryRun ? null : connection.db.prepare(insertSql);

		for (let i = 0; i < records.length; i += this.batchSize) {
			const batch = records.slice(i, i + this.batchSize);

			if (!dryRun) {
				for (const record of batch) {
					const values = columns.map((col) => record[col]);
					insertStmt.run(values);
				}
			}

			logger.debug("Imported batch", {
				table: tableName,
				batchSize: batch.length,
				progress: `${i + batch.length}/${records.length}`,
				dryRun,
			});
		}

		if (!dryRun && insertStmt) {
			insertStmt.finalize();
		}
	}

	async validateImportSchema(connection, schema) {
		// Basic schema validation - check if tables exist
		for (const tableName of Object.keys(schema.tables || {})) {
			const exists = connection.db
				.prepare(
					"SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
				)
				.get(tableName);

			if (!exists) {
				throw new Error(`Table ${tableName} does not exist in target database`);
			}
		}

		logger.debug("Import schema validation passed");
	}

	/**
	 * Export database to CSV format
	 * @param {Object} options - Export options
	 * @returns {Promise<Object>} Export result
	 */
	async exportToCSV(options = {}) {
		const {
			tables = null,
			fileName = this.generateExportFileName("zip"), // ZIP containing CSVs
			includeHeaders = true,
		} = options;

		const exportPath = path.join(this.exportDir, fileName);
		const result = {
			success: false,
			filePath: exportPath,
			tables: [],
			recordCount: 0,
			duration: 0,
			fileSize: 0,
		};

		const startTime = Date.now();

		try {
			logger.info("Starting CSV export", { exportPath, tables });

			const connection = await getConnection();
			const csvFiles = [];

			// Get tables to export
			let tablesToExport = tables;
			if (!tablesToExport) {
				const allTables = connection.db
					.prepare(
						"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
					)
					.all();
				tablesToExport = allTables.map((t) => t.name);
			}

			// Export each table to CSV
			for (const tableName of tablesToExport) {
				const csvFile = await this.exportTableToCSV(
					connection,
					tableName,
					includeHeaders,
				);
				csvFiles.push(csvFile);
				result.tables.push(tableName);
				result.recordCount += csvFile.recordCount;
			}

			// Create ZIP archive
			await this.createZipArchive(csvFiles, exportPath);

			result.success = true;
			result.duration = Date.now() - startTime;
			result.fileSize = fs.statSync(exportPath).size;

			// Cleanup individual CSV files
			for (const csvFile of csvFiles) {
				fs.unlinkSync(csvFile.path);
			}

			logger.info("CSV export completed", {
				filePath: exportPath,
				tables: result.tables.length,
				recordCount: result.recordCount,
				fileSize: result.fileSize,
				duration: result.duration,
			});
		} catch (error) {
			logger.error("CSV export failed", { error: error.message, exportPath });
			throw error;
		}

		return result;
	}

	async exportTableToCSV(connection, tableName, includeHeaders) {
		const csvPath = path.join(this.exportDir, `${tableName}.csv`);
		const writeStream = fs.createWriteStream(csvPath);

		return new Promise((resolve, reject) => {
			let recordCount = 0;

			// Get table schema for headers
			const columns = connection.db
				.prepare(`PRAGMA table_info(${tableName})`)
				.all();
			const columnNames = columns.map((col) => col.name);

			if (includeHeaders) {
				writeStream.write(columnNames.join(",") + "\n");
			}

			// Export data
			const rows = connection.db.prepare(`SELECT * FROM ${tableName}`).all();

			for (const row of rows) {
				const values = columnNames.map((col) => {
					const value = row[col];
					// Escape CSV values
					if (value === null || value === undefined) return "";
					const str = String(value);
					if (str.includes(",") || str.includes('"') || str.includes("\n")) {
						return '"' + str.replace(/"/g, '""') + '"';
					}
					return str;
				});
				writeStream.write(values.join(",") + "\n");
				recordCount++;
			}

			writeStream.end();
			writeStream.on("finish", () => {
				resolve({ path: csvPath, recordCount, tableName });
			});
			writeStream.on("error", reject);
		});
	}

	async createZipArchive(files, zipPath) {
		const archiver = require("archiver");
		const output = fs.createWriteStream(zipPath);
		const archive = archiver("zip", { zlib: { level: 9 } });

		return new Promise((resolve, reject) => {
			output.on("close", () => resolve());
			output.on("error", reject);
			archive.on("error", reject);

			archive.pipe(output);

			for (const file of files) {
				archive.file(file.path, { name: path.basename(file.path) });
			}

			archive.finalize();
		});
	}

	generateExportFileName(extension) {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		return `political-sphere-export-${timestamp}.${extension}`;
	}

	/**
	 * List available export files
	 * @returns {Array<Object>} List of export files with metadata
	 */
	listExports() {
		try {
			const files = fs
				.readdirSync(this.exportDir)
				.filter((file) => file.endsWith(".json") || file.endsWith(".zip"))
				.map((file) => {
					const filePath = path.join(this.exportDir, file);
					const stats = fs.statSync(filePath);
					return {
						name: file,
						path: filePath,
						size: stats.size,
						created: stats.birthtime,
						modified: stats.mtime,
					};
				})
				.sort((a, b) => b.created - a.created);

			return files;
		} catch (error) {
			logger.error("Failed to list exports", { error: error.message });
			return [];
		}
	}

	/**
	 * Clean up old export files
	 * @param {number} maxAgeDays - Maximum age in days
	 * @returns {Array<string>} List of deleted files
	 */
	cleanupOldExports(maxAgeDays = 30) {
		const deletedFiles = [];
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

		try {
			const files = fs.readdirSync(this.exportDir);

			for (const file of files) {
				const filePath = path.join(this.exportDir, file);
				const stats = fs.statSync(filePath);

				if (stats.mtime < cutoffDate) {
					fs.unlinkSync(filePath);
					deletedFiles.push(file);
					logger.debug("Old export deleted", { file, age: stats.mtime });
				}
			}

			if (deletedFiles.length > 0) {
				logger.info("Old exports cleaned up", {
					deletedCount: deletedFiles.length,
					maxAgeDays,
				});
			}
		} catch (error) {
			logger.error("Failed to cleanup old exports", { error: error.message });
		}

		return deletedFiles;
	}
}

// Create singleton instance
const exportImportManager = new DatabaseExportImportManager();

module.exports = {
	DatabaseExportImportManager,
	exportImportManager,
};
