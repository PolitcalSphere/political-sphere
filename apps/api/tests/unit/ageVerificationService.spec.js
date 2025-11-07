import { describe, it, expect, beforeEach, vi } from "vitest";
import AgeVerificationService from "../ageVerificationService.js";

// Mock dependencies
vi.mock("../logger.js", () => ({
	default: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock("../index.js", () => ({
	getDatabase: vi.fn(() => ({
		ageVerification: {
			create: vi.fn(),
			getById: vi.fn(),
			update: vi.fn(),
			getAll: vi.fn(),
		},
	})),
}));

describe("AgeVerificationService", () => {
	let service;
	let mockDb;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { getDatabase } = await import("../index.js");
		mockDb = getDatabase();
		service = new AgeVerificationService(mockDb.ageVerification);
	});

	describe("verifyAge", () => {
		it("should verify age successfully for adults", async () => {
			const verificationData = {
				userId: "user-123",
				dateOfBirth: "1990-01-01",
				verificationMethod: "document",
				documentType: "passport",
			};

			mockDb.ageVerification.create.mockResolvedValue({
				id: "verification-123",
				userId: "user-123",
				verified: true,
				age: 35, // Updated for 2025
				verificationMethod: "document",
			});

			const result = await service.verifyAge(verificationData);

			expect(result).toHaveProperty("verified", true);
			expect(result).toHaveProperty("age", 35); // Updated for 2025
			expect(result).toHaveProperty("id", "verification-123");
			expect(mockDb.ageVerification.create).toHaveBeenCalledWith({
				...verificationData,
				verified: true,
				age: 35, // Updated for 2025
				verifiedAt: expect.any(String),
			});
		});

		it("should reject verification for minors", async () => {
			const verificationData = {
				userId: "user-123",
				dateOfBirth: "2010-01-01", // 15 years old in 2025
				verificationMethod: "document",
				documentType: "id_card",
			};

			const result = await service.verifyAge(verificationData);

			expect(result).toHaveProperty("verified", false);
			expect(result).toHaveProperty("age", 15); // Updated for 2025
			expect(result).toHaveProperty(
				"reason",
				"User must be at least 18 years old",
			);
		});

		it("should handle invalid date formats", async () => {
			const verificationData = {
				userId: "user-123",
				dateOfBirth: "invalid-date",
				verificationMethod: "document",
			};

			await expect(service.verifyAge(verificationData)).rejects.toThrow(
				"Invalid date of birth format",
			);
		});

		it("should validate required fields", async () => {
			const incompleteData = {
				userId: "user-123",
				// missing dateOfBirth and verificationMethod
			};

			await expect(service.verifyAge(incompleteData)).rejects.toThrow(
				"Missing required fields: dateOfBirth, verificationMethod",
			);
		});
	});

	describe("getVerificationStatus", () => {
		it("should return verification status for user", async () => {
			const mockVerification = {
				id: "verification-123",
				userId: "user-123",
				verified: true,
				age: 25,
				verifiedAt: "2025-11-05T00:00:00Z",
			};

			mockDb.ageVerification.getById.mockResolvedValue(mockVerification);

			const result = await service.getVerificationStatus("user-123");

			expect(result).toEqual(mockVerification);
			expect(mockDb.ageVerification.getById).toHaveBeenCalledWith("user-123");
		});

		it("should return null for unverified user", async () => {
			mockDb.ageVerification.getById.mockResolvedValue(null);

			const result = await service.getVerificationStatus("user-123");

			expect(result).toBeNull();
		});
	});

	describe("updateVerification", () => {
		it("should update verification record", async () => {
			const updateData = {
				verificationMethod: "enhanced_check",
				notes: "Additional verification completed",
			};

			mockDb.ageVerification.update.mockResolvedValue({
				id: "verification-123",
				userId: "user-123",
				verified: true,
				...updateData,
			});

			const result = await service.updateVerification(
				"verification-123",
				updateData,
			);

			expect(result).toHaveProperty("verificationMethod", "enhanced_check");
			expect(result).toHaveProperty(
				"notes",
				"Additional verification completed",
			);
			expect(mockDb.ageVerification.update).toHaveBeenCalledWith(
				"verification-123",
				updateData,
			);
		});
	});

	describe("isEligibleForContent", () => {
		it("should allow access for verified adults", async () => {
			mockDb.ageVerification.getById.mockResolvedValue({
				verified: true,
				age: 25,
			});

			const result = await service.isEligibleForContent(
				"user-123",
				"adult_content",
			);

			expect(result).toHaveProperty("eligible", true);
			expect(result).toHaveProperty("age", 25);
		});

		it("should deny access for minors", async () => {
			mockDb.ageVerification.getById.mockResolvedValue({
				verified: true,
				age: 16,
			});

			const result = await service.isEligibleForContent(
				"user-123",
				"adult_content",
			);

			expect(result).toHaveProperty("eligible", false);
			expect(result).toHaveProperty("reason", "Content requires age 18+");
		});

		it("should deny access for unverified users", async () => {
			mockDb.ageVerification.getById.mockResolvedValue(null);

			const result = await service.isEligibleForContent(
				"user-123",
				"any_content",
			);

			expect(result).toHaveProperty("eligible", false);
			expect(result).toHaveProperty("reason", "Age verification required");
		});
	});

	describe("getVerificationStats", () => {
		it("should return verification statistics", async () => {
			mockDb.ageVerification.getAll.mockResolvedValue([
				{ verified: true, age: 25, verificationMethod: "document" },
				{ verified: true, age: 30, verificationMethod: "credit_card" },
				{ verified: false, age: 16, verificationMethod: "document" },
			]);

			const stats = await service.getVerificationStats();

			expect(stats).toHaveProperty("totalVerifications", 3);
			expect(stats).toHaveProperty("verifiedCount", 2);
			expect(stats).toHaveProperty("rejectedCount", 1);
			expect(stats).toHaveProperty("averageAge", 23.67); // (25+30+16)/3
			expect(stats).toHaveProperty("methodStats");
			expect(stats.methodStats.document).toBe(2);
			expect(stats.methodStats.credit_card).toBe(1);
		});
	});
});
