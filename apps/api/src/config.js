/**
 * Configuration module for API service
 */

const DB_PATH = process.env.DB_PATH;
// Use in-memory database for test environment to avoid file locking and WAL issues
const DEFAULT_DB_PATH =
	process.env.NODE_ENV === "test"
		? ":memory:"
		: "apps/data/political_sphere.db";

module.exports = {
	DB_PATH,
	DEFAULT_DB_PATH,
};
