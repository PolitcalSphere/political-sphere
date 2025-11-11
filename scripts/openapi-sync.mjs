#!/usr/bin/env node
/**
 * OpenAPI Schema Synchronizer
 *
 * Syncs JSON Schema files with OpenAPI specification
 * Validates OpenAPI spec for completeness and correctness
 *
 * Usage: npm run openapi:sync
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSON_SCHEMA_DIR = path.join(__dirname, "..", "schemas", "json-schema");
const OPENAPI_FILE = path.join(__dirname, "..", "apps", "api", "openapi", "api.yaml");
const OPENAPI_SCHEMAS_DIR = path.join(__dirname, "..", "apps", "api", "openapi", "schemas");

/**
 * Convert JSON Schema to OpenAPI 3.1 compatible schema
 */
function convertToOpenAPISchema(jsonSchema) {
  const openApiSchema = { ...jsonSchema };

  // Remove JSON Schema specific fields not in OpenAPI
  delete openApiSchema.$schema;
  delete openApiSchema.$id;

  // OpenAPI 3.1 uses 'examples' array instead of single example
  if (openApiSchema.example) {
    openApiSchema.examples = [openApiSchema.example];
    delete openApiSchema.example;
  }

  return openApiSchema;
}

/**
 * Sync JSON Schemas to OpenAPI
 */
async function syncSchemas() {
  console.log("📋 Syncing JSON Schemas to OpenAPI specification...\n");

  try {
    // Read all JSON Schema files
    const schemaFiles = await fs.readdir(JSON_SCHEMA_DIR);
    const jsonSchemas = schemaFiles.filter((f) => f.endsWith(".schema.json"));

    console.log(`Found ${jsonSchemas.length} JSON Schema files:\n`);

    for (const schemaFile of jsonSchemas) {
      const schemaPath = path.join(JSON_SCHEMA_DIR, schemaFile);
      const schemaContent = await fs.readFile(schemaPath, "utf-8");
      const jsonSchema = JSON.parse(schemaContent);

      // Convert to OpenAPI compatible schema
      const openApiSchema = convertToOpenAPISchema(jsonSchema);

      // Determine target directory
      const entityName = schemaFile.replace(".schema.json", "");
      const targetDir = path.join(OPENAPI_SCHEMAS_DIR, `${entityName}s`);

      await fs.mkdir(targetDir, { recursive: true });

      // Write OpenAPI schema
      const targetFile = path.join(targetDir, `${entityName}.yaml`);
      const yamlContent = yaml.dump(openApiSchema, {
        indent: 2,
        lineWidth: 100,
        noRefs: true,
      });

      await fs.writeFile(targetFile, yamlContent);

      console.log(`  ✅ ${schemaFile} → openapi/schemas/${entityName}s/${entityName}.yaml`);
    }

    console.log("\n✨ Schema sync complete!\n");
  } catch (error) {
    console.error("❌ Error syncing schemas:", error);
    process.exit(1);
  }
}

/**
 * Validate OpenAPI specification
 */
