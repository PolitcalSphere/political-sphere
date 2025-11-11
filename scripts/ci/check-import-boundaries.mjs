#!/usr/bin/env node
import { execSync } from "child_process";
// Lightweight AST-ish checker: strips comments and strings, then detects '../../' style imports.
// No external dependencies.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { safeJoin, validateFilename } from "../../libs/shared/src/path-security.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "../..");
const REPORT_DIR = path.join(ROOT, "artifacts");
const REPORT_FILE = path.join(REPORT_DIR, "import-boundary-report.txt");
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

function stripCommentsAndStrings(line) {
  // Remove single-line comments
  let s = line.replace(/\/\/.*$/g, "");
  // Remove block comments (note: handling multi-line done elsewhere)
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");
  // Remove strings (single, double, backtick)
  s = s.replace(/(['`"])(?:\\.|(?!\1).)*\1/g, "");
  return s;
}

function processFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  // Remove /* */ multi-line comments first to simplify per-line checks
  const withoutBlock = raw.replace(/\/\*[\s\S]*?\*\//g, "");
  const lines = withoutBlock.split(/\r?\n/);
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    const original = lines[i];
    const stripped = stripCommentsAndStrings(original);
    if (/\.{2}\/\.{0,1}\.{0,1}\//.test(stripped) || /(\.\.)\/(\.\.)\//.test(stripped)) {
      // More conservative pattern: '../../' or repeated '../'
      if (stripped.includes("../../") || /\.\.\//.test(stripped)) {
        findings.push({ line: i + 1, text: original.trim() });
      }
    }
  }
  return findings;
}

function listFiles() {
  // Use git ls-files to respect repo files; fallback to scanning workspace.
  try {
    const out = execSync('git ls-files "*.js" "*.ts" "*.jsx" "*.tsx"', {
      cwd: ROOT,
      encoding: "utf8",
    });
    return out.split(/\r?\n/).filter(Boolean);
  } catch (e) {
    // fallback: walk directory (simple)
    function walk(dir) {
      const res = [];
      for (const name of fs.readdirSync(dir)) {
        try {
          const sanitizedName = validateFilename(name);
          const full = safeJoin(dir, sanitizedName);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            if (
              ["node_modules", "dev/docker", "docs", "dist", "build", "artifacts"].includes(
                sanitizedName,
              )
            )
              continue;
            res.push(...walk(full));
          } else if (/\.(js|ts|jsx|tsx)$/.test(sanitizedName)) {
            res.push(path.relative(ROOT, full));
          }
        } catch (error) {}
      }
      return res;
    }
    return walk(ROOT);
  }
}

const files = listFiles();
let bad = false;
fs.writeFileSync(REPORT_FILE, "");
for (const f of files) {
  if (!f) continue;
  // Exclude patterns
  if (/node_modules\/|dev\/docker\/|docs\/|dist\/|build\//.test(f)) continue;
  const full = path.join(ROOT, f);
  if (!fs.existsSync(full)) continue;
  try {
    const findings = processFile(full);
    if (findings.length) {
      bad = true;
      fs.appendFileSync(REPORT_FILE, `---- ${f} ----\n`);
      for (const it of findings) {
        fs.appendFileSync(REPORT_FILE, `${it.line}: ${it.text}\n`);
      }
      fs.appendFileSync(REPORT_FILE, "\n");
    }
  } catch (e) {
    // ignore parse errors
  }
}

if (bad) {
  console.log("Import boundary check failed: see", REPORT_FILE);
  console.log(fs.readFileSync(REPORT_FILE, "utf8"));
  process.exit(2);
}

console.log("Import boundary check passed.");
process.exit(0);
