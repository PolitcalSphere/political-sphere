const { initializeDatabase, runMigrations } = require("./migrations");
const { UserStore } = require("./user-store");
const { PartyStore } = require("./party-store");
const { BillStore } = require("./bill-store");
const { VoteStore } = require("./vote-store");
const { CacheService } = require("./cache");

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

module.exports = {
	DatabaseConnection,
	getDatabase,
	closeDatabase,
};
