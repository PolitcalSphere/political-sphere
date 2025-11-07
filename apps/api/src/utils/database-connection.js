import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "../../../data/political_sphere.db");

class DatabaseConnection {
	constructor() {
		this.db = null;
		this.preparedStatements = new Map();
	}

	getConnection() {
		if (!this.db) {
			this.db = new Database(DB_PATH);
			this.db.pragma("journal_mode = WAL");
			this.db.pragma("foreign_keys = ON");
			this.db.pragma("busy_timeout = 30000");
			this.db.pragma("synchronous = NORMAL");
		}
		return this.db;
	}

	prepare(sql) {
		const key = sql;
		if (!this.preparedStatements.has(key)) {
			const stmt = this.getConnection().prepare(sql);
			this.preparedStatements.set(key, stmt);
		}
		return this.preparedStatements.get(key);
	}

	close() {
		if (this.db) {
			for (const stmt of this.preparedStatements.values()) {
				stmt.finalize();
			}
			this.preparedStatements.clear();
			this.db.close();
			this.db = null;
		}
	}
}

const dbConnection = new DatabaseConnection();

export default dbConnection;
