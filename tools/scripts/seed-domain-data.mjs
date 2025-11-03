import { getDatabase } from '../apps/api/src/stores';

async function seedDemoData() {
  const db = getDatabase();

  console.log('Seeding demo data...');

  // Create demo users
  const user1 = db.users.create({
    username: 'alice',
    email: 'alice@example.com',
  });
  console.log('Created user:', user1);

  const user2 = db.users.create({
    username: 'bob',
    email: 'bob@example.com',
  });
  console.log('Created user:', user2);

  // Create demo parties
  const party1 = db.parties.create({
    name: 'Progressive Party',
    description: 'A party focused on social progress and equality',
    color: '#FF6B6B',
  });
  console.log('Created party:', party1);

  const party2 = db.parties.create({
    name: 'Conservative Alliance',
    description: 'Traditional values and economic responsibility',
    color: '#4ECDC4',
  });
  console.log('Created party:', party2);

  // Create demo bill
  const bill1 = db.bills.create({
    title: 'Environmental Protection Act',
    description: 'A comprehensive bill to protect our environment and reduce carbon emissions',
    proposerId: user1.id,
  });
  console.log('Created bill:', bill1);

  // Cast some votes
  const vote1 = db.votes.create({
    billId: bill1.id,
    userId: user1.id,
    vote: 'aye',
  });
  console.log('Created vote:', vote1);

  const vote2 = db.votes.create({
    billId: bill1.id,
    userId: user2.id,
    vote: 'nay',
  });
  console.log('Created vote:', vote2);

  console.log('Demo data seeded successfully!');
  console.log('Demo flow:');
  console.log('1. User alice created');
  console.log('2. User bob created');
  console.log('3. Progressive Party created');
  console.log('4. Conservative Alliance created');
  console.log('5. Environmental Protection Act proposed by alice');
  console.log('6. alice voted aye');
  console.log('7. bob voted nay');

  db.close();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemoData().catch(console.error);
}

export { seedDemoData };
