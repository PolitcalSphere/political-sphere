// Proxy module to support CommonJS resolution from TypeScript-compiled code in tests
// Exports initializeDatabase and runMigrations from the API root migrations implementation

import { initializeDatabase, runMigrations } from "../migrations.js";

export { initializeDatabase, runMigrations };
