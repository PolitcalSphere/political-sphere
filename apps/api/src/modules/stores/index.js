// Mock database and store exports for testing
const mockDb = {};

function getDatabase() {
	return mockDb;
}

function closeDatabase() {
	// Mock close function
	return Promise.resolve();
}

module.exports = { getDatabase, closeDatabase };
