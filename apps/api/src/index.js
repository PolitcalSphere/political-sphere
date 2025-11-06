import { BillStore } from "./bill-store.js";
import { CacheService } from "./cache.js";
import { initializeDatabase, runMigrations } from "./migrations.js";
import { PartyStore } from "./party-store.js";
import { UserStore } from "./user-store.js";
import { VoteStore } from "./vote-store.js";

function shouldEnableCache() {
	if (process.env.NODE_ENV === "test") {
		return false;
	}

	if (process.env.API_ENABLE_CACHE === "true") {
		return true;
	}

	if (process.env.API_ENABLE_CACHE === "false") {
		return false;
	}

	return Boolean(process.env.REDIS_URL);
}

class DatabaseConnection {
	constructor() {
		this.db = initializeDatabase();
		runMigrations(this.db);
		this.cache = shouldEnableCache() ? new CacheService() : null;
		this.users = new UserStore(this.db, this.cache);
		this.parties = new PartyStore(this.db, this.cache);
		this.bills = new BillStore(this.db, this.cache);
		this.votes = new VoteStore(this.db, this.cache);
	}

	close() {
		this.db.close();
	}
}

let dbConnection = null;

function getDatabase() {
	if (!dbConnection) {
		dbConnection = new DatabaseConnection();
	}
	return dbConnection;
}

function closeDatabase() {
	if (dbConnection) {
		dbConnection.close();
		dbConnection = null;
	}
}

export { DatabaseConnection, getDatabase, closeDatabase };
