#!/usr/bin/env node
/*
  Novelty Guard: fail PRs that are effectively regenerated with low novelty.
  Computes token-level Jaccard similarity on the diff vs base.
*/

import { execSync } from "node:child_process";

function getArg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return def;
}

function getBaseRef() {
  return process.env.GITHUB_BASE_REF || "origin/main";
}

function git(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function getDiff(base) {
  try {
    git("git fetch --no-tags --depth=1 origin +refs/heads/*:refs/remotes/origin/*");
  } catch {
    // Fetch may fail in some environments (shallow clones, etc.)
  }
  try {
    return git(`git diff ${base}...HEAD -U0`);
  } catch {
    return git("git diff --staged -U0 || true");
  }
}

function tokenize(text) {
  return new Set(text.split(/[^A-Za-z0-9_]+/).filter(Boolean));
}

function jaccard(a, b) {
  const inter = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return inter.size / (union.size || 1);
}

function main() {
  const minNovelty = Number(getArg("--min-novelty", "0.2"));
  const base = getBaseRef();
  const diff = getDiff(base);
  if (!diff || diff.length < 50) {
    console.log("::notice::Novelty guard: trivial or empty diff, skipping.");
    process.exit(0);
  }
  const before = tokenize(diff.replace(/^\+.+$/gm, ""));
  const after = tokenize(diff.replace(/^-.+$/gm, ""));
  const jac = jaccard(before, after);
  const novelty = 1 - jac;
  console.log(`Novelty score: ${novelty.toFixed(3)} (threshold ${minNovelty})`);
  if (novelty < minNovelty) {
    console.error("::error::Novelty below threshold; suspected low-change regeneration.");
    process.exit(1);
  }
}

main();
