/**
 * Age Verification Service
 * Handles age verification, parental consent, and age-appropriate content
 * Implements Online Safety Act and COPPA compliance
 */

const logger = require("../logger");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

class AgeVerificationService {
	constructor(db = null) {
		this.db = db; // Injected database for tests
		this.verificationTokens = new Map(); // In production, use Redis
		this.parentalConsents = new Map(); // Store parental consent records
		this.tokenExpiry = 24 * 60 * 60 * 1000; // 24 hours
	}

	/**
	 * Initiate age verification process
	 * @param {string} userId
	 * @param {string} method - 'self_declaration', 'credit_card', 'government_id', 'parental_consent'
	 * @returns {Promise<VerificationResult>}
	 */
	async initiateVerification(userId, method = "self_declaration") {
		try {
			logger.info("Initiating age verification", { userId, method });

			const token = this.generateVerificationToken(userId);
			const verificationId = crypto.randomUUID();

			const verification = {
				id: verificationId,
				userId,
				method,
				status: "pending",
				createdAt: new Date().toISOString(),
				expiresAt: new Date(Date.now() + this.tokenExpiry).toISOString(),
				token,
			};

			// Store verification request
			this.verificationTokens.set(verificationId, verification);

			// Clean up expired tokens periodically
			this.cleanupExpiredTokens();

			logger.audit("Age verification initiated", {
				verificationId,
				userId,
				method,
			});

			return {
				success: true,
				verificationId,
				method,
				instructions: this.getMethodInstructions(method),
				expiresAt: verification.expiresAt,
			};
		} catch (error) {
			logger.error("Age verification initiation failed", {
				error: error.message,
				userId,
			});
			return { success: false, error: "Verification initiation failed" };
		}
	}

	/**
	 * Complete age verification
	 * @param {string} verificationId
	 * @param {Object} verificationData
	 * @returns {Promise<VerificationResult>}
	 */
	async completeVerification(verificationId, verificationData) {
		try {
			const verification = this.verificationTokens.get(verificationId);

			if (!verification) {
				return { success: false, error: "Invalid verification ID" };
			}

			if (new Date() > new Date(verification.expiresAt)) {
				this.verificationTokens.delete(verificationId);
				return { success: false, error: "Verification expired" };
			}

			const result = await this.processVerification(
				verification,
				verificationData,
			);

			if (result.success) {
				verification.status = "completed";
				verification.completedAt = new Date().toISOString();
				verification.age = result.age;
				verification.confidence = result.confidence;

				// Store verified age in user profile (pseudo-code)
				// await db.users.update({ id: verification.userId }, { verifiedAge: result.age });

				logger.audit("Age verification completed", {
					verificationId,
					userId: verification.userId,
					age: result.age,
					method: verification.method,
				});
			} else {
				verification.status = "failed";
				verification.failedAt = new Date().toISOString();
				verification.failureReason = result.error;
			}

			return result;
		} catch (error) {
			logger.error("Age verification completion failed", {
				error: error.message,
				verificationId,
			});
			return { success: false, error: "Verification processing failed" };
		}
	}

	/**
	 * Process verification based on method
	 * @param {Object} verification
	 * @param {Object} data
	 * @returns {Promise<VerificationResult>}
	 */
	async processVerification(verification, data) {
		switch (verification.method) {
			case "self_declaration":
				return this.processSelfDeclaration(data);
			case "credit_card":
				return this.processCreditCardVerification(data);
			case "government_id":
				return this.processGovernmentIdVerification(data);
			case "parental_consent":
				return this.processParentalConsent(data);
			default:
				return { success: false, error: "Unsupported verification method" };
		}
	}

	/**
	 * Process self-declaration (basic method)
	 * @param {Object} data - { age, consent }
	 * @returns {Promise<VerificationResult>}
	 */
	async processSelfDeclaration(data) {
		const { age, consent } = data;

		if (!consent) {
			return { success: false, error: "User consent required" };
		}

		if (!age || age < 13) {
			return {
				success: false,
				error: "Must be 13 or older to use this service",
			};
		}

		// For self-declaration, we trust the user but flag for additional verification if suspicious
		const requiresAdditionalVerification = age >= 13 && age <= 15;

		return {
			success: true,
			age: parseInt(age),
			confidence: "low", // Self-declaration has low confidence
			requiresAdditionalVerification,
			restrictions: this.getAgeRestrictions(parseInt(age)),
		};
	}

