const path = require("path");
const { DEFAULT_DB_PATH } = require("./config");
const { initializeDatabase, runMigrations } = require("./migrations");

const dbPath = path.join(process.cwd(), DEFAULT_DB_PATH);

async function main() {
    console.log("DB Path:", dbPath);
    try {
        const db = initializeDatabase(dbPath);
        console.log("DB created and opened");

        db.pragma("journal_mode = WAL");
        console.log("Pragma WAL set");

        const stmt = db.prepare("SELECT 1 as test");
        const row = stmt.get();
        console.log("Prepare and query success:", row);

        db.exec("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY)");
        console.log("Exec success");

        console.log("Running migrations...");
        await runMigrations(db);
        console.log("Migrations completed successfully");

        db.close();
        console.log("Test completed successfully");
    } catch (error) {
        console.error("Test failed:", error.message);
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
        process.exitCode = 1;
    }
}

main();
