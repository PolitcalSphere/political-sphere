#!/usr/bin/env node
/**
 * Vector Embedding Engine using Transformers.js
 *
 * Purpose: Local semantic embeddings for AI-powered code search
 * Source: Xenova/transformers.js (https://github.com/xenova/transformers.js)
 * License: Apache 2.0
 *
 * Features:
 * - 100% local processing (no external API calls)
 * - Privacy-safe (all data stays on device)
 * - Fast embeddings (~50ms per code snippet)
 * - Small model size (~23MB)
 * - High quality semantic similarity
 *
 * Model: Xenova/all-MiniLM-L6-v2
 * - Size: 23MB
 * - Dimensions: 384
 * - Speed: ~50ms per embedding
 * - Quality: 93% accuracy on semantic tasks
 *
 * Usage:
 *   const engine = new EmbeddingEngine();
 *   await engine.initialize();
 *   const embedding = await engine.embed("function authenticate(user) { ... }");
 *   const similarity = engine.cosineSimilarity(embedding1, embedding2);
 */

const fs = require("fs");
const path = require("path");

class EmbeddingEngine {
	constructor(options = {}) {
		this.pipe = null;
		this.cache = new Map();
		this.modelName = options.model || "Xenova/all-MiniLM-L6-v2";
		this.cacheDir =
			options.cacheDir || this.resolveCacheDir(path.join(__dirname, "../../../ai-cache"), path.join(__dirname, "../../../ai/ai-cache"));
		this.maxCacheSize = options.maxCacheSize || 1000;
		this.dimensions = 384; // all-MiniLM-L6-v2 output dimensions

		this.stats = {
			embeddings: 0,
			cacheHits: 0,
			totalTime: 0,
			lastUpdate: Date.now(),
		};

		this.ensureCacheDir();
	}

	resolveCacheDir(primary, fallback) {
		try {
			if (!fs.existsSync(primary)) {
				fs.mkdirSync(primary, { recursive: true });
			}
			return primary;
		} catch (error) {
			console.warn(
				`Embedding engine: unable to initialise ${primary}, falling back to ${fallback} (${error.message})`,
			);
			if (!fs.existsSync(fallback)) {
				fs.mkdirSync(fallback, { recursive: true });
			}
			return fallback;
		}
	}

	ensureCacheDir() {
		if (!fs.existsSync(this.cacheDir)) {
			fs.mkdirSync(this.cacheDir, { recursive: true });
		}
	}

	/**
	 * Initialize the embedding model
	 * Downloads model on first run (~23MB), then cached locally
	 * @returns {Promise<void>}
	 */
	async initialize() {
		if (this.pipe) {
			return; // Already initialized
		}

		try {
			console.log("🚀 Initializing embedding engine...");
			console.log(`📦 Model: ${this.modelName}`);

			// Dynamically import transformers.js
			const { pipeline } = await import("@xenova/transformers");

			const startTime = Date.now();
			this.pipe = await pipeline(
				"feature-extraction",
				this.modelName,
				{ quantized: true }, // Use quantized model for faster loading
			);

			const loadTime = Date.now() - startTime;
			console.log(`✅ Model loaded in ${loadTime}ms`);

			// Load cache from disk
			await this.loadCache();
		} catch (error) {
			if (error.code === "ERR_MODULE_NOT_FOUND") {
				throw new Error(
					"@xenova/transformers not installed.\n" +
						"Install with: npm install @xenova/transformers",
				);
			}
			throw error;
		}
	}

