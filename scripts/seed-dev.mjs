#!/usr/bin/env node
/**
 * Seed Data Generator for Development Environment
 *
 * Generates realistic, comprehensive seed data for local development
 * using test factories to ensure consistency.
 *
 * Usage: npm run seed:dev
 */

import { UserFactory } from "../libs/testing/factories/user.factory.js";
import { PartyFactory } from "../libs/testing/factories/party.factory.js";
import { BillFactory } from "../libs/testing/factories/bill.factory.js";
import { VoteFactory } from "../libs/testing/factories/vote.factory.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, "..", "data", "seeds", "development");

/**
 * Seed Configuration
 */
const SEED_CONFIG = {
  users: {
    admins: 2,
    moderators: 5,
    active: 100,
    inactive: 20,
  },
  parties: {
    major: 3,
    minor: 5,
    inactive: 2,
  },
  bills: {
    draft: 10,
    proposed: 5,
    activeVoting: 8,
    passed: 25,
    rejected: 15,
    withdrawn: 5,
  },
  votesPerBill: {
    min: 20,
    max: 80,
  },
};

/**
 * Generate all seed data
 */
async function generateSeeds() {
  console.log("🌱 Generating seed data for development environment...\n");

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Generate Users
  console.log("👥 Generating users...");
  const users = await generateUsers();
  await saveSeed("users", users);
  console.log(`   ✅ ${users.length} users created`);

  // Generate Parties
  console.log("🏛️  Generating political parties...");
  const parties = await generateParties();
  await saveSeed("parties", parties);
  console.log(`   ✅ ${parties.length} parties created`);

  // Generate Bills
  console.log("📜 Generating legislative bills...");
  const bills = await generateBills(users);
  await saveSeed("bills", bills);
  console.log(`   ✅ ${bills.length} bills created`);

  // Generate Votes
  console.log("🗳️  Generating votes...");
  const votes = await generateVotes(users, bills);
  await saveSeed("votes", votes);
  console.log(`   ✅ ${votes.length} votes created`);

  // Generate summary
  const summary = {
    generated: new Date().toISOString(),
    counts: {
      users: users.length,
      parties: parties.length,
      bills: bills.length,
      votes: votes.length,
    },
    breakdown: {
      users: getUserBreakdown(users),
      parties: getPartyBreakdown(parties),
      bills: getBillBreakdown(bills),
    },
  };

  await saveSeed("_summary", summary);

  console.log("\n✨ Seed data generation complete!\n");
  console.log("📊 Summary:");
  console.log(`   Users:   ${summary.counts.users}`);
  console.log(`   Parties: ${summary.counts.parties}`);
  console.log(`   Bills:   ${summary.counts.bills}`);
  console.log(`   Votes:   ${summary.counts.votes}`);
  console.log(`\n📁 Output: ${OUTPUT_DIR}\n`);
}

/**
 * Generate users with various roles and states
 */
async function generateUsers() {
  const users = [];

  // Admins
  for (let i = 0; i < SEED_CONFIG.users.admins; i++) {
    users.push(UserFactory.Admin());
  }

  // Moderators
  for (let i = 0; i < SEED_CONFIG.users.moderators; i++) {
    users.push(UserFactory.Moderator());
  }

  // Active users
  for (let i = 0; i < SEED_CONFIG.users.active; i++) {
    users.push(UserFactory.build());
  }

  // Inactive users
  for (let i = 0; i < SEED_CONFIG.users.inactive; i++) {
    users.push(UserFactory.Inactive());
  }

  return users;
}

/**
 * Generate political parties
 */
async function generateParties() {
  const parties = [];

  // Major parties
  for (let i = 0; i < SEED_CONFIG.parties.major; i++) {
    parties.push(PartyFactory.Major());
  }

  // Minor parties
  for (let i = 0; i < SEED_CONFIG.parties.minor; i++) {
    parties.push(PartyFactory.Minor());
  }

  // Inactive parties
  for (let i = 0; i < SEED_CONFIG.parties.inactive; i++) {
    parties.push(PartyFactory.Inactive());
  }

  return parties;
}

/**
 * Generate legislative bills in various states
 */
