#!/usr/bin/env node
/**
 * Scenario-Based Seed Data Generator
 *
 * Generates seed data for specific political scenarios:
 * - Coalition government
 * - Hung parliament
 * - Contentious legislation
 * - Emergency voting
 *
 * Usage: npm run seed:scenarios [scenario-name]
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

const OUTPUT_DIR = path.join(__dirname, "..", "data", "seeds", "scenarios");

/**
 * Available scenarios
 */
const SCENARIOS = {
  "coalition-govt": generateCoalitionGovernment,
  "hung-parliament": generateHungParliament,
  "contentious-bill": generateContentiousBill,
  "emergency-vote": generateEmergencyVote,
};

/**
 * Scenario: Coalition Government
 * Two major parties form coalition with slim majority
 */
async function generateCoalitionGovernment() {
  console.log("🤝 Generating Coalition Government scenario...\n");

  const users = [];
  const parties = [];
  const bills = [];
  const votes = [];

  // Create two major coalition parties
  const party1 = PartyFactory.build({
    name: "Progressive Alliance",
    abbreviation: "PA",
    memberCount: 12000,
    isActive: true,
  });
  const party2 = PartyFactory.build({
    name: "Democratic Coalition",
    abbreviation: "DC",
    memberCount: 8000,
    isActive: true,
  });

  // Create opposition party
  const opposition = PartyFactory.build({
    name: "Conservative Party",
    abbreviation: "CON",
    memberCount: 18000,
    isActive: true,
  });

  parties.push(party1, party2, opposition);

  // Create users distributed across parties
  // Coalition parties (combined slight majority: 52%)
  for (let i = 0; i < 35; i++) {
    users.push(UserFactory.build());
  }

  // Opposition (48%)
  for (let i = 0; i < 32; i++) {
    users.push(UserFactory.build());
  }

  // Create coalition agreement bill (passed)
  const coalitionBill = BillFactory.Passed({
    title: "Coalition Government Agreement",
    proposerId: users[0].id,
    votesFor: 35,
    votesAgainst: 32,
    votesAbstain: 0,
  });
  bills.push(coalitionBill);

  // Create contentious policy bill (narrow margin)
  const policyBill = BillFactory.Passed({
    title: "Healthcare Reform Act",
    proposerId: users[1].id,
    votesFor: 36,
    votesAgainst: 29,
    votesAbstain: 2,
  });
  bills.push(policyBill);

  return {
    name: "Coalition Government",
    description: "Two-party coalition with slim majority facing strong opposition",
    users,
    parties,
    bills,
    votes,
  };
}

/**
 * Scenario: Hung Parliament
 * No party has clear majority, multiple small parties hold balance
 */
async function generateHungParliament() {
  console.log("⚖️  Generating Hung Parliament scenario...\n");

  const users = [];
  const parties = [];
  const bills = [];

  // Create multiple parties with fragmented support
  const party1 = PartyFactory.build({
    name: "Labour Party",
    abbreviation: "LAB",
    memberCount: 15000,
  });
  const party2 = PartyFactory.build({
    name: "Conservative Party",
    abbreviation: "CON",
    memberCount: 14500,
  });
  const party3 = PartyFactory.build({
    name: "Liberal Democrats",
    abbreviation: "LD",
    memberCount: 5000,
  });
  const party4 = PartyFactory.build({
    name: "Green Party",
    abbreviation: "GRN",
    memberCount: 3000,
  });
  const party5 = PartyFactory.build({
    name: "Reform Party",
    abbreviation: "REF",
    memberCount: 2500,
  });

  parties.push(party1, party2, party3, party4, party5);

  // Distribute users: LAB 30%, CON 29%, LD 15%, GRN 13%, REF 13%
  for (let i = 0; i < 30; i++) users.push(UserFactory.build());
  for (let i = 0; i < 29; i++) users.push(UserFactory.build());
  for (let i = 0; i < 15; i++) users.push(UserFactory.build());
  for (let i = 0; i < 13; i++) users.push(UserFactory.build());
  for (let i = 0; i < 13; i++) users.push(UserFactory.build());

  // Create bills that fail due to fragmentation
  const failedBill1 = BillFactory.Rejected({
    title: "Electoral Reform Bill",
    proposerId: users[0].id,
    votesFor: 38,
    votesAgainst: 45,
    votesAbstain: 17,
  });

  const failedBill2 = BillFactory.Rejected({
    title: "Budget Proposal",
    proposerId: users[1].id,
    votesFor: 41,
    votesAgainst: 42,
    votesAbstain: 17,
  });

  bills.push(failedBill1, failedBill2);

  return {
    name: "Hung Parliament",
    description: "Fragmented parliament with no clear majority, frequent deadlocks",
    users,
    parties,
    bills,
    votes: [],
  };
}

/**
 * Scenario: Contentious Bill
 * Highly divisive legislation with strong opinions on both sides
 */
