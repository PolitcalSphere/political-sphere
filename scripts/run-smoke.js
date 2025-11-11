// Minimal runner to execute the smoke module without Vitest
import { smoke } from "../apps/api/src/coverage-smoke.js";
console.log("smoke returned", smoke());