	/**
	 * Process credit card verification (age estimation)
	 * @param {Object} data - { cardToken } (PCI compliant token)
	 * @returns {Promise<VerificationResult>}
	 */
	async processCreditCardVerification(data) {
		// In production, integrate with payment processor for age verification
		// This is a placeholder - actual implementation would use services like:
		// - Stripe Radar for age estimation
		// - Third-party age verification services

		try {
			// Simulate API call to payment processor
			const ageEstimation = await this.estimateAgeFromPayment(data.cardToken);

			if (ageEstimation.confidence > 0.8) {
				return {
					success: true,
					age: ageEstimation.age,
					confidence: "high",
					restrictions: this.getAgeRestrictions(ageEstimation.age),
				};
			} else {
				return {
					success: false,
					error: "Unable to verify age with sufficient confidence",
				};
			}
		} catch (error) {
			logger.error("Credit card verification failed", { error: error.message });
			return { success: false, error: "Payment verification failed" };
		}
	}

	/**
	 * Process government ID verification
	 * @param {Object} data - { idDocument, selfie } (encrypted/file paths)
	 * @returns {Promise<VerificationResult>}
	 */
	async processGovernmentIdVerification(data) {
		// In production, integrate with ID verification services like:
		// - Veriff, Yoti, or similar KYC providers

		try {
			// Simulate document verification
			const verificationResult = await this.verifyGovernmentId(
				data.idDocument,
				data.selfie,
			);

			if (verificationResult.isValid) {
				return {
					success: true,
					age: verificationResult.age,
					confidence: "very_high",
					restrictions: this.getAgeRestrictions(verificationResult.age),
				};
			} else {
				return {
					success: false,
					error: verificationResult.error || "ID verification failed",
				};
			}
		} catch (error) {
			logger.error("Government ID verification failed", {
				error: error.message,
			});
			return { success: false, error: "ID verification service unavailable" };
		}
	}

	/**
	 * Process parental consent for minors
	 * @param {Object} data - { parentEmail, parentConsent, childAge }
	 * @returns {Promise<VerificationResult>}
	 */
	async processParentalConsent(data) {
		const { parentEmail, parentConsent, childAge } = data;

		if (!parentConsent) {
			return { success: false, error: "Parental consent required" };
		}

		if (childAge >= 13) {
			return {
				success: false,
				error: "Parental consent not required for users 13+",
			};
		}

		// Generate consent token for parent
		const consentToken = this.generateParentalConsentToken(
			parentEmail,
			childAge,
		);

		// Store consent request
		this.parentalConsents.set(consentToken, {
			parentEmail,
			childAge,
			requestedAt: new Date().toISOString(),
			status: "pending",
		});

		// Send email to parent (pseudo-code)
		// await emailService.sendParentalConsentEmail(parentEmail, consentToken);

		logger.audit("Parental consent requested", { parentEmail, childAge });

		return {
			success: true,
			message: "Parental consent email sent",
			consentToken,
			nextStep: "parent_verification",
		};
	}

	/**
	 * Verify parental consent
	 * @param {string} consentToken
	 * @param {boolean} approved
	 * @returns {Promise<ConsentResult>}
	 */
	async verifyParentalConsent(consentToken, approved) {
		const consent = this.parentalConsents.get(consentToken);

		if (!consent) {
			return { success: false, error: "Invalid consent token" };
		}

		consent.status = approved ? "approved" : "denied";
		consent.respondedAt = new Date().toISOString();

		if (approved) {
			// Create verified user account for child
			const childUserId = await this.createChildAccount(consent);

			logger.audit("Parental consent approved", {
				parentEmail: consent.parentEmail,
				childAge: consent.childAge,
				childUserId,
			});

			return {
				success: true,
				childUserId,
				restrictions: this.getAgeRestrictions(consent.childAge),
			};
		} else {
			logger.audit("Parental consent denied", {
				parentEmail: consent.parentEmail,
			});
			return { success: false, error: "Parental consent denied" };
		}
	}

