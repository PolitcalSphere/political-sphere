#!/usr/bin/env node
/**
 * Dependency Graph Generator
 *
 * Generates visual dependency graphs using Nx graph capabilities
 * and creates documentation for module boundaries
 *
 * Usage: npm run deps:graph
 */

import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, "..", "docs", "architecture", "dependency-graphs");

/**
 * Generate project dependency graph using Nx
 */
async function generateNxGraph() {
  console.log("📊 Generating Nx Project Dependency Graph...\n");

  try {
    // Generate graph in JSON format
    const graphOutput = execSync("npx nx graph --file=graph.json", {
      encoding: "utf-8",
      cwd: path.join(__dirname, ".."),
    });

    console.log("✅ Nx graph generated\n");

    // Also generate visual graph
    console.log("📸 Generating visual graph...\n");
    console.log("Run `npx nx graph` to open interactive visualization\n");

    return graphOutput;
  } catch (error) {
    console.error("❌ Error generating Nx graph:", error.message);
    return null;
  }
}

/**
 * Analyze project structure
 */
async function analyzeProjectStructure() {
  console.log("🔍 Analyzing Project Structure...\n");

  const structure = {
    apps: [],
    libs: [],
    totalProjects: 0,
  };

  try {
    // Read apps directory
    const appsPath = path.join(__dirname, "..", "apps");
    const appDirs = await fs.readdir(appsPath);

    for (const dir of appDirs) {
      const stat = await fs.stat(path.join(appsPath, dir));
      if (stat.isDirectory() && !dir.startsWith(".")) {
        structure.apps.push(dir);
      }
    }

    // Read libs directory
    const libsPath = path.join(__dirname, "..", "libs");
    const libCategories = await fs.readdir(libsPath);

    for (const category of libCategories) {
      const categoryPath = path.join(libsPath, category);
      const stat = await fs.stat(categoryPath);

      if (stat.isDirectory() && !category.startsWith(".")) {
        const libs = await fs.readdir(categoryPath);

        for (const lib of libs) {
          const libStat = await fs.stat(path.join(categoryPath, lib));
          if (libStat.isDirectory() && !lib.startsWith(".")) {
            structure.libs.push(`${category}/${lib}`);
          }
        }
      }
    }

    structure.totalProjects = structure.apps.length + structure.libs.length;

    console.log(`📦 Found ${structure.totalProjects} projects:\n`);
    console.log(`   Apps: ${structure.apps.length}`);
    console.log(`   Libs: ${structure.libs.length}\n`);

    return structure;
  } catch (error) {
    console.error("❌ Error analyzing structure:", error.message);
    return structure;
  }
}

/**
 * Generate dependency documentation
 */
async function generateDependencyDocs(structure) {
  console.log("📝 Generating Dependency Documentation...\n");

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const doc = `# Project Dependency Graph

**Last Updated:** ${new Date().toISOString().split("T")[0]}  
**Total Projects:** ${structure.totalProjects}

## Overview

This document provides an overview of the Political Sphere project structure and dependencies.

## Interactive Visualization

To view the interactive dependency graph:

\`\`\`bash
npx nx graph
\`\`\`

This will open a browser window with an interactive visualization of all project dependencies.

## Project Structure

### Applications (${structure.apps.length})

${structure.apps.map((app) => `- \`apps/${app}\``).join("\n")}

### Libraries (${structure.libs.length})

${structure.libs.map((lib) => `- \`libs/${lib}\``).join("\n")}

## Dependency Rules

### Module Boundaries

Nx enforces module boundaries to maintain clean architecture:

1. **Apps cannot depend on other apps**
   - Each app is independently deployable
   - Shared code must go in libs

2. **Libs can depend on other libs**
   - Must respect layer boundaries (see below)
   - Circular dependencies are prevented

3. **Layer Architecture**
   \`\`\`
   apps/
     └─> libs/platform/    (Platform services)
           └─> libs/shared/  (Shared utilities)
   \`\`\`

### Allowed Dependencies

- ✅ Apps → Platform libs
- ✅ Apps → Shared libs
- ✅ Platform libs → Shared libs
- ❌ Shared libs → Platform libs
- ❌ Apps → Apps
- ❌ Circular dependencies

## Checking Dependencies

### List All Dependencies

\`\`\`bash
npx nx graph
\`\`\`

### Check Specific Project

\`\`\`bash
npx nx show project <project-name> --web
\`\`\`

### Validate Boundaries

\`\`\`bash
npm run lint
\`\`\`

Nx will report any boundary violations during linting.

## Dependency Analysis Tools

### Nx Graph Commands

\`\`\`bash
# Interactive graph
npx nx graph

# Show affected projects
npx nx affected:graph

# Export graph data
npx nx graph --file=graph.json

# Focus on specific project
npx nx graph --focus=<project-name>
\`\`\`

### CI Integration

Dependency graphs are automatically validated in CI:

- Pull requests check for circular dependencies
- Boundary violations block merges
- Affected project analysis optimizes test runs

## Maintenance

### Adding New Projects

When adding new apps or libs:

1. Follow directory structure conventions
2. Update \`nx.json\` if needed
3. Define clear module boundaries in \`project.json\`
4. Run \`npx nx graph\` to verify structure

### Refactoring Dependencies

Before major refactoring:

1. Review current dependency graph
2. Plan new structure
3. Update incrementally
4. Validate with \`npm run lint\`

## Related Documentation

- [Architecture Overview](../architecture.md)
- [Nx Configuration](../nx-configuration.md)
- [Module Boundaries](../../00-foundation/organization.md)
`;

  const docPath = path.join(OUTPUT_DIR, "README.md");
  await fs.writeFile(docPath, doc);

  console.log(`✅ Documentation generated: ${docPath}\n`);
}

/**
 * Main execution
 */
async function main() {
  console.log("🗺️  Dependency Graph Generator\n");

  // Analyze structure
  const structure = await analyzeProjectStructure();

  // Generate documentation
  await generateDependencyDocs(structure);

  // Generate Nx graph
  await generateNxGraph();

  console.log("✨ Dependency graph generation complete!\n");
  console.log("📖 View documentation: docs/architecture/dependency-graphs/README.md");
  console.log("🌐 View interactive graph: npx nx graph\n");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
