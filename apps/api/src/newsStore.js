const fs = require("fs").promises;
const path = require("path");

class JsonNewsStore {
	constructor(dataDir = path.join(__dirname, "../../data")) {
		this.dataDir = dataDir;
		this.newsFile = path.join(dataDir, "news.json");
	}

	async read() {
		try {
			await fs.access(this.newsFile);
			const content = await fs.readFile(this.newsFile, "utf8");
			return JSON.parse(content);
		} catch (error) {
			// If file doesn't exist, return empty structure
			return { news: [] };
		}
	}

	async write(data) {
		await fs.mkdir(this.dataDir, { recursive: true });
		await fs.writeFile(this.newsFile, JSON.stringify(data, null, 2));
	}

	async getAll() {
		const data = await this.read();
		return data.news || [];
	}

	async getById(id) {
		const news = await this.getAll();
		return news.find((item) => item.id === id) || null;
	}

	async create(newsItem) {
		const data = await this.read();
		const newItem = {
			id: Date.now().toString(),
			...newsItem,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		data.news = data.news || [];
		data.news.push(newItem);

		await this.write(data);
		return newItem;
	}

	async update(id, updates) {
		const data = await this.read();
		const index = data.news.findIndex((item) => item.id === id);

		if (index === -1) {
			return null;
		}

		data.news[index] = {
			...data.news[index],
			...updates,
			updatedAt: new Date().toISOString(),
		};

		await this.write(data);
		return data.news[index];
	}

	async delete(id) {
		const data = await this.read();
		const index = data.news.findIndex((item) => item.id === id);

		if (index === -1) {
			return false;
		}

		data.news.splice(index, 1);
		await this.write(data);
		return true;
	}
}

module.exports = { JsonNewsStore };
