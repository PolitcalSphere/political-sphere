/* eslint-env jest */
import { execSync } from "child_process";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";

describe("Code Indexer", () => {
  const indexFile = join(process.cwd(), "ai-index", "codebase-index.json");

  beforeEach(() => {
    // Clean up any existing index
    if (existsSync(indexFile)) {
      unlinkSync(indexFile);
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(indexFile)) {
      unlinkSync(indexFile);
    }
  });

  it("should build index successfully", () => {
    execSync("node scripts/ai/code-indexer.js build", { stdio: "pipe" });

    expect(existsSync(indexFile)).toBe(true);

    const index = JSON.parse(readFileSync(indexFile, "utf8"));
    expect(index).toHaveProperty("files");
    expect(index).toHaveProperty("lastUpdated");
    expect(typeof index.lastUpdated).toBe("string");
  });

  it("should search index and return results", () => {
    // First build the index
    execSync("node scripts/ai/code-indexer.js build", { stdio: "pipe" });

    // Search for a common term
    const output = execSync('node scripts/ai/code-indexer.js search "function"', {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(output).toContain("Search results for: function");
    // Should find some functions in the codebase
  });

  it("should handle search with no results", () => {
    // First build the index
    execSync("node scripts/ai/code-indexer.js build", { stdio: "pipe" });

    // Search for a term that shouldn't exist
    const output = execSync('node scripts/ai/code-indexer.js search "nonexistentterm12345"', {
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(output).toContain("No results found for: nonexistentterm12345");
  });

  it("should fail gracefully when index does not exist", () => {
    expect(() => {
      execSync('node scripts/ai/code-indexer.js search "test"', { stdio: "pipe" });
    }).toThrow();
  });

  it("should include semantic tokens in index", () => {
    execSync("node scripts/ai/code-indexer.js build", { stdio: "pipe" });

    const index = JSON.parse(readFileSync(indexFile, "utf8"));
    expect(index).toHaveProperty("tokens");

    // Check for semantic variations (camelCase splits, abbreviations)
    const tokens = Object.keys(index.tokens);
    const hasSemanticTokens = tokens.some(
      (token) =>
        token === "func" ||
        token === "comp" ||
        token === "iface" ||
        token.includes("get") ||
        token.includes("user") ||
        token.includes("data"),
    );
    expect(hasSemanticTokens).toBe(true);
  });
});