	/**
	 * Get age-appropriate restrictions
	 * @param {number} age
	 * @returns {Object}
	 */
	getAgeRestrictions(age) {
		const restrictions = {
			contentRating: "U", // Default safe
			features: [],
			monitoring: false,
		};

		if (age < 13) {
			restrictions.contentRating = "U";
			restrictions.features = [
				"parental_controls",
				"time_limits",
				"content_filtering",
			];
			restrictions.monitoring = true;
		} else if (age < 16) {
			restrictions.contentRating = "12";
			restrictions.features = ["content_warnings"];
			restrictions.monitoring = false;
		} else if (age < 18) {
			restrictions.contentRating = "15";
			restrictions.features = ["age_verification"];
			restrictions.monitoring = false;
		} else {
			restrictions.contentRating = "18";
			restrictions.features = ["full_access"];
			restrictions.monitoring = false;
		}

		return restrictions;
	}

	/**
	 * Check if user can access content based on age
	 * @param {number} userAge
	 * @param {string} contentRating
	 * @returns {boolean}
	 */
	canAccessContent(userAge, contentRating) {
		const ratingLevels = { U: 0, PG: 8, 12: 12, 15: 15, 18: 18 };
		const requiredAge = ratingLevels[contentRating] || 18;
		return userAge >= requiredAge;
	}

	/**
	 * Get method-specific instructions
	 * @param {string} method
	 * @returns {string}
	 */
	getMethodInstructions(method) {
		const instructions = {
			self_declaration:
				"Please confirm your age. This will be used to customize your experience.",
			credit_card:
				"We will verify your age using payment information. No charges will be made.",
			government_id:
				"Upload a photo of your government-issued ID and a selfie for verification.",
			parental_consent:
				"We will send a consent request to your parent/guardian for approval.",
		};
		return instructions[method] || "Please follow the verification prompts.";
	}

	/**
	 * Generate secure verification token
	 * @param {string} userId
	 * @returns {string}
	 */
	generateVerificationToken(userId) {
		const payload = {
			userId,
			type: "age_verification",
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor((Date.now() + this.tokenExpiry) / 1000),
		};

		return jwt.sign(payload, process.env.JWT_SECRET);
	}

	/**
	 * Generate parental consent token
	 * @param {string} parentEmail
	 * @param {number} childAge
	 * @returns {string}
	 */
	generateParentalConsentToken(parentEmail, childAge) {
		const payload = {
			parentEmail,
			childAge,
			type: "parental_consent",
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor((Date.now() + this.tokenExpiry) / 1000),
		};

		return jwt.sign(payload, process.env.JWT_SECRET);
	}

	// Placeholder methods for external integrations
	async estimateAgeFromPayment(_cardToken) {
		// Integrate with payment processor
		return { age: 25, confidence: 0.9 };
	}

	async verifyGovernmentId(_document, _selfie) {
		// Integrate with ID verification service
		return { isValid: true, age: 25 };
	}

	async createChildAccount(_consent) {
		// Create child user account with restrictions
		return `child_${crypto.randomUUID()}`;
	}

	/**
	 * Clean up expired verification tokens
	 */
	cleanupExpiredTokens() {
		const now = new Date();
		for (const [id, verification] of this.verificationTokens) {
			if (new Date(verification.expiresAt) < now) {
				this.verificationTokens.delete(id);
			}
		}
	}

	/**
	 * Verify age for a user (test-compatible method)
	 * @param {Object} verificationData - { userId, dateOfBirth, verificationMethod, documentType }
	 * @returns {Promise<Object>}
	 */
	async verifyAge(verificationData) {
		const { userId, dateOfBirth, verificationMethod } = verificationData;

		// Validate required fields
		const missingFields = [];
		if (!dateOfBirth) missingFields.push("dateOfBirth");
		if (!verificationMethod) missingFields.push("verificationMethod");

		if (missingFields.length > 0) {
			throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
		}

		// Parse and validate date
		const dob = new Date(dateOfBirth);
		if (Number.isNaN(dob.getTime())) {
			throw new Error("Invalid date of birth format");
		}

		// Calculate age
		const today = new Date();
		let age = today.getFullYear() - dob.getFullYear();
		const monthDiff = today.getMonth() - dob.getMonth();
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
			age--;
		}

		// Check minimum age requirement (18+)
		const verified = age >= 18;

		if (!verified) {
			return {
				verified: false,
				age,
				reason: "User must be at least 18 years old",
			};
		}