async function generateBills(users) {
  const bills = [];
  const activeUsers = users.filter((u) => u.isActive);

  // Draft bills
  for (let i = 0; i < SEED_CONFIG.bills.draft; i++) {
    const proposer = activeUsers[Math.floor(Math.random() * activeUsers.length)];
    bills.push(BillFactory.Draft({ proposerId: proposer.id }));
  }

  // Proposed bills
  for (let i = 0; i < SEED_CONFIG.bills.proposed; i++) {
    const proposer = activeUsers[Math.floor(Math.random() * activeUsers.length)];
    bills.push(
      BillFactory.build({
        proposerId: proposer.id,
        status: "proposed",
      }),
    );
  }

  // Active voting bills
  for (let i = 0; i < SEED_CONFIG.bills.activeVoting; i++) {
    const proposer = activeUsers[Math.floor(Math.random() * activeUsers.length)];
    bills.push(BillFactory.ActiveVoting({ proposerId: proposer.id }));
  }

  // Passed bills
  for (let i = 0; i < SEED_CONFIG.bills.passed; i++) {
    const proposer = activeUsers[Math.floor(Math.random() * activeUsers.length)];
    bills.push(BillFactory.Passed({ proposerId: proposer.id }));
  }

  // Rejected bills
  for (let i = 0; i < SEED_CONFIG.bills.rejected; i++) {
    const proposer = activeUsers[Math.floor(Math.random() * activeUsers.length)];
    bills.push(BillFactory.Rejected({ proposerId: proposer.id }));
  }

  // Withdrawn bills
  for (let i = 0; i < SEED_CONFIG.bills.withdrawn; i++) {
    const proposer = activeUsers[Math.floor(Math.random() * activeUsers.length)];
    bills.push(
      BillFactory.build({
        proposerId: proposer.id,
        status: "withdrawn",
      }),
    );
  }

  return bills;
}

/**
 * Generate votes on bills
 */
async function generateVotes(users, bills) {
  const votes = [];
  const activeUsers = users.filter((u) => u.isActive);

  // Only generate votes for bills that have voting
  const votableBills = bills.filter((b) =>
    ["active_voting", "passed", "rejected"].includes(b.status),
  );

  for (const bill of votableBills) {
    const voteCount = Math.floor(
      Math.random() * (SEED_CONFIG.votesPerBill.max - SEED_CONFIG.votesPerBill.min) +
        SEED_CONFIG.votesPerBill.min,
    );

    // Randomly select users to vote
    const shuffled = [...activeUsers].sort(() => 0.5 - Math.random());
    const voters = shuffled.slice(0, voteCount);

    for (const voter of voters) {
      // Random vote position with weighted distribution
      const rand = Math.random();
      let position;
      if (rand < 0.5) {
        position = "for";
      } else if (rand < 0.85) {
        position = "against";
      } else {
        position = "abstain";
      }

      const voteFactory = {
        for: VoteFactory.For,
        against: VoteFactory.Against,
        abstain: VoteFactory.Abstain,
      }[position];

      votes.push(
        voteFactory({
          billId: bill.id,
          userId: voter.id,
        }),
      );
    }
  }

  return votes;
}

/**
 * Save seed data to JSON file
 */
async function saveSeed(name, data) {
  const filepath = path.join(OUTPUT_DIR, `${name}.json`);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
}

/**
 * Get user breakdown by role
 */
function getUserBreakdown(users) {
  return {
    admin: users.filter((u) => u.role === "admin").length,
    moderator: users.filter((u) => u.role === "moderator").length,
    user: users.filter((u) => u.role === "user").length,
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
  };
}

/**
 * Get party breakdown by size
 */
function getPartyBreakdown(parties) {
  return {
    active: parties.filter((p) => p.isActive).length,
    inactive: parties.filter((p) => !p.isActive).length,
    major: parties.filter((p) => p.memberCount >= 10000).length,
    minor: parties.filter((p) => p.memberCount < 10000 && p.memberCount > 0).length,
  };
}

/**
 * Get bill breakdown by status
 */
function getBillBreakdown(bills) {
  const breakdown = {};
  bills.forEach((bill) => {
    breakdown[bill.status] = (breakdown[bill.status] || 0) + 1;
  });
  return breakdown;
}

// Execute
generateSeeds().catch((error) => {
  console.error("❌ Error generating seeds:", error);
  process.exit(1);
});
