/**
 * Performance optimization migration
 * Adds indexes for slow queries and optimizes database performance
 * Owned by: API Team
 * @see docs/architecture/decisions/adr-0001-database-migrations.md
 */

const name = "002_performance_indexes";

function up(db) {
	console.log("Running performance optimization migration up function...");

	db.exec(`
    -- Composite indexes for vote queries
    CREATE INDEX IF NOT EXISTS idx_votes_bill_user ON votes(bill_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_votes_user_created ON votes(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_votes_bill_created ON votes(bill_id, created_at DESC);

    -- Composite indexes for bill queries
    CREATE INDEX IF NOT EXISTS idx_bills_proposer_status ON bills(proposer_id, status);
    CREATE INDEX IF NOT EXISTS idx_bills_status_created ON bills(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bills_proposer_created ON bills(proposer_id, created_at DESC);

    -- Covering indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_bills_status_title ON bills(status, title) WHERE status IN ('proposed', 'active', 'passed', 'failed');
    CREATE INDEX IF NOT EXISTS idx_votes_bill_vote_count ON votes(bill_id, vote);

    -- Time-based indexes for analytics
    CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

  -- Partial indexes for active data
  CREATE INDEX IF NOT EXISTS idx_bills_active ON bills(status) WHERE status IN ('proposed', 'active');
  -- Avoid non-deterministic functions in index definitions (SQLite rejects datetime() in index)
  -- Create a plain index on created_at for recent queries instead
  CREATE INDEX IF NOT EXISTS idx_votes_recent ON votes(created_at);
  `);

	console.log("Performance optimization migration up function completed");
}

function down(db) {
	db.exec(`
    DROP INDEX IF EXISTS idx_votes_recent;
    DROP INDEX IF EXISTS idx_bills_active;
    DROP INDEX IF EXISTS idx_users_created_at;
    DROP INDEX IF EXISTS idx_votes_created_at;
    DROP INDEX IF EXISTS idx_bills_created_at;
    DROP INDEX IF EXISTS idx_votes_bill_vote_count;
    DROP INDEX IF EXISTS idx_bills_status_title;
    DROP INDEX IF EXISTS idx_bills_proposer_created;
    DROP INDEX IF EXISTS idx_bills_status_created;
    DROP INDEX IF EXISTS idx_bills_proposer_status;
    DROP INDEX IF EXISTS idx_votes_bill_created;
    DROP INDEX IF EXISTS idx_votes_user_created;
    DROP INDEX IF EXISTS idx_votes_bill_user;
  `);
}

export { name, up, down };
