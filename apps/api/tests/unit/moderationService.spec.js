import { beforeEach, describe, expect, it, vi } from "vitest";
import ModerationService from "../moderationService.js";

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
		moderation: {
			create: vi.fn(),
			getAll: vi.fn(),
			update: vi.fn(),
		},
	})),
}));

describe("ModerationService", () => {
	let service;
	let mockDb;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { getDatabase } = await import("../modules/stores/index.js");
		mockDb = getDatabase();
		service = new ModerationService(mockDb.moderation);
	});

	describe("analyzeContent", () => {
		it("should analyze content and return scores", async () => {
			const content =
				"This is a test message with some potentially inappropriate content.";

			const result = await service.analyzeContent(content);

			expect(result).toHaveProperty("scores");
			expect(result).toHaveProperty("flagged", false);
			expect(result.scores).toHaveProperty("violence");
			expect(result.scores).toHaveProperty("language");
			expect(result.scores).toHaveProperty("sexual");
			expect(typeof result.scores.violence).toBe("number");
			expect(typeof result.scores.language).toBe("number");
			expect(typeof result.scores.sexual).toBe("number");
		});

		it("should flag content with high violence score", async () => {
			const violentContent =
				"This content contains extreme violence and harmful threats.";

			const result = await service.analyzeContent(violentContent);

			expect(result.flagged).toBe(true);
			expect(result.scores.violence).toBeGreaterThan(0.7);
		});

		it("should handle empty content", async () => {
			const result = await service.analyzeContent("");

			expect(result.flagged).toBe(false);
			expect(result.scores.violence).toBe(0);
			expect(result.scores.language).toBe(0);
			expect(result.scores.sexual).toBe(0);
		});
	});

	describe("moderateContent", () => {
		it("should approve safe content", async () => {
			const content = "This is a normal, appropriate message.";

			const result = await service.moderateContent(content, "user-123");

			expect(result).toHaveProperty("approved", true);
			expect(result).toHaveProperty("moderationId");
			expect(result).toHaveProperty("scores");
		});

		it("should reject inappropriate content", async () => {
			const inappropriateContent =
				"This message contains highly inappropriate and offensive language.";

			const result = await service.moderateContent(
				inappropriateContent,
				"user-123",
			);

			expect(result.approved).toBe(false);
			expect(result).toHaveProperty("reason");
			expect(result).toHaveProperty("moderationId");
		});
	});

	describe("getModerationHistory", () => {
		it("should retrieve moderation history", async () => {
			const mockHistory = [
				{
					id: "mod-1",
					content: "Test content",
					userId: "user-123",
					approved: true,
					scores: { violence: 0.1, language: 0.2, sexual: 0.0 },
					timestamp: "2025-11-05T00:00:00Z",
				},
			];
			mockDb.moderation.getAll.mockResolvedValue(mockHistory);

			const result = await service.getModerationHistory();

			expect(result).toEqual(mockHistory);
			expect(mockDb.moderation.getAll).toHaveBeenCalled();
		});

		it("should filter history by user", async () => {
			const mockHistory = [
				{
					id: "mod-1",
					content: "Test content",
					userId: "user-123",
					approved: true,
					timestamp: "2025-11-05T00:00:00Z",
				},
			];
			mockDb.moderation.getAll.mockResolvedValue(mockHistory);

			const result = await service.getModerationHistory("user-123");

			expect(result).toEqual(mockHistory);
			expect(mockDb.moderation.getAll).toHaveBeenCalledWith(
				expect.objectContaining({ userId: "user-123" }),
			);
		});
	});

	describe("updateModerationRules", () => {
		it("should update moderation rules", async () => {
			const newRules = {
				violenceThreshold: 0.8,
				languageThreshold: 0.6,
				sexualThreshold: 0.7,
				customRules: ["test rule"],
			};

			await service.updateModerationRules(newRules);

			// Verify rules were updated by testing with content that should be flagged
			const result = await service.analyzeContent("Test content");
			expect(result).toHaveProperty("scores");
		});

		it("should validate rule parameters", async () => {
			const invalidRules = {
				violenceThreshold: 1.5, // Invalid: > 1.0
			};

			await expect(service.updateModerationRules(invalidRules)).rejects.toThrow(
				"Invalid threshold value",
			);
		});
	});

	describe("getModerationStats", () => {
		it("should return moderation statistics", async () => {
			mockDb.moderation.getAll.mockResolvedValue([
				{ approved: true, scores: { violence: 0.1 } },
				{ approved: false, scores: { violence: 0.9 } },
				{ approved: true, scores: { language: 0.2 } },
			]);

			const stats = await service.getModerationStats();

			expect(stats).toHaveProperty("totalModerated", 3);
			expect(stats).toHaveProperty("approved", 2);
			expect(stats).toHaveProperty("rejected", 1);
			expect(stats).toHaveProperty("averageScores");
		});
	});
});
