#!/usr/bin/env node
/**
 * ADR (Architecture Decision Record) Management Tool
 *
 * Commands:
 *   list    - List all ADRs with status
 *   new     - Create a new ADR from template
 *   index   - Generate index of all ADRs
 *   stats   - Show ADR statistics
 *
 * Usage: node scripts/adr-tool.mjs <command> [args]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADR_DIR = path.join(__dirname, "..", "docs", "04-architecture", "adr");
const ADR_INDEX = path.join(ADR_DIR, "INDEX.md");

const ADR_TEMPLATE = `# [TITLE]

- **Status**: Proposed
- **Date**: [DATE]
- **Decision Makers**: @username
- **Tags**: architecture

## Context

[What is the issue that we're seeing that is motivating this decision or change?]

## Decision

[What is the change that we're proposing and/or doing?]

## Consequences

### Positive

- Benefit 1
- Benefit 2

### Negative

- Trade-off 1
- Trade-off 2

### Neutral

- Neutral consequence

## Alternatives Considered

### Alternative 1

[Description and why it was rejected]

## Constitutional Check

**Affects**: None | Voting | Speech | Moderation | Power Distribution | Policy

**Relevant Principles**: [Link to governance docs]

**Compliance**: Verified | Requires Review | Not Applicable

## References

- [Link to related documentation]
- [Link to standards or specifications]
`;

async function listADRs() {
  try {
    const files = await fs.readdir(ADR_DIR);
    const adrFiles = files.filter(
      (f) => f.endsWith(".md") && f !== "INDEX.md" && f !== "README.md",
    );

    console.log(`\n📋 Found ${adrFiles.length} ADRs:\n`);

    for (const file of adrFiles.sort()) {
      const content = await fs.readFile(path.join(ADR_DIR, file), "utf-8");
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const statusMatch = content.match(/\*\*Status\*\*:\s+(\w+)/);

      const title = titleMatch ? titleMatch[1] : "Unknown";
      const status = statusMatch ? statusMatch[1] : "Unknown";

      const statusEmoji =
        {
          Proposed: "🟡",
          Accepted: "✅",
          Rejected: "❌",
          Deprecated: "⚠️",
          Superseded: "🔄",
        }[status] || "❓";

      console.log(`  ${statusEmoji} ${file.padEnd(30)} ${title}`);
    }

    console.log("\n");
  } catch (error) {
    console.error("Error listing ADRs:", error);
    process.exit(1);
  }
}

async function createNewADR(title) {
  if (!title) {
    console.error("Error: ADR title is required");
    console.log('Usage: node scripts/adr-tool.mjs new "Your ADR Title"');
    process.exit(1);
  }

  try {
    // Get next ADR number
    const files = await fs.readdir(ADR_DIR);
    const adrFiles = files.filter((f) => f.match(/^\d{4}-/));
    const numbers = adrFiles.map((f) => parseInt(f.substring(0, 4), 10));
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

    // Create filename
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    const filename = `${String(nextNumber).padStart(4, "0")}-${slug}.md`;
    const filepath = path.join(ADR_DIR, filename);

    // Create ADR content
    const date = new Date().toISOString().split("T")[0];
    const content = ADR_TEMPLATE.replace("[TITLE]", title).replace("[DATE]", date);

    await fs.writeFile(filepath, content);

    console.log(`\n✅ Created new ADR: ${filename}`);
    console.log(`📝 Edit the file at: docs/architecture/adr/${filename}\n`);

    // Update index
    await generateIndex();
  } catch (error) {
    console.error("Error creating ADR:", error);
    process.exit(1);
  }
}

async function generateIndex() {
  try {
    const files = await fs.readdir(ADR_DIR);
    const adrFiles = files.filter(
      (f) => f.endsWith(".md") && f !== "INDEX.md" && f !== "README.md",
    );

    const adrs = [];

    for (const file of adrFiles) {
      const content = await fs.readFile(path.join(ADR_DIR, file), "utf-8");
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const statusMatch = content.match(/\*\*Status\*\*:\s+(\w+)/);
      const dateMatch = content.match(/\*\*Date\*\*:\s+(.+)$/m);
      const tagsMatch = content.match(/\*\*Tags\*\*:\s+(.+)$/m);

      adrs.push({
        file,
        title: titleMatch ? titleMatch[1] : "Unknown",
        status: statusMatch ? statusMatch[1] : "Unknown",
        date: dateMatch ? dateMatch[1] : "Unknown",
        tags: tagsMatch ? tagsMatch[1].split(",").map((t) => t.trim()) : [],
      });
    }

    // Sort by filename (which includes number)
    adrs.sort((a, b) => a.file.localeCompare(b.file));

    // Generate index content
    let indexContent = `# Architecture Decision Records (ADR) Index

**Last Updated**: ${new Date().toISOString().split("T")[0]}  
**Total ADRs**: ${adrs.length}

This document provides a comprehensive index of all architectural decisions made in the Political Sphere project.

## Status Summary

`;

    const statusCounts = {};
    adrs.forEach((adr) => {
      statusCounts[adr.status] = (statusCounts[adr.status] || 0) + 1;
    });

    Object.entries(statusCounts).forEach(([status, count]) => {
      const emoji =
        {
          Proposed: "🟡",
          Accepted: "✅",
          Rejected: "❌",
          Deprecated: "⚠️",
          Superseded: "🔄",
        }[status] || "❓";
      indexContent += `- ${emoji} **${status}**: ${count}\n`;
    });

    indexContent += "\n## All ADRs\n\n";
    indexContent += "| # | Title | Status | Date | Tags |\n";
    indexContent += "|---|-------|--------|------|------|\n";

    adrs.forEach((adr, index) => {
      const number = index + 1;
      const statusEmoji =
        {
          Proposed: "🟡",
          Accepted: "✅",
          Rejected: "❌",
          Deprecated: "⚠️",
          Superseded: "🔄",
        }[adr.status] || "❓";

      indexContent += `| ${number} | [${adr.title}](${adr.file}) | ${statusEmoji} ${adr.status} | ${adr.date} | ${adr.tags.join(", ")} |\n`;
    });

    indexContent += "\n## By Status\n\n";

    for (const status of ["Accepted", "Proposed", "Deprecated", "Rejected", "Superseded"]) {
      const filtered = adrs.filter((a) => a.status === status);
      if (filtered.length > 0) {
        indexContent += `### ${status}\n\n`;
        filtered.forEach((adr) => {
          indexContent += `- [${adr.title}](${adr.file}) - ${adr.date}\n`;
        });
        indexContent += "\n";
      }
    }

    indexContent += "## By Tag\n\n";

    const tagMap = {};
    adrs.forEach((adr) => {
      adr.tags.forEach((tag) => {
        if (!tagMap[tag]) tagMap[tag] = [];
        tagMap[tag].push(adr);
      });
    });

    Object.entries(tagMap)
      .sort()
      .forEach(([tag, tagAdrs]) => {
        indexContent += `### ${tag}\n\n`;
        tagAdrs.forEach((adr) => {
          indexContent += `- [${adr.title}](${adr.file})\n`;
        });
        indexContent += "\n";
      });

    await fs.writeFile(ADR_INDEX, indexContent);
    console.log(`\n✅ Generated ADR index at: docs/architecture/adr/INDEX.md\n`);
  } catch (error) {
    console.error("Error generating index:", error);
    process.exit(1);
  }
}

async function showStats() {
  try {
    const files = await fs.readdir(ADR_DIR);
    const adrFiles = files.filter(
      (f) => f.endsWith(".md") && f !== "INDEX.md" && f !== "README.md",
    );

    const stats = {
      total: adrFiles.length,
      byStatus: {},
      byTag: {},
      byYear: {},
    };

    for (const file of adrFiles) {
      const content = await fs.readFile(path.join(ADR_DIR, file), "utf-8");
      const statusMatch = content.match(/\*\*Status\*\*:\s+(\w+)/);
      const dateMatch = content.match(/\*\*Date\*\*:\s+(\d{4})/);
      const tagsMatch = content.match(/\*\*Tags\*\*:\s+(.+)$/m);

      const status = statusMatch ? statusMatch[1] : "Unknown";
      const year = dateMatch ? dateMatch[1] : "Unknown";
      const tags = tagsMatch ? tagsMatch[1].split(",").map((t) => t.trim()) : [];

      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      stats.byYear[year] = (stats.byYear[year] || 0) + 1;
      tags.forEach((tag) => {
        stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
      });
    }

    console.log("\n📊 ADR Statistics\n");
    console.log(`Total ADRs: ${stats.total}\n`);

    console.log("By Status:");
    Object.entries(stats.byStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  ${status.padEnd(15)} ${count}`);
      });

    console.log("\nBy Year:");
    Object.entries(stats.byYear)
      .sort()
      .forEach(([year, count]) => {
        console.log(`  ${year.padEnd(15)} ${count}`);
      });

    console.log("\nTop Tags:");
    Object.entries(stats.byTag)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([tag, count]) => {
        console.log(`  ${tag.padEnd(15)} ${count}`);
      });

    console.log("\n");
  } catch (error) {
    console.error("Error showing stats:", error);
    process.exit(1);
  }
}

// Main execution
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case "list":
    await listADRs();
    break;
  case "new":
    await createNewADR(args.join(" "));
    break;
  case "index":
    await generateIndex();
    break;
  case "stats":
    await showStats();
    break;
  default:
    console.log(`
ADR Management Tool

Commands:
  list              List all ADRs with status
  new "Title"       Create a new ADR
  index             Generate/update INDEX.md
  stats             Show statistics

Examples:
  node scripts/adr-tool.mjs list
  node scripts/adr-tool.mjs new "Use GraphQL for API"
  node scripts/adr-tool.mjs index
  node scripts/adr-tool.mjs stats
`);
    process.exit(1);
}
