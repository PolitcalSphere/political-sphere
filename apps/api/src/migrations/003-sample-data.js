/**
 * Sample data migration
 * Inserts initial sample data for users, parties, bills, votes, and news
 * Owned by: API Team
 * @see docs/architecture/decisions/adr-0001-database-migrations.md
 */

const { v4: uuidv4 } = require("uuid");

const name = "003_sample_data";

function up(db) {
	console.log("Running sample data migration up function...");

	// Sample users
	const users = [
		{
			id: uuidv4(),
			username: "alice",
			email: "alice@example.com",
		},
		{
			id: uuidv4(),
			username: "bob",
			email: "bob@example.com",
		},
		{
			id: uuidv4(),
			username: "charlie",
			email: "charlie@example.com",
		},
	];

	const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, username, email, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

	users.forEach((user) => {
		insertUser.run(user.id, user.username, user.email);
	});

	// Sample parties
	const parties = [
		{
			id: uuidv4(),
			name: "Green Party",
			description: "Environmental focus",
			color: "#00FF00",
		},
		{
			id: uuidv4(),
			name: "Conservative Party",
			description: "Traditional values",
			color: "#0000FF",
		},
		{
			id: uuidv4(),
			name: "Liberal Party",
			description: "Progressive policies",
			color: "#FF0000",
		},
	];

	const insertParty = db.prepare(`
    INSERT OR IGNORE INTO parties (id, name, description, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

	parties.forEach((party) => {
		insertParty.run(party.id, party.name, party.description, party.color);
	});

	// Sample bills
	const aliceId = users[0].id;
	const bills = [
		{
			id: uuidv4(),
			title: "Climate Change Initiative",
			description: "Reduce carbon emissions by 50% by 2030",
			status: "proposed",
			proposer_id: aliceId,
		},
		{
			id: uuidv4(),
			title: "Economic Reform Bill",
			description: "Tax cuts for small businesses",
			status: "active",
			proposer_id: aliceId,
		},
	];

	const insertBill = db.prepare(`
    INSERT OR IGNORE INTO bills (id, title, description, status, proposer_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

	bills.forEach((bill) => {
		insertBill.run(
			bill.id,
			bill.title,
			bill.description,
			bill.status,
			bill.proposer_id,
		);
	});

	// Sample votes
	const votes = [
		{
			id: uuidv4(),
			bill_id: bills[0].id,
			user_id: users[1].id,
			vote: "yes",
		},
		{
			id: uuidv4(),
			bill_id: bills[1].id,
			user_id: users[2].id,
			vote: "no",
		},
	];

	const insertVote = db.prepare(`
    INSERT OR IGNORE INTO votes (id, bill_id, user_id, vote, created_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

	votes.forEach((vote) => {
		insertVote.run(vote.id, vote.bill_id, vote.user_id, vote.vote);
	});

	// Sample news (assuming news table from news-service; if not, create it)
	db.exec(`
    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      category TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

	const sampleNews = [
		{
			id: uuidv4(),
			title: "New policy on climate change initiatives",
			content: "Government announces new environmental measures.",
			category: "Environment",
			tags: "climate,policy",
		},
		{
			id: uuidv4(),
			title: "Parliamentary approval for major economic reforms",
			content: "Bills passed to stimulate economy.",
			category: "Economy",
			tags: "economy,reform",
		},
	];

	const insertNews = db.prepare(`
    INSERT OR IGNORE INTO news (id, title, content, category, tags, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

	sampleNews.forEach((news) => {
		insertNews.run(news.id, news.title, news.content, news.category, news.tags);
	});

	console.log("Sample data migration up function completed");
}

function down(db) {
	// Remove sample data
	db.exec(`
    DELETE FROM news WHERE id IN (
      SELECT id FROM news WHERE title LIKE '%climate%' OR title LIKE '%economic%'
    );
    DELETE FROM votes WHERE id IN (
      SELECT id FROM votes WHERE vote = 'yes' OR vote = 'no'
    );
    DELETE FROM bills WHERE title IN ('Climate Change Initiative', 'Economic Reform Bill');
    DELETE FROM parties WHERE name IN ('Green Party', 'Conservative Party', 'Liberal Party');
    DELETE FROM users WHERE username IN ('alice', 'bob', 'charlie');
    DROP TABLE IF EXISTS news;
  `);
}

module.exports = {
	name,
	up,
	down,
};
