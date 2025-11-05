import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class JsonNewsStore {
	constructor(filePath) {
		this.filePath = filePath;
	}

	async #ensureDir() {
		await mkdir(path.dirname(this.filePath), { recursive: true });
	}

	async readAll() {
		try {
			const raw = await readFile(this.filePath, "utf8");
			if (!raw.trim()) {
				return [];
			}
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) {
				throw new TypeError("News store must contain an array");
			}
			return parsed;
		} catch (error) {
			if (error.code === "ENOENT") {
				return [];
			}
			throw error;
		}
	}

	async writeAll(items) {
		await this.#ensureDir();
		await writeFile(this.filePath, JSON.stringify(items, null, 2), "utf8");
	}
}

class NewsStore extends JsonNewsStore {
	constructor(filePath = path.join(__dirname, "../../data/news/news.json")) {
		super(filePath);
	}
}

export { JsonNewsStore, NewsStore };
