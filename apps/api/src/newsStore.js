import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

export class JsonNewsStore {
  constructor(filePath) {
    // filePath can be a string path or URL
    if (typeof filePath === 'string') {
      this.filePath = filePath;
    } else {
      // Assume it's a URL
      this.fileUrl = filePath;
      this.filePath = fileURLToPath(filePath);
    }
  }

  // Read JSON array; return [] if file missing
  async read() {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      if (err && err.code === 'ENOENT') return [];
      throw err;
    }
  }

  // Write JSON array to file (ensure dir exists)
  async write(items) {
    const dir = dirname(this.filePath);
    try {
      await mkdir(dir, { recursive: true });
    } catch (e) {
      // ignore mkdir errors and let writeFile surface issues
    }
    await writeFile(this.filePath, JSON.stringify(items || [], null, 2), 'utf8');
    return items;
  }

  // Compatibility aliases
  async getAll() {
    return this.read();
  }

  async save(items) {
    return this.write(items);
  }
}