async function validateOpenAPI() {
  console.log("🔍 Validating OpenAPI specification...\n");

  try {
    const content = await fs.readFile(OPENAPI_FILE, "utf-8");
    const spec = yaml.load(content);

    const issues = [];

    // Check for required fields
    if (!spec.openapi) issues.push("Missing openapi version");
    if (!spec.info) issues.push("Missing info section");
    if (!spec.paths) issues.push("Missing paths section");

    // Check info completeness
    if (spec.info) {
      if (!spec.info.title) issues.push("Missing info.title");
      if (!spec.info.version) issues.push("Missing info.version");
      if (!spec.info.description) issues.push("Missing info.description");
    }

    // Check paths
    if (spec.paths) {
      const pathCount = Object.keys(spec.paths).length;
      console.log(`📊 Found ${pathCount} API paths\n`);

      let operationCount = 0;
      let missingSchemas = 0;
      let missingDescriptions = 0;

      for (const [path, pathItem] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (["get", "post", "put", "patch", "delete"].includes(method)) {
            operationCount++;

            // Check for description
            if (!operation.description && !operation.summary) {
              missingDescriptions++;
              issues.push(`${method.toUpperCase()} ${path} missing description`);
            }

            // Check for request body schema (POST, PUT, PATCH)
            if (["post", "put", "patch"].includes(method)) {
              if (!operation.requestBody?.content?.["application/json"]?.schema) {
                missingSchemas++;
                issues.push(`${method.toUpperCase()} ${path} missing request body schema`);
              }
            }

            // Check for response schemas
            if (operation.responses) {
              for (const [statusCode, response] of Object.entries(operation.responses)) {
                if (statusCode.startsWith("2")) {
                  if (!response.content?.["application/json"]?.schema) {
                    // 204 No Content is allowed without schema
                    if (statusCode !== "204") {
                      missingSchemas++;
                      issues.push(
                        `${method.toUpperCase()} ${path} ${statusCode} response missing schema`,
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }

      console.log(`   Operations: ${operationCount}`);
      console.log(`   Missing descriptions: ${missingDescriptions}`);
      console.log(`   Missing schemas: ${missingSchemas}\n`);
    }

    // Check components
    if (spec.components) {
      const schemaCount = spec.components.schemas ? Object.keys(spec.components.schemas).length : 0;
      const securityCount = spec.components.securitySchemes
        ? Object.keys(spec.components.securitySchemes).length
        : 0;

      console.log(`📦 Components:`);
      console.log(`   Schemas: ${schemaCount}`);
      console.log(`   Security schemes: ${securityCount}\n`);
    }

    if (issues.length > 0) {
      console.log(`⚠️  Found ${issues.length} issues:\n`);
      issues.slice(0, 10).forEach((issue) => {
        console.log(`   • ${issue}`);
      });
      if (issues.length > 10) {
        console.log(`   ... and ${issues.length - 10} more\n`);
      }
      return false;
    } else {
      console.log("✅ OpenAPI specification is valid!\n");
      return true;
    }
  } catch (error) {
    console.error("❌ Error validating OpenAPI:", error);
    process.exit(1);
  }
}

/**
 * Generate statistics
 */
async function generateStats() {
  console.log("📊 OpenAPI Specification Statistics\n");

  try {
    const content = await fs.readFile(OPENAPI_FILE, "utf-8");
    const spec = yaml.load(content);

    const stats = {
      version: spec.openapi,
      apiVersion: spec.info?.version,
      paths: 0,
      operations: 0,
      schemas: 0,
      byMethod: {},
      byTag: {},
    };

    if (spec.paths) {
      stats.paths = Object.keys(spec.paths).length;

      for (const pathItem of Object.values(spec.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (["get", "post", "put", "patch", "delete"].includes(method)) {
            stats.operations++;
            stats.byMethod[method] = (stats.byMethod[method] || 0) + 1;

            if (operation.tags) {
              operation.tags.forEach((tag) => {
                stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
              });
            }
          }
        }
      }
    }

    if (spec.components?.schemas) {
      stats.schemas = Object.keys(spec.components.schemas).length;
    }

    console.log(`OpenAPI Version: ${stats.version}`);
    console.log(`API Version: ${stats.apiVersion}`);
    console.log(`Total Paths: ${stats.paths}`);
    console.log(`Total Operations: ${stats.operations}`);
    console.log(`Total Schemas: ${stats.schemas}\n`);

    console.log("Operations by Method:");
    Object.entries(stats.byMethod)
      .sort((a, b) => b[1] - a[1])
      .forEach(([method, count]) => {
        console.log(`  ${method.toUpperCase().padEnd(8)} ${count}`);
      });

    console.log("\nOperations by Tag:");
    Object.entries(stats.byTag)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([tag, count]) => {
        console.log(`  ${tag.padEnd(20)} ${count}`);
      });

    console.log("\n");
  } catch (error) {
    console.error("❌ Error generating stats:", error);
    process.exit(1);
  }
}

// Main execution
const command = process.argv[2];

switch (command) {
  case "sync":
    await syncSchemas();
    break;
  case "validate":
    await validateOpenAPI();
    break;
  case "stats":
    await generateStats();
    break;
  default:
    console.log(`
OpenAPI Schema Synchronizer

Commands:
  sync      - Sync JSON Schemas to OpenAPI specification
  validate  - Validate OpenAPI spec completeness
  stats     - Show OpenAPI specification statistics

Usage:
  node scripts/openapi-sync.mjs <command>

Examples:
  npm run openapi:sync
  npm run openapi:validate
  npm run openapi:stats
`);
    process.exit(1);
}
