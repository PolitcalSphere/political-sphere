import { describe, it, expect, beforeEach, vi } from "vitest";
import ComplianceService from "../complianceService.js";

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
		compliance: {
			create: vi.fn(),
			getAll: vi.fn(),
			getById: vi.fn(),
		},
	})),
}));

describe("ComplianceService", () => {
	let service;
	let mockDb;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { getDatabase } = await import("../index.js");
		mockDb = getDatabase();
		service = new ComplianceService(mockDb.compliance);
	});

	describe("logAuditEvent", () => {
		it("should log audit events successfully", async () => {
			mockDb.compliance.create.mockResolvedValue({
				id: "audit-123",
				eventType: "user_login",
				userId: "user-456",
				details: { ip: "192.168.1.1" },
			});

			const result = await service.logAuditEvent("user_login", "user-456", {
				ip: "192.168.1.1",
			});

			expect(result).toHaveProperty("id", "audit-123");
			expect(mockDb.compliance.create).toHaveBeenCalledWith({
				eventType: "user_login",
				userId: "user-456",
				details: { ip: "192.168.1.1" },
				timestamp: expect.any(String),
			});
		});

		it("should handle database errors", async () => {
			mockDb.compliance.create.mockRejectedValue(new Error("Database error"));

			await expect(
				service.logAuditEvent("user_login", "user-456", {}),
			).rejects.toThrow("Database error");
		});
	});

	describe("getComplianceReports", () => {
		it("should retrieve compliance reports", async () => {
			const mockReports = [
				{
					id: "report-1",
					eventType: "data_access",
					userId: "user-123",
					timestamp: "2025-11-05T00:00:00Z",
				},
			];
			mockDb.compliance.getAll.mockResolvedValue(mockReports);

			const result = await service.getComplianceReports();

			expect(result).toEqual(mockReports);
			expect(mockDb.compliance.getAll).toHaveBeenCalled();
		});

		it("should filter reports by user", async () => {
			const mockReports = [
				{
					id: "report-1",
					eventType: "data_access",
					userId: "user-123",
					timestamp: "2025-11-05T00:00:00Z",
				},
			];
			mockDb.compliance.getAll.mockResolvedValue(mockReports);

			const result = await service.getComplianceReports("user-123");

			expect(result).toEqual(mockReports);
			expect(mockDb.compliance.getAll).toHaveBeenCalledWith(
				expect.objectContaining({ userId: "user-123" }),
			);
		});
	});

	describe("checkCompliance", () => {
		it("should validate compliance requirements", async () => {
			const result = await service.checkCompliance("GDPR", {
				userId: "user-123",
				action: "data_export",
			});

			expect(result).toHaveProperty("compliant", true);
			expect(result).toHaveProperty("violations", []);
		});

		it("should detect compliance violations", async () => {
			const result = await service.checkCompliance("GDPR", {
				userId: "user-123",
				action: "unauthorized_data_access",
			});

			expect(result).toHaveProperty("compliant", false);
			expect(result.violations).toContain(
				"Unauthorized data access violates GDPR Article 5",
			);
		});
	});

	describe("generateComplianceReport", () => {
		it("should generate compliance reports", async () => {
			mockDb.compliance.getAll.mockResolvedValue([
				{
					id: "event-1",
					eventType: "data_access",
					userId: "user-123",
					timestamp: "2025-11-05T00:00:00Z",
				},
			]);

			const result = await service.generateComplianceReport("monthly");

			expect(result).toHaveProperty("period", "monthly");
			expect(result).toHaveProperty("totalEvents", 1);
			expect(result).toHaveProperty("eventsByType");
			expect(result.eventsByType.data_access).toBe(1);
		});
	});
});
