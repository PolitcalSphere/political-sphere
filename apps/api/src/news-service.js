const fs = require("fs").promises;
const path = require("path");

class NewsService {
	constructor(dataDir = path.join(__dirname, "../../data")) {
		this.dataDir = dataDir;
		this.newsFile = path.join(dataDir, "news.json");
	}

	async list(params = {}) {
		try {
			const data = await this.readData();
			let news = data.news || [];

			// Apply filters
			if (params.category) {
				news = news.filter((item) => item.category === params.category);
			}
			if (params.tag) {
				news = news.filter(
					(item) => item.tags && item.tags.includes(params.tag),
				);
			}
			if (params.search) {
				const searchTerm = params.search.toLowerCase();
				news = news.filter(
					(item) =>
						item.title.toLowerCase().includes(searchTerm) ||
						item.content.toLowerCase().includes(searchTerm),
				);
			}

			// Apply limit
			if (params.limit) {
				const limit = parseInt(params.limit);
				if (!isNaN(limit) && limit > 0) {
					news = news.slice(0, limit);
				}
			}

			return news;
		} catch (error) {
			console.error("Error listing news:", error);
			return [];
		}
	}

	async create(newsItem) {
		try {
			const data = await this.readData();
			const newItem = {
				id: Date.now().toString(),
				...newsItem,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			data.news = data.news || [];
			data.news.push(newItem);

			await this.writeData(data);
			return newItem;
		} catch (error) {
			console.error("Error creating news item:", error);
			throw new Error("Failed to create news item");
		}
	}

	async update(id, updates) {
		try {
			const data = await this.readData();
			const index = data.news.findIndex((item) => item.id === id);

			if (index === -1) {
				return null;
			}

			data.news[index] = {
				...data.news[index],
				...updates,
				updatedAt: new Date().toISOString(),
			};

			await this.writeData(data);
			return data.news[index];
		} catch (error) {
			console.error("Error updating news item:", error);
			throw new Error("Failed to update news item");
		}
	}

	async getById(id) {
		try {
			const data = await this.readData();
			return data.news.find((item) => item.id === id) || null;
		} catch (error) {
			console.error("Error getting news item:", error);
			return null;
		}
	}

	async analyticsSummary() {
		try {
			const data = await this.readData();
			const news = data.news || [];

			return {
				total: news.length,
				categories: this.groupBy(news, "category"),
				tags: this.groupByTags(news),
				recent: news.slice(0, 5),
			};
		} catch (error) {
			console.error("Error getting analytics:", error);
			return { total: 0, categories: {}, tags: {}, recent: [] };
		}
	}

	async readData() {
		try {
			await fs.access(this.newsFile);
			const content = await fs.readFile(this.newsFile, "utf8");
			return JSON.parse(content);
		} catch (error) {
			// If file doesn't exist, return empty structure
			return { news: [] };
		}
	}

	async writeData(data) {
		await fs.mkdir(this.dataDir, { recursive: true });
		await fs.writeFile(this.newsFile, JSON.stringify(data, null, 2));
	}

	groupBy(items, key) {
		return items.reduce((acc, item) => {
			const value = item[key];
			acc[value] = (acc[value] || 0) + 1;
			return acc;
		}, {});
	}

	groupByTags(items) {
		const tagCounts = {};
		items.forEach((item) => {
			if (item.tags && Array.isArray(item.tags)) {
				item.tags.forEach((tag) => {
					tagCounts[tag] = (tagCounts[tag] || 0) + 1;
				});
			}
		});
		return tagCounts;
	}
}

module.exports = { NewsService };
