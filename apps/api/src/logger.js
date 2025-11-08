const winston = require("winston");

// Create logger instance
const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || "info",
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.errors({ stack: true }),
		winston.format.json(),
	),
	defaultMeta: { service: "api" },
	transports: [
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple(),
			),
		}),
	],
});

// Add file transport if LOG_FILE is specified
if (process.env.LOG_FILE) {
	logger.add(
		new winston.transports.File({
			filename: process.env.LOG_FILE,
			format: winston.format.combine(
				winston.format.timestamp(),
				winston.format.errors({ stack: true }),
				winston.format.json(),
			),
		}),
	);
}

module.exports = logger;
