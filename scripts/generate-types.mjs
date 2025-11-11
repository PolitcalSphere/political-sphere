#!/usr/bin/env node
/**
 * Generate TypeScript types from JSON Schema files
 *
 * This script converts JSON Schema files in schemas/json-schema/
 * to TypeScript interfaces in libs/shared/types/generated/
 *
 * Usage: npm run schemas:generate
 */

import { compile } from "json-schema-to-typescript";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_DIR = path.join(__dirname, "..", "schemas", "json-schema");
const OUTPUT_DIR = path.join(__dirname, "..", "libs", "shared", "types", "generated");

async function generateTypes() {
  console.log("📋 Generating TypeScript types from JSON Schemas...\n");

  try {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Read all schema files
    const schemaFiles = await fs.readdir(SCHEMA_DIR);
    const jsonSchemas = schemaFiles.filter((file) => file.endsWith(".schema.json"));

    console.log(`Found ${jsonSchemas.length} schema files:\n`);

    for (const schemaFile of jsonSchemas) {
      const schemaPath = path.join(SCHEMA_DIR, schemaFile);
      const schemaContent = await fs.readFile(schemaPath, "utf-8");
      const schema = JSON.parse(schemaContent);

      // Generate TypeScript types
      const ts = await compile(schema, schema.title || "UnknownType", {
        bannerComment: `/* eslint-disable */
/**
 * This file was automatically generated from ${schemaFile}.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSON Schema file,
 * and run \`npm run schemas:generate\` to regenerate this file.
 */`,
        style: {
          singleQuote: true,
          semi: true,
        },
      });

      // Write TypeScript file
      const outputFile = schemaFile.replace(".schema.json", ".generated.ts");
      const outputPath = path.join(OUTPUT_DIR, outputFile);
      await fs.writeFile(outputPath, ts);

      console.log(`  ✅ ${schemaFile} → ${outputFile}`);
    }

    // Generate index file
    const indexContent = `${jsonSchemas
      .map((file) => {
        const fileName = file.replace(".schema.json", ".generated");
        return `export * from './${fileName}';`;
      })
      .join("\n")}\n`;

    await fs.writeFile(path.join(OUTPUT_DIR, "index.ts"), indexContent);
    console.log(`\n  ✅ index.ts (exports)\n`);

    console.log("✨ Type generation complete!\n");
    console.log(`📁 Generated types location: ${OUTPUT_DIR}\n`);
  } catch (error) {
    console.error("❌ Error generating types:", error);
    process.exit(1);
  }
}

generateTypes();
