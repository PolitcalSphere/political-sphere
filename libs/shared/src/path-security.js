const path = require("path");

/**
 * Secure Path Utilities
 *
 * Prevents path traversal attacks by validating and sanitizing file paths
 * before use in filesystem operations.
 */

/**
 * Validates that a filename doesn't contain path traversal sequences
 * @param {string} filename - The filename to validate
 * @returns {string} Sanitized filename
 * @throws {Error} If filename contains invalid characters or traversal attempts
 */
function validateFilename(filename) {
	if (!filename || typeof filename !== "string") {
		throw new Error("Filename must be a non-empty string");
	}

	// Remove any path components - only allow the basename
	const basename = path.basename(filename);

	// Check for path traversal attempts
	if (filename !== basename) {
		throw new Error("Filename cannot contain path separators");
	}

	// Block null bytes
	if (basename.includes("\0")) {
		throw new Error("Filename cannot contain null bytes");
	}

	// Block hidden files that start with dot (optional, can be customized)
	if (basename.startsWith(".")) {
		throw new Error("Filename cannot start with a dot");
	}

	// Validate filename characters (alphanumeric, dash, underscore, dot)
	if (!/^[a-zA-Z0-9_.-]+$/.test(basename)) {
		throw new Error("Filename contains invalid characters");
	}

	return basename;
}

/**
 * Safely joins a base directory with a user-provided filename
 * Ensures the resulting path stays within the base directory
 * @param {string} baseDir - The trusted base directory
 * @param {string} userInput - User-provided filename or path component
 * @returns {string} Safe resolved path
 * @throws {Error} If path would escape the base directory
 */
function safeJoin(baseDir, userInput) {
	if (!baseDir || typeof baseDir !== "string") {
		throw new Error("Base directory must be a non-empty string");
	}

	if (!userInput || typeof userInput !== "string") {
		throw new Error("User input must be a non-empty string");
	}

	// Sanitize the user input to just the basename
	const sanitized = validateFilename(userInput);

	// Join the paths
	const joined = path.join(baseDir, sanitized);

	// Resolve to absolute path
	const resolved = path.resolve(joined);
	const resolvedBase = path.resolve(baseDir);

	// Ensure the resolved path is within the base directory
	if (
		!resolved.startsWith(resolvedBase + path.sep) &&
		resolved !== resolvedBase
	) {
		throw new Error(
			"Path traversal detected: resulting path is outside base directory",
		);
	}

	return resolved;
}

/**
 * Validates a table name to prevent SQL injection and path traversal
 * @param {string} tableName - The table name to validate
 * @returns {string} Validated table name
 * @throws {Error} If table name is invalid
 */
function validateTableName(tableName) {
	if (!tableName || typeof tableName !== "string") {
		throw new Error("Table name must be a non-empty string");
	}

	// Table names should only contain alphanumeric characters and underscores
	if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
		throw new Error("Table name contains invalid characters");
	}

	// Limit length to prevent abuse
	if (tableName.length > 64) {
		throw new Error("Table name is too long (max 64 characters)");
	}

	return tableName;
}

/**
 * Validates a directory path from user input
 * Only allows the basename and validates it doesn't contain traversal attempts
 * @param {string} dirName - Directory name to validate
 * @returns {string} Validated directory name
 * @throws {Error} If directory name is invalid
 */
function validateDirectoryName(dirName) {
	if (!dirName || typeof dirName !== "string") {
		throw new Error("Directory name must be a non-empty string");
	}

	// Remove any path components
	const basename = path.basename(dirName);

	if (dirName !== basename) {
		throw new Error("Directory name cannot contain path separators");
	}

	// Block null bytes
	if (basename.includes("\0")) {
		throw new Error("Directory name cannot contain null bytes");
	}

	// Validate directory name characters
	if (!/^[a-zA-Z0-9_.-]+$/.test(basename)) {
		throw new Error("Directory name contains invalid characters");
	}

	return basename;
}

/**
 * Checks if a path is within a base directory (without throwing)
 * @param {string} baseDir - The base directory
 * @param {string} testPath - The path to test
 * @returns {boolean} True if testPath is within baseDir
 */
function isPathWithinBase(baseDir, testPath) {
	try {
		const resolvedBase = path.resolve(baseDir);
		const resolvedTest = path.resolve(testPath);

		return (
			resolvedTest.startsWith(resolvedBase + path.sep) ||
			resolvedTest === resolvedBase
		);
	} catch {
		return false;
	}
}

module.exports = {
	validateFilename,
	validateTableName,
	validateDirectoryName,
	safeJoin,
	isPathWithinBase,
};
