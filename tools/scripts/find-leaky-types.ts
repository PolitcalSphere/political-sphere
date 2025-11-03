#!/usr/bin/env tsx
/*
  Find potentially leaky type exports
  Usage: tsx scripts/find-leaky-types.ts
*/

import { readdirSync, readFileSync } from "fs";
import { join, extname } from "path";

const SUPPORTED_EXTS = [".ts", ".tsx"];

function findLeakyTypes(dir: string): void {
  const files = readdirSync(dir, { recursive: true });

  for (const file of files) {
    if (typeof file === "string" && SUPPORTED_EXTS.includes(extname(file))) {
      const fullPath = join(dir, file);
      const content = readFileSync(fullPath, "utf8");

      // Check for 'any' types
      const anyMatches = content.match(/\bany\b/g);
      if (anyMatches && anyMatches.length > 0) {
        console.log(`${fullPath}: ${anyMatches.length} 'any' types found`);
      }

      // Check for implicit any in function parameters
      const implicitAnyMatches = content.match(/\(.*:.*\)/g);
      if (implicitAnyMatches) {
        for (const match of implicitAnyMatches) {
          if (match.includes(": any") || (!match.includes(":") && match.includes("("))) {
            console.log(`${fullPath}: Potential implicit any in function signature`);
            break;
          }
        }
      }
    }
  }
}

findLeakyTypes("./libs");
findLeakyTypes("./apps");