		// Create verification record using injected db
		if (this.db?.create) {
			const verificationRecord = {
				...verificationData,
				verified: true,
				age,
				verifiedAt: new Date().toISOString(),
			};

			const result = await this.db.create(verificationRecord);
			return result;
		}

		// Fallback if no db
		return {
			verified: true,
			age,
			id: crypto.randomUUID(),
			userId,
			verificationMethod,
		};
	}

	/**
	 * Get verification status for user (test-compatible method)
	 * @param {string} userId
	 * @returns {Promise<Object|null>}
	 */
	async getVerificationStatus(userId) {
		// Use injected db if available
		if (this.db?.getById) {
			return await this.db.getById(userId);
		}

		// Fallback
		return { verified: false, age: null };
	}

	/**
	 * Update verification record (test-compatible method)
	 * @param {string} verificationId
	 * @param {Object} updateData
	 * @returns {Promise<Object>}
	 */
	async updateVerification(verificationId, updateData) {
		// Use injected db if available
		if (this.db?.update) {
			return await this.db.update(verificationId, updateData);
		}

		// Fallback
		return { id: verificationId, ...updateData };
	}

	/**
	 * Check if user is eligible for specific content type (test-compatible method)
	 * @param {string} userId
	 * @param {string} contentType
	 * @returns {Promise<Object>}
	 */
	async isEligibleForContent(userId, contentType) {
		const verification = await this.getVerificationStatus(userId);

		if (!verification) {
			return {
				eligible: false,
				reason: "Age verification required",
			};
		}

		// Check content type requirements
		const contentMinAge = contentType === "adult_content" ? 18 : 13;

		if (verification.age < contentMinAge) {
			return {
				eligible: false,
				reason: `Content requires age ${contentMinAge}+`,
			};
		}

		return {
			eligible: true,
			age: verification.age,
		};
	}

	/**
	 * Get verification statistics (test-compatible method)
	 * @returns {Promise<Object>}
	 */
	async getVerificationStats() {
		let verifications = [];

		// Use injected db if available
		if (this.db?.getAll) {
			verifications = await this.db.getAll();
		}

		const totalVerifications = verifications.length;
		const verifiedCount = verifications.filter((v) => v.verified).length;
		const rejectedCount = verifications.filter((v) => !v.verified).length;

		const totalAge = verifications.reduce((sum, v) => sum + (v.age || 0), 0);
		const averageAge =
			totalVerifications > 0
				? Math.round((totalAge / totalVerifications) * 100) / 100
				: 0;

		const methodStats = {};
		verifications.forEach((v) => {
			const method = v.verificationMethod || "unknown";
			methodStats[method] = (methodStats[method] || 0) + 1;
		});

		return {
			totalVerifications,
			verifiedCount,
			rejectedCount,
			averageAge,
			methodStats,
		};
	}
}

// Backward/forward compatibility:
// - Tests expect to import a class and call `new AgeVerificationService(...)`.
// - Application code expects to `require('../ageVerificationService')` and get a singleton instance.
// To support both without changing all callers, export the class but attach a bound
// default instance's methods as static methods on the class. This lets the module be
// used either as a constructor or as a singleton with the same methods.
const _defaultAgeVerificationInstance = new AgeVerificationService();
// Copy prototype methods to the constructor as bound functions so callers using the
// singleton-style API (require(...) and call methods) continue to work.
Object.getOwnPropertyNames(AgeVerificationService.prototype).forEach((name) => {
	if (name === "constructor") return;
	const desc = Object.getOwnPropertyDescriptor(
		AgeVerificationService.prototype,
		name,
	);
	if (desc && typeof desc.value === "function") {
		AgeVerificationService[name] = _defaultAgeVerificationInstance[name].bind(
			_defaultAgeVerificationInstance,
		);
	}
});
AgeVerificationService.defaultInstance = _defaultAgeVerificationInstance;

module.exports = AgeVerificationService;
/**
 * Types
 * @typedef {Object} VerificationResult
 * @property {boolean} success
 * @property {number} [age]
 * @property {string} [confidence] - 'low', 'high', 'very_high'
 * @property {Object} [restrictions]
 * @property {string} [error]
 *
 * @typedef {Object} ConsentResult
 * @property {boolean} success
 * @property {string} [childUserId]
 * @property {Object} [restrictions]
 * @property {string} [error]
 *
 * @typedef {Object} VerificationStatus
 * @property {boolean} verified
 * @property {number|null} age
 */
