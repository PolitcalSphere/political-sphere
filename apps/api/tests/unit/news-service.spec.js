import { beforeEach, describe, expect, it } from "vitest";
import NewsServiceModule from "../news-service.js";

const { NewsService } = NewsServiceModule;

/**
 * Simple in-memory store that mimics the persistence contract used by NewsService.
 * Tests mutate the backing array to verify reads/writes without hitting the filesystem.
 */
class MemoryNewsStore {
	constructor(initialItems = []) {
		this._items = initialItems.map((item) => ({ ...item }));
	}

	async readAll() {
		return this._items.map((item) => ({ ...item }));
	}

	async writeAll(items) {
		this._items = items.map((item) => ({ ...item }));
	}

	setItems(items) {
		this._items = items.map((item) => ({ ...item }));
	}
}

const FIXED_NOW = new Date("2024-03-01T12:00:00.000Z");

describe("NewsService (unit)", () => {
	let store;
	let service;

	beforeEach(() => {
		store = new MemoryNewsStore();
		service = new NewsService(store, () => new Date(FIXED_NOW));
	});

	it("creates sanitized record with defaulted fields", async () => {
		const record = await service.create({
			title: '  Coalition "Announcement" & Partners  ',
			excerpt: "  Major reforms ahead  ",
			content: "  Transparency package announced  ",
			category: "Technology",
			tags: ["innovation", "Innovation", "gov-tech"],
			sources: [" https://example.org/update ", "http://localhost/item"],
		});

		expect(record.id).toMatch(
			/^coalition-quot-announcement-quot-amp-partners-[a-z0-9]+$/,
		);
		expect(record.category).toBe("technology");
		expect(record.title).toBe(
			"Coalition &quot;Announcement&quot; &amp; Partners",
		);
		expect(record.tags).toEqual(["innovation", "Innovation", "gov-tech"]);
		expect(record.sources).toEqual([
			"https://example.org/update",
			"http://localhost/item",
		]);
		expect(record.createdAt).toBe(FIXED_NOW.toISOString());
		expect(record.updatedAt).toBe(FIXED_NOW.toISOString());

		const persisted = await service.list();
		expect(persisted).toEqual([record]);
	});

	it("rejects invalid categories and tags", async () => {
		await expect(
			service.create({
				title: "Invalid category",
				excerpt: "excerpt",
				content: "content",
				category: "not-a-real-category",
			}),
		).rejects.toThrow(/Invalid category/);

		await expect(
			service.create({
				title: "Bad tags",
				excerpt: "excerpt",
				content: "content",
				category: "politics",
				tags: ["good", "bad tag"],
			}),
		).rejects.toThrow(/Invalid tag format/);
	});

	it("enforces secure source URLs and array input", async () => {
		await expect(
			service.create({
				title: "Invalid sources shape",
				excerpt: "excerpt",
				content: "content",
				category: "politics",
				sources: "https://example.org",
			}),
		).rejects.toThrow(/Sources must be an array/);

		await expect(
			service.create({
				title: "Insecure source protocol",
				excerpt: "excerpt",
				content: "content",
				category: "politics",
				sources: ["http://example.org/insecure"],
			}),
		).rejects.toThrow(/Insecure source URL protocol/);
	});

	it("lists records with category, tag, search, and limit filters", async () => {
		store.setItems([
			{
				id: "gov-1",
				title: "Transparency Initiative Expands",
				excerpt: "New disclosures",
				content: "Details on funding transparency",
				category: "governance",
				tags: ["transparency", "policy"],
				sources: [],
				createdAt: "2024-02-01T10:00:00.000Z",
				updatedAt: "2024-02-01T10:00:00.000Z",
			},
			{
				id: "finance-1",
				title: "Budget Proposal Released",
				excerpt: "Fiscal outlook",
				content: "Overview of national budget",
				category: "finance",
				tags: ["economy"],
				sources: [],
				createdAt: "2024-02-02T09:30:00.000Z",
				updatedAt: "2024-02-02T09:30:00.000Z",
			},
		]);

		expect(await service.list({ category: "governance" })).toHaveLength(1);
		expect(await service.list({ tag: "transparency" })).toHaveLength(1);
		expect(await service.list({ search: "budget" })).toHaveLength(1);
		expect(await service.list({ limit: 1 })).toHaveLength(1);
		await expect(service.list({ limit: 2000 })).rejects.toThrow(/Invalid limit/);
		await expect(service.list({ search: "<script>" })).rejects.toThrow(
			/Invalid search query/,
		);
	});

	it("updates an existing record and returns null for missing id", async () => {
		const original = await service.create({
			title: "Original story",
			excerpt: "Initial excerpt",
			content: "Initial content",
			category: "policy",
		});

		const updated = await service.update(original.id, { excerpt: "Updated" });
		expect(updated.excerpt).toBe("Updated");
		expect(updated.updatedAt).toBe(FIXED_NOW.toISOString());

		expect(await service.update("missing-id", { excerpt: "noop" })).toBeNull();
	});

	it("computes analytics summary with published items only", async () => {
		const publishedOld = {
			id: "old",
			title: "Legacy report",
			excerpt: "Old excerpt",
			content: "Old content",
			category: "governance",
			tags: [],
			sources: [],
			status: "published",
			createdAt: "2024-01-01T08:00:00.000Z",
			updatedAt: "2024-01-01T08:00:00.000Z",
		};
		const publishedNew = {
			...publishedOld,
			id: "recent",
			category: "finance",
			createdAt: "2024-02-10T12:30:00.000Z",
			updatedAt: "2024-02-10T12:30:00.000Z",
		};
		const draft = {
			...publishedOld,
			id: "draft",
			status: "draft",
		};
		const malformed = {
			...publishedOld,
			id: "malformed",
			status: "published",
			category: "not-real",
		};

		store.setItems([publishedOld, publishedNew, draft, malformed]);

		const summary = await service.analyticsSummary();
		expect(summary.total).toBe(2);
		expect(summary.categories).toEqual({ governance: 1, finance: 1 });
		expect(summary.recent[0].id).toBe("recent");
	});
});
