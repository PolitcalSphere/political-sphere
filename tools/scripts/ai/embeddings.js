#!/usr/bin/env node

/**
 * Lightweight embedding generator (hashing trick + TF normalization)
 * Produces fixed-size vectors for files and saves to ai-index/semantic-vectors.json
 */
import { promises as fsp } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INDEX_DIR = path.join(__dirname, "../../ai-index");
const VECTOR_FILE = path.join(INDEX_DIR, "semantic-vectors.json");
console.log("embeddings script start");
console.log("argv=", process.argv.slice(0, 4).join(" | "));
console.log("import.meta.url=", import.meta.url);

function normalizeToken(t) {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function hashToIndex(token, dims) {
  // use sha256 and take 4 bytes to produce uint32 then mod dims
  const h = crypto.createHash("sha256").update(token).digest();
  const val = h.readUInt32BE(0);
  return val % dims;
}

function vectorizeText(text, dims = 128) {
  // Input validation and sanitization
  if (typeof text !== "string") {
    throw new Error("Input must be a string");
  }
  if (dims < 1 || dims > 10000) {
    throw new Error("Dimensions must be between 1 and 10000");
  }

  const vec = new Array(dims).fill(0);
  const tokens = String(text).split(/\W+/).map(normalizeToken).filter(Boolean);
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  for (const [tok, w] of Object.entries(freq)) {
    const idx = hashToIndex(tok, dims);
    vec[idx] += w;
  }
  // L2 normalize
  let norm = 0;
  for (let i = 0; i < dims; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dims; i++) vec[i] = vec[i] / norm;
  return vec;
}

async function buildEmbeddings({ dims = 128 } = {}) {
  // load index to know files
  const indexPath = path.join(__dirname, "../../ai-index/codebase-index.json");
  console.log("reading index at", indexPath);
  const raw = await fsp.readFile(indexPath, "utf8").catch((e) => {
    console.warn("read index error", e?.message);
    return null;
  });
  if (!raw) {
    console.error("Index missing. Run code-indexer build first");
    process.exit(1);
  }
  console.log("index loaded, parsing");
  const index = JSON.parse(raw);
  console.log("index parsed, files:", Object.keys(index.files || {}).length);
  const vectors = {};
  for (const [filePath, info] of Object.entries(index.files || {})) {
    try {
      const abs = path.join(process.cwd(), filePath);
      const content = await fsp.readFile(abs, "utf8").catch(() => info.summary || "");
      const txt = (content || info.summary || "").slice(0, 20000); // cap
      const vec = vectorizeText(txt, dims);
      vectors[filePath] = vec;
    } catch (err) {
      console.warn("Failed to embed", filePath, err.message);
    }
  }
  await fsp.mkdir(INDEX_DIR, { recursive: true });
  await fsp.writeFile(VECTOR_FILE, JSON.stringify({ dims, vectors }, null, 2));
  console.log(
    `Wrote embeddings to ${VECTOR_FILE} (${Object.keys(vectors).length} vectors, dims=${dims})`,
  );
}

async function search(query, { dims = 128, top = 10 } = {}) {
  const raw = await fsp.readFile(VECTOR_FILE, "utf8").catch(() => null);
  if (!raw) {
    console.error("Embeddings missing. Run embeddings build first");
    process.exit(1);
  }
  const { vectors } = JSON.parse(raw);
  const qvec = vectorizeText(query, dims);
  const scores = [];
  for (const [file, vec] of Object.entries(vectors)) {
    let dot = 0;
    for (let i = 0; i < dims; i++) dot += (qvec[i] || 0) * (vec[i] || 0);
    scores.push({ file, score: dot });
  }
  scores.sort((a, b) => b.score - a.score);
  console.log(JSON.stringify({ results: scores.slice(0, top) }, null, 2));
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === "build") {
    const dims = parseInt(process.env.EMBED_DIMS || "128", 10) || 128;
    await buildEmbeddings({ dims });
  } else if (cmd === "search") {
    const q = process.argv.slice(3).join(" ");
    if (!q) {
      console.error("Usage: embeddings.js search <query>");
      process.exit(1);
    }
    const dims = parseInt(process.env.EMBED_DIMS || "128", 10) || 128;
    await search(q, { dims, top: parseInt(process.env.EMBED_TOP || "10", 10) });
  } else {
    console.log("Usage: node embeddings.js build | search <query>");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