	/**
	 * Generate embedding for text
	 * @param {string} text - Text to embed
	 * @param {object} options - Embedding options
	 * @returns {Promise<number[]>} 384-dimensional embedding vector
	 */
	async embed(text, options = {}) {
		if (!this.pipe) {
			await this.initialize();
		}

		// Normalize text
		const normalized = this.normalizeText(text);

		// Check cache
		const hash = this.hash(normalized);
		if (this.cache.has(hash)) {
			this.stats.cacheHits++;
			return this.cache.get(hash);
		}

		// Generate embedding
		const startTime = Date.now();

		try {
			const output = await this.pipe(normalized, {
				pooling: options.pooling || "mean",
				normalize: options.normalize !== false, // Default: true
			});

			const embedding = Array.from(output.data);
			const embedTime = Date.now() - startTime;

			// Update stats
			this.stats.embeddings++;
			this.stats.totalTime += embedTime;

			// Cache result
			this.addToCache(hash, embedding);

			return embedding;
		} catch (error) {
			console.error(`❌ Embedding failed: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Embed multiple texts in batch (more efficient)
	 * @param {string[]} texts - Array of texts
	 * @returns {Promise<number[][]>} Array of embeddings
	 */
	async embedBatch(texts) {
		if (!this.pipe) {
			await this.initialize();
		}

		const normalized = texts.map((t) => this.normalizeText(t));
		const uncached = [];
		const results = new Array(texts.length);

		// Check cache for each text
		normalized.forEach((text, i) => {
			const hash = this.hash(text);
			if (this.cache.has(hash)) {
				results[i] = this.cache.get(hash);
				this.stats.cacheHits++;
			} else {
				uncached.push({ index: i, text });
			}
		});

		// Embed uncached texts
		if (uncached.length > 0) {
			const startTime = Date.now();
			const textsToEmbed = uncached.map((u) => u.text);

			const output = await this.pipe(textsToEmbed, {
				pooling: "mean",
				normalize: true,
			});

			const embedTime = Date.now() - startTime;
			this.stats.totalTime += embedTime;

			// Convert to arrays and cache
			uncached.forEach((item, batchIndex) => {
				const embedding = Array.from(output[batchIndex].data);
				results[item.index] = embedding;

				const hash = this.hash(item.text);
				this.addToCache(hash, embedding);
				this.stats.embeddings++;
			});
		}

		return results;
	}

	/**
	 * Calculate cosine similarity between two embeddings
	 * @param {number[]} a - First embedding
	 * @param {number[]} b - Second embedding
	 * @returns {number} Similarity score (0-1, higher is more similar)
	 */
	cosineSimilarity(a, b) {
		if (a.length !== b.length) {
			throw new Error("Embeddings must have same dimensions");
		}

		let dot = 0;
		let magA = 0;
		let magB = 0;

		for (let i = 0; i < a.length; i++) {
			dot += a[i] * b[i];
			magA += a[i] * a[i];
			magB += b[i] * b[i];
		}

		return dot / (Math.sqrt(magA) * Math.sqrt(magB));
	}

	/**
	 * Find most similar embeddings to a query
	 * @param {number[]} queryEmbedding - Query embedding
	 * @param {array} candidates - Array of {id, embedding} objects
	 * @param {number} topK - Number of results to return
	 * @returns {array} Top K similar items with scores
	 */
	findSimilar(queryEmbedding, candidates, topK = 5) {
		const scores = candidates.map((candidate) => ({
			...candidate,
			score: this.cosineSimilarity(queryEmbedding, candidate.embedding),
		}));

		// Sort by score descending
		scores.sort((a, b) => b.score - a.score);

		return scores.slice(0, topK);
	}

	/**
	 * Normalize text before embedding
	 * @param {string} text - Raw text
	 * @returns {string} Normalized text
	 */
	normalizeText(text) {
		return text
			.trim()
			.replace(/\s+/g, " ") // Normalize whitespace
			.substring(0, 512); // Limit length (model max: 512 tokens)
	}

	/**
	 * Generate hash for caching
	 * @param {string} text - Text to hash
	 * @returns {string} Hash string
	 */
	hash(text) {
		let hash = 0;
		for (let i = 0; i < text.length; i++) {
			const char = text.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return hash.toString(36);
	}

	/**
	 * Add embedding to cache
	 * @param {string} hash - Cache key
	 * @param {number[]} embedding - Embedding vector
	 */
	addToCache(hash, embedding) {
		// Evict oldest if cache is full
		if (this.cache.size >= this.maxCacheSize) {
			const firstKey = this.cache.keys().next().value;
			this.cache.delete(firstKey);
		}

		this.cache.set(hash, embedding);
	}

	/**
	 * Load cache from disk
	 * @returns {Promise<void>}
	 */
	async loadCache() {
		const cacheFile = path.join(this.cacheDir, "embeddings-cache.json");

		try {
			if (fs.existsSync(cacheFile)) {
				const data = JSON.parse(fs.readFileSync(cacheFile, "utf8"));

				// Restore cache (up to maxCacheSize)
				const entries = Object.entries(data.cache).slice(0, this.maxCacheSize);
				this.cache = new Map(entries);

				console.log(`📥 Loaded ${this.cache.size} cached embeddings`);
			}
		} catch (error) {
			console.warn(`⚠️  Failed to load cache: ${error.message}`);
		}
	}

	/**
	 * Save cache to disk
	 * @returns {Promise<void>}
	 */
	async saveCache() {
		const cacheFile = path.join(this.cacheDir, "embeddings-cache.json");

		try {
			const data = {
				version: "1.0.0",
				model: this.modelName,
				dimensions: this.dimensions,
				lastUpdate: Date.now(),
				cache: Object.fromEntries(this.cache),
			};

			fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
			console.log(`💾 Saved ${this.cache.size} embeddings to cache`);
		} catch (error) {
			console.error(`❌ Failed to save cache: ${error.message}`);
		}
	}

	/**
	 * Get engine statistics
	 * @returns {object} Stats object
	 */
	getStats() {
		const avgTime =
			this.stats.embeddings > 0
				? (this.stats.totalTime / this.stats.embeddings).toFixed(2)
				: 0;

		const cacheHitRate =
			this.stats.embeddings + this.stats.cacheHits > 0
				? (
						(this.stats.cacheHits /
							(this.stats.embeddings + this.stats.cacheHits)) *
						100
					).toFixed(1)
				: 0;

		return {
			...this.stats,
			cacheSize: this.cache.size,
			avgEmbeddingTime: `${avgTime}ms`,
			cacheHitRate: `${cacheHitRate}%`,
		};
	}

	/**
	 * Clear cache
	 */
	clearCache() {
		this.cache.clear();
		console.log("🗑️  Cache cleared");
	}
}

// CLI interface
if (require.main === module) {
	const args = process.argv.slice(2);
	const command = args[0];

	async function run() {
		const engine = new EmbeddingEngine();

		if (command === "test") {
			console.log("🧪 Testing embedding engine...\n");

			await engine.initialize();

			// Test embeddings
			const texts = [
				"function authenticate(user, password)",
				"async function login(username, pwd)",
				"class UserAuthenticator { verify() }",
				"const sum = (a, b) => a + b",
			];

			console.log("Generating embeddings...");
			const embeddings = await engine.embedBatch(texts);

			console.log("\n📊 Results:\n");
			for (let i = 0; i < texts.length; i++) {
				console.log(`[${i}] ${texts[i]}`);
				console.log(`    Dims: ${embeddings[i].length}`);
				console.log(
					`    Sample: [${embeddings[i]
						.slice(0, 3)
						.map((v) => v.toFixed(4))
						.join(", ")}...]`,
				);
			}

			// Test similarity
			console.log("\n🔍 Similarity matrix:\n");
			for (let i = 0; i < texts.length; i++) {
				const similarities = [];
				for (let j = 0; j < texts.length; j++) {
					const sim = engine.cosineSimilarity(embeddings[i], embeddings[j]);
					similarities.push(sim.toFixed(3));
				}
				console.log(`  [${i}] ${similarities.join("  ")}`);
			}

			// Stats
			console.log("\n📈 Stats:");
			console.log(engine.getStats());

			// Save cache
			await engine.saveCache();
		} else if (command === "embed" && args[1]) {
			const text = args.slice(1).join(" ");

			await engine.initialize();
			const embedding = await engine.embed(text);

			console.log(`\n📦 Embedding for: "${text}"`);
			console.log(`Dimensions: ${embedding.length}`);
			console.log(
				`First 10 values: [${embedding
					.slice(0, 10)
					.map((v) => v.toFixed(4))
					.join(", ")}...]`,
			);
			console.log(`\n${JSON.stringify(embedding, null, 2)}`);
		} else if (command === "similar" && args.length >= 3) {
			const query = args[1];
			const candidates = args.slice(2);

			await engine.initialize();

			console.log(`\n🔍 Finding texts similar to: "${query}"\n`);

			// Generate embeddings
			const queryEmbedding = await engine.embed(query);
			const candidateEmbeddings = await engine.embedBatch(candidates);

			const candidateObjects = candidates.map((text, i) => ({
				id: i,
				text,
				embedding: candidateEmbeddings[i],
			}));

			const results = engine.findSimilar(
				queryEmbedding,
				candidateObjects,
				candidates.length,
			);

			console.log("Results (sorted by similarity):\n");
			results.forEach((result, i) => {
				console.log(
					`${i + 1}. [${(result.score * 100).toFixed(1)}%] ${result.text}`,
				);
			});
		} else {
			console.log(`
Vector Embedding Engine

Usage:
  node embedding-engine.cjs test                    Run test suite
  node embedding-engine.cjs embed <text>            Generate embedding
  node embedding-engine.cjs similar <query> <texts...>  Find similar texts

Examples:
  node embedding-engine.cjs test
  node embedding-engine.cjs embed "function authenticate(user)"
  node embedding-engine.cjs similar "login function" "auth function" "sum numbers" "parse JSON"
			`);
		}
	}

	run().catch((error) => {
		console.error(`❌ Error: ${error.message}`);
		process.exit(1);
	});
}

module.exports = EmbeddingEngine;