async function generateContentiousBill() {
  console.log("⚔️  Generating Contentious Bill scenario...\n");

  const users = [];
  const parties = [];
  const bills = [];
  const votes = [];

  // Standard party setup
  const parties_data = [PartyFactory.Major(), PartyFactory.Major(), PartyFactory.Minor()];
  parties.push(...parties_data);

  // Create diverse user base (100 users)
  for (let i = 0; i < 100; i++) {
    users.push(UserFactory.build());
  }

  // Create highly contentious bill
  const contentiousBill = BillFactory.ActiveVoting({
    title: "Climate Emergency and Economic Transition Act",
    description:
      "Comprehensive climate legislation with significant economic restructuring requirements",
    proposerId: users[0].id,
    votesFor: 0,
    votesAgainst: 0,
    votesAbstain: 0,
  });
  bills.push(contentiousBill);

  // Generate polarized votes (45% for, 45% against, 10% abstain)
  for (let i = 0; i < 45; i++) {
    votes.push(
      VoteFactory.For({
        billId: contentiousBill.id,
        userId: users[i].id,
        reason: "Critical action needed on climate change",
      }),
    );
  }

  for (let i = 45; i < 90; i++) {
    votes.push(
      VoteFactory.Against({
        billId: contentiousBill.id,
        userId: users[i].id,
        reason: "Economic impact too severe",
      }),
    );
  }

  for (let i = 90; i < 100; i++) {
    votes.push(
      VoteFactory.Abstain({
        billId: contentiousBill.id,
        userId: users[i].id,
      }),
    );
  }

  // Update bill vote counts
  contentiousBill.votesFor = 45;
  contentiousBill.votesAgainst = 45;
  contentiousBill.votesAbstain = 10;

  return {
    name: "Contentious Bill",
    description: "Deeply divisive legislation splitting parliament 50-50",
    users,
    parties,
    bills,
    votes,
  };
}

/**
 * Scenario: Emergency Vote
 * Fast-tracked emergency legislation with time pressure
 */
async function generateEmergencyVote() {
  console.log("🚨 Generating Emergency Vote scenario...\n");

  const users = [];
  const parties = [];
  const bills = [];
  const votes = [];

  // Standard setup
  parties.push(PartyFactory.Major(), PartyFactory.Major());
  for (let i = 0; i < 60; i++) {
    users.push(UserFactory.build());
  }

  // Emergency bill with short voting window
  const now = new Date();
  const votingEnds = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  const emergencyBill = BillFactory.ActiveVoting({
    title: "Emergency Powers Act - Public Health Crisis",
    description: "Emergency legislation granting temporary powers to handle immediate crisis",
    proposerId: users[0].id,
    votingStartsAt: now.toISOString(),
    votingEndsAt: votingEnds.toISOString(),
  });
  bills.push(emergencyBill);

  // High participation rate (90%) with strong support (70% for)
  for (let i = 0; i < 38; i++) {
    votes.push(
      VoteFactory.For({
        billId: emergencyBill.id,
        userId: users[i].id,
      }),
    );
  }

  for (let i = 38; i < 54; i++) {
    votes.push(
      VoteFactory.Against({
        billId: emergencyBill.id,
        userId: users[i].id,
      }),
    );
  }

  emergencyBill.votesFor = 38;
  emergencyBill.votesAgainst = 16;
  emergencyBill.votesAbstain = 0;

  return {
    name: "Emergency Vote",
    description: "Fast-tracked emergency legislation with 24-hour voting window",
    users,
    parties,
    bills,
    votes,
  };
}

/**
 * Save scenario data
 */
async function saveScenario(scenarioName, data) {
  const scenarioDir = path.join(OUTPUT_DIR, scenarioName);
  await fs.mkdir(scenarioDir, { recursive: true });

  await fs.writeFile(path.join(scenarioDir, "users.json"), JSON.stringify(data.users, null, 2));

  await fs.writeFile(path.join(scenarioDir, "parties.json"), JSON.stringify(data.parties, null, 2));

  await fs.writeFile(path.join(scenarioDir, "bills.json"), JSON.stringify(data.bills, null, 2));

  await fs.writeFile(path.join(scenarioDir, "votes.json"), JSON.stringify(data.votes, null, 2));

  const metadata = {
    name: data.name,
    description: data.description,
    generated: new Date().toISOString(),
    counts: {
      users: data.users.length,
      parties: data.parties.length,
      bills: data.bills.length,
      votes: data.votes.length,
    },
  };

  await fs.writeFile(path.join(scenarioDir, "_metadata.json"), JSON.stringify(metadata, null, 2));

  console.log(`✅ Scenario saved to: ${scenarioDir}\n`);
  console.log(`📊 Generated:`);
  console.log(`   Users:   ${metadata.counts.users}`);
  console.log(`   Parties: ${metadata.counts.parties}`);
  console.log(`   Bills:   ${metadata.counts.bills}`);
  console.log(`   Votes:   ${metadata.counts.votes}\n`);
}

/**
 * Main execution
 */
async function main() {
  const scenarioName = process.argv[2];

  if (!scenarioName || !SCENARIOS[scenarioName]) {
    console.log(`
Scenario-Based Seed Generator

Available scenarios:
  coalition-govt    - Two-party coalition with slim majority
  hung-parliament   - Fragmented parliament, no clear majority
  contentious-bill  - Highly divisive 50-50 split legislation
  emergency-vote    - Fast-tracked emergency legislation

Usage:
  npm run seed:scenarios <scenario-name>

Examples:
  npm run seed:scenarios coalition-govt
  npm run seed:scenarios contentious-bill
`);
    process.exit(1);
  }

  const generator = SCENARIOS[scenarioName];
  const data = await generator();
  await saveScenario(scenarioName, data);

  console.log("✨ Scenario generation complete!\n");
}

main().catch((error) => {
  console.error("❌ Error generating scenario:", error);
  process.exit(1);
});
