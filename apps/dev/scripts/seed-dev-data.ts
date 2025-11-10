/**
 * Seed Development Data
 *
 * Populates the development database with realistic test data for local development.
 * This includes users, political entities, proposals, votes, and other game state.
 *
 * @module scripts/seed-dev-data
 */

import { DatabaseConnector } from "../../../data/src/connectors/database-connector.js";

interface SeedConfig {
  users?: number;
  proposals?: number;
  parties?: number;
  constituencies?: number;
}

/**
 * Default seed data configuration
 */
const DEFAULT_CONFIG: SeedConfig = {
  users: 50,
  proposals: 20,
  parties: 8,
  constituencies: 10,
};

/**
 * Seed the development database with test data
 */
async function seedDevData(config: SeedConfig = DEFAULT_CONFIG): Promise<void> {
  console.log("🌱 Seeding development database...");
  console.log("Configuration:", config);

  const db = new DatabaseConnector({
    host: process.env.DB_HOST || "localhost",
    port: Number.parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME || "political_sphere_dev",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
  });

  try {
    await db.connect();
    console.log("✓ Connected to database");

    // Seed users
    if (config.users && config.users > 0) {
      await seedUsers(db, config.users);
    }

    // Seed political parties
    if (config.parties && config.parties > 0) {
      await seedParties(db, config.parties);
    }

    // Seed constituencies
    if (config.constituencies && config.constituencies > 0) {
      await seedConstituencies(db, config.constituencies);
    }

    // Seed proposals
    if (config.proposals && config.proposals > 0) {
      await seedProposals(db, config.proposals);
    }

    console.log("✓ Database seeding completed successfully");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await db.disconnect();
  }
}

/**
 * Seed user accounts
 */
async function seedUsers(db: DatabaseConnector, count: number): Promise<void> {
  console.log(`  → Seeding ${count} users...`);

  const firstNames = [
    "Alice",
    "Bob",
    "Charlie",
    "Diana",
    "Eve",
    "Frank",
    "Grace",
    "Henry",
    "Iris",
    "Jack",
  ];
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Miller",
    "Davis",
    "Garcia",
    "Rodriguez",
    "Wilson",
  ];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;

    await db.query(
      `INSERT INTO users (email, username, first_name, last_name, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [email, `${firstName}${lastName}${i}`, firstName, lastName, new Date()],
    );
  }

  console.log(`  ✓ Seeded ${count} users`);
}

/**
 * Seed political parties
 */
async function seedParties(db: DatabaseConnector, count: number): Promise<void> {
  console.log(`  → Seeding ${count} political parties...`);

  const partyNames = [
    "Progressive Party",
    "Conservative Alliance",
    "Liberal Democrats",
    "Green Coalition",
    "Socialist Workers",
    "Centrist Union",
    "National Party",
    "Reform Movement",
    "Democratic Front",
    "People's Choice",
  ];

  const ideologies = ["left", "center-left", "center", "center-right", "right"];

  for (let i = 0; i < Math.min(count, partyNames.length); i++) {
    await db.query(
      `INSERT INTO parties (name, ideology, description, founded_date, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (name) DO NOTHING`,
      [
        partyNames[i],
        ideologies[i % ideologies.length],
        `A ${ideologies[i % ideologies.length]} political party focused on democratic governance.`,
        new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        new Date(),
      ],
    );
  }

  console.log(`  ✓ Seeded ${Math.min(count, partyNames.length)} parties`);
}

/**
 * Seed constituencies
 */
async function seedConstituencies(db: DatabaseConnector, count: number): Promise<void> {
  console.log(`  → Seeding ${count} constituencies...`);

  const regions = ["North", "South", "East", "West", "Central"];
  const prefixes = ["Greater", "New", "Old", "Upper", "Lower"];
  const suffixes = ["shire", "ton", "ville", "ford", "bridge"];

  for (let i = 0; i < count; i++) {
    const name = `${prefixes[i % prefixes.length]} ${
      regions[i % regions.length]
    }${suffixes[i % suffixes.length]}`;
    const population = Math.floor(50000 + Math.random() * 150000);

    await db.query(
      `INSERT INTO constituencies (name, region, population, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO NOTHING`,
      [name, regions[i % regions.length], population, new Date()],
    );
  }

  console.log(`  ✓ Seeded ${count} constituencies`);
}

/**
 * Seed legislative proposals
 */
async function seedProposals(db: DatabaseConnector, count: number): Promise<void> {
  console.log(`  → Seeding ${count} proposals...`);

  const topics = [
    "Healthcare Reform",
    "Education Funding",
    "Climate Action",
    "Tax Policy",
    "Infrastructure Development",
    "Social Security",
    "Immigration Policy",
    "Defense Spending",
    "Housing Affordability",
    "Digital Rights",
  ];

  const statuses = ["draft", "proposed", "debate", "voting", "passed", "rejected"];

  for (let i = 0; i < count; i++) {
    const topic = topics[i % topics.length];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    await db.query(
      `INSERT INTO proposals (title, description, status, category, proposed_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        `${topic} Act ${2025 + i}`,
        `A comprehensive proposal to address ${topic.toLowerCase()} in the United Kingdom.`,
        status,
        topics[i % topics.length].split(" ")[0].toLowerCase(),
        new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        new Date(),
      ],
    );
  }

  console.log(`  ✓ Seeded ${count} proposals`);
}

/**
 * Parse command-line arguments
 */
function parseArgs(): SeedConfig {
  const args = process.argv.slice(2);
  const config: SeedConfig = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, "") as keyof SeedConfig;
    const value = Number.parseInt(args[i + 1] || "0", 10);

    if (key in config) {
      config[key] = value;
    }
  }

  return config;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs();

  seedDevData(config)
    .then(() => {
      console.log("✅ Seeding complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}

export { seedDevData };
