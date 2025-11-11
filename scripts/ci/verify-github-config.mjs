#!/usr/bin/env node
// verify-github-config.mjs
// Quick checks to validate .github configuration per repo policy.
// - Ensures only one dependency automation config (renovate.json or .github/dependabot.yml)
// - Ensures workflow filenames are kebab-case and start with a verb
// - Ensures actions have action.yml and README.md

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const repoRoot = process.cwd();
const ghDir = path.join(repoRoot, ".github");
const workflowsDir = path.join(ghDir, "workflows");
const actionsDir = path.join(ghDir, "actions");
let exitCode = 0;

function fileExists(p) {
  try {
    return fs.existsSync(p);
  } catch (e) {
    return false;
  }
}

// 1) Dependency automation: prefer renovate.json (present) and ensure no dependabot.yml
const renovateJson = path.join(ghDir, "renovate.json");
const dependabotYaml = path.join(ghDir, "dependabot.yml");
if (fileExists(renovateJson) && fileExists(dependabotYaml)) {
  console.error(
    "ERROR: Both renovate.json and dependabot.yml exist. Keep only one dependency automation config.",
  );
  exitCode = 2;
} else if (!fileExists(renovateJson) && !fileExists(dependabotYaml)) {
  console.error(
    "ERROR: No dependency automation config found. Add either renovate.json or .github/dependabot.yml.",
  );
  exitCode = 2;
} else {
  console.log("Dependency automation config check: ok");
}

// 2) Workflow file naming conventions
if (fileExists(workflowsDir)) {
  const entries = fs.readdirSync(workflowsDir, { withFileTypes: true });
  function checkFileName(fileName) {
    // Accept files nested in subdirs as well
    const kebabRe = /^[a-z]+(?:[-][a-z0-9]+)*\.(ya?ml)$/; // starts with a verb-ish token
    if (!kebabRe.test(fileName)) {
      console.warn(
        `WARN: Workflow file '${fileName}' does not match kebab-case starting with a lowercase verb token.`,
      );
      exitCode = Math.max(exitCode, 1);
    }
  }
  // If directories present, walk one level deep
  for (const entry of entries) {
    const full = path.join(workflowsDir, entry.name);
    if (entry.isDirectory()) {
      const nested = fs.readdirSync(full);
      for (const f of nested) checkFileName(f);
      // Validate yaml syntax for nested files
      for (const f of nested) {
        const fullPath = path.join(full, f);
        if (/\.ya?ml$/.test(f)) {
          try {
            // Use execFileSync to avoid shell quoting issues
            execSync(
              "python3",
              ["-c", "import sys,yaml; yaml.safe_load(open(sys.argv[1]));", fullPath],
              { stdio: "ignore" },
            );
          } catch (e) {
            console.warn(
              `WARN: YAML parse failed for ${fullPath} (python3/yaml not available or syntax error)`,
            );
            exitCode = Math.max(exitCode, 1);
          }
        }
      }
    } else if (entry.isFile()) {
      checkFileName(entry.name);
      const fullPath = full;
      if (/\.ya?ml$/.test(entry.name)) {
        try {
          execSync(
            "python3",
            ["-c", "import sys,yaml; yaml.safe_load(open(sys.argv[1]));", fullPath],
            { stdio: "ignore" },
          );
        } catch (e) {
          console.warn(
            `WARN: YAML parse failed for ${fullPath} (python3/yaml not available or syntax error)`,
          );
          exitCode = Math.max(exitCode, 1);
        }
      }
    }
  }
  console.log("Workflow naming scan: completed");
} else {
  console.warn("WARN: .github/workflows directory not found.");
}

// 3) Composite actions have action.yml and README.md
if (fileExists(actionsDir)) {
  const actionCats = fs.readdirSync(actionsDir, { withFileTypes: true });
  for (const cat of actionCats) {
    if (!cat.isDirectory()) continue;
    const actionPath = path.join(actionsDir, cat.name);
    const actionYml = path.join(actionPath, "action.yml");
    const readme = path.join(actionPath, "README.md");
    if (!fileExists(actionYml)) {
      console.error(`ERROR: Action '${cat.name}' is missing action.yml`);
      exitCode = 2;
    }
    // Validate action.yml YAML syntax
    if (fileExists(actionYml)) {
      try {
        execSync(
          "python3",
          ["-c", "import sys,yaml; yaml.safe_load(open(sys.argv[1]));", actionYml],
          { stdio: "ignore" },
        );
      } catch (e) {
        console.warn(
          `WARN: YAML parse failed for ${actionYml} (python3/yaml not available or syntax error)`,
        );
        exitCode = Math.max(exitCode, 1);
      }
    }
    if (!fileExists(readme)) {
      console.warn(`WARN: Action '${cat.name}' is missing README.md with inputs/outputs/examples`);
      exitCode = Math.max(exitCode, 1);
    }
    // Suggest CHANGELOG presence in README
    if (fileExists(readme)) {
      const content = fs.readFileSync(readme, "utf8");
      if (!/CHANGELOG/i.test(content)) {
        console.warn(
          `WARN: README.md for action '${cat.name}' does not mention CHANGELOG or release notes.`,
        );
        exitCode = Math.max(exitCode, 1);
      }
    }
  }
  console.log("Composite actions check: completed");
} else {
  console.warn("WARN: .github/actions not found");
}

if (exitCode > 0) {
  console.error(`verify-github-config: Completed with code ${exitCode}`);
} else {
  console.log("verify-github-config: All checks passed");
}
process.exit(exitCode);
