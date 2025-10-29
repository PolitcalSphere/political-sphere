import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export class JsonNewsStore {
  constructor(fileUrl) {
    this.filePath = fileURLToPath(fileUrl);
  }

  async #ensureDir() {
    await mkdir(dirname(this.filePath), { recursive: true });
  }

  async readAll() {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      if (!raw.trim()) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new TypeError('News store must contain an array');
      }
      return parsed;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async writeAll(items) {
    await this.#ensureDir();
    await writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf8');
  }
}
