const { z } = require("zod");

// Custom error classes for validation
class ValidationError extends Error {
	constructor(message, details = []) {
		super(message);
		this.name = "ValidationError";
		this.details = details;
	}
}

/**
 * Middleware to validate request data using Zod schemas
 * @param {z.ZodSchema} schema - Zod validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
function validate(schema, property = "body") {
	return (req, res, next) => {
		try {
			const data = req[property];
			const validatedData = schema.parse(data);
			req[property] = validatedData; // Replace with validated data
			next();
		} catch (error) {
			if (error instanceof z.ZodError) {
				const errors = error.errors.map((err) => ({
					field: err.path.join("."),
					message: err.message,
					code: err.code,
				}));
				return res.status(400).json({
					success: false,
					error: "Validation failed",
					details: errors,
				});
			}
			next(new ValidationError(error.message));
		}
	};
}

// Common validation schemas
const schemas = {
	// User schemas
	createUser: z.object({
		email: z.string().email("Invalid email format"),
		password: z.string().min(8, "Password must be at least 8 characters"),
		role: z.enum(["ADMIN", "MODERATOR", "USER"]).optional().default("USER"),
	}),

	login: z.object({
		email: z.string().email("Invalid email format"),
		password: z.string().min(1, "Password is required"),
	}),

	// Party schemas
	createParty: z.object({
		name: z
			.string()
			.min(1, "Party name is required")
			.max(100, "Party name too long"),
		description: z.string().max(1000, "Description too long").optional(),
		ideology: z.string().max(50, "Ideology too long").optional(),
	}),

	// Bill schemas
	createBill: z.object({
		title: z.string().min(1, "Title is required").max(200, "Title too long"),
		description: z
			.string()
			.min(1, "Description is required")
			.max(5000, "Description too long"),
		category: z.string().min(1, "Category is required"),
		partyId: z.string().uuid("Invalid party ID").optional(),
	}),

	// Vote schemas
	castVote: z.object({
		billId: z.string().uuid("Invalid bill ID"),
		vote: z.enum(["YES", "NO", "ABSTAIN"]),
	}),

	// News schemas
	createNews: z.object({
		title: z.string().min(1, "Title is required").max(200, "Title too long"),
		content: z.string().min(1, "Content is required"),
		category: z.string().min(1, "Category is required"),
		tags: z.array(z.string()).optional().default([]),
		published: z.boolean().optional().default(false),
	}),

	// Moderation schemas
	reportContent: z.object({
		contentId: z.string().uuid("Invalid content ID"),
		contentType: z.enum(["NEWS", "COMMENT", "BILL"]),
		reason: z.string().min(1, "Reason is required").max(500, "Reason too long"),
		details: z.string().max(1000, "Details too long").optional(),
	}),

	moderateContent: z.object({
		action: z.enum(["APPROVE", "REJECT", "FLAG"]),
		reason: z.string().max(500, "Reason too long").optional(),
	}),

	// Age verification schemas
	initiateAgeVerification: z.object({
		method: z.enum(["EMAIL", "SMS"]).default("EMAIL"),
		contact: z.string().min(1, "Contact information is required"),
	}),

	verifyAge: z.object({
		token: z.string().min(1, "Verification token is required"),
		birthDate: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
		consent: z
			.boolean()
			.refine((val) => val === true, "Parental consent is required"),
	}),

	// Compliance schemas
	dataExport: z.object({
		format: z.enum(["JSON", "CSV"]).default("JSON"),
		includePersonalData: z.boolean().default(false),
	}),

	dataDeletion: z.object({
		reason: z
			.string()
			.min(1, "Deletion reason is required")
			.max(500, "Reason too long"),
		confirmDeletion: z
			.boolean()
			.refine((val) => val === true, "Confirmation required"),
	}),
};

module.exports = {
	validate,
	schemas,
};
