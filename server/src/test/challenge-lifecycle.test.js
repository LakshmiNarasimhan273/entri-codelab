const assert = require('assert');
const { connectDB } = require('../config/db');
const challengeService = require('../services/challenge.service');
const challengeRepository = require('../repositories/challenge.repository');
const seedData = require('../scripts/seed');
const logger = require('../utils/logger');

async function verifyChallengeLifecycle() {
  logger.info('=============================================');
  logger.info(' Verifying Complete Challenge Lifecycle Test');
  logger.info('=============================================');

  // 1. Seed database
  await seedData();

  // 2. Query initial challenges (should be at least 2 from seed)
  const initialList = await challengeService.getAllChallenges();
  logger.info(`Initial challenges loaded: ${initialList.length}`);
  assert(initialList.length >= 2, 'Initial challenges should be loaded');

  // 3. Create a brand new challenge
  const customTestCases = `describe('Custom Test Suite', () => {
  test('TC01: Validates custom input', () => {
    expect(1 + 1).toBe(2);
  });
});`;

  logger.info('Creating new challenge with custom description and Jest test cases...');
  const newChallenge = await challengeService.createChallenge('mentor-test-id', {
    title: 'Custom Inverted Binary Tree Challenge',
    description: 'Given the root of a binary tree, invert the tree and return its root.',
    stack: 'JS',
    difficulty: 'HARD',
    durationMinutes: 75,
    testCases: customTestCases
  });

  const newId = newChallenge.id || newChallenge._id;
  assert(newId, 'Challenge should have an ID');
  assert.strictEqual(newChallenge.isPublished, true, 'Challenge should be published by default');
  logger.info(`[PASS] Challenge created with ID: ${newId}`);

  // 4. Verify test cases were synced into the scaffolding file tree
  const testFileInScaffold = newChallenge.scaffoldingTree
    .find(n => n.name === '__tests__')?.children
    ?.find(c => c.name.includes('.test.'));
  assert(testFileInScaffold, 'Test file should exist in scaffolding tree');
  assert.strictEqual(testFileInScaffold.content, customTestCases, 'Scaffolding test file content must match custom test cases');
  logger.info('[PASS] Test cases accurately synchronized into scaffolding tree.');

  // 5. Query getAllChallenges (what Learner & Mentor see)
  const updatedList = await challengeService.getAllChallenges();
  logger.info(`Updated challenges count: ${updatedList.length}`);
  assert.strictEqual(updatedList.length, initialList.length + 1, 'Challenges count must increase by 1');

  const found = updatedList.find(c => (c.id || c._id) === newId);
  assert(found, 'New challenge must be returned in getAllChallenges()');
  assert.strictEqual(found.title, 'Custom Inverted Binary Tree Challenge');
  logger.info('[PASS] Newly created challenge is immediately returned to Learner & Mentor catalogs!');

  // 6. Query getChallengeById
  const single = await challengeService.getChallengeById(newId);
  assert(single, 'Single challenge should be retrievable by ID');
  assert.strictEqual(single.testCases, customTestCases);
  logger.info('[PASS] Single challenge retrieval verified.');

  // 7. Delete Challenge
  logger.info('Testing challenge deletion...');
  await challengeService.deleteChallenge(newId);
  const finalList = await challengeService.getAllChallenges();
  assert.strictEqual(finalList.length, initialList.length, 'Count must revert after deletion');
  const foundAfterDel = finalList.find(c => (c.id || c._id) === newId);
  assert(!foundAfterDel, 'Deleted challenge must no longer appear');
  logger.info('[PASS] Challenge deletion and cache invalidation verified.');

  logger.info('=============================================');
  logger.info(' ALL CHALLENGE LIFECYCLE TESTS PASSED (100%)');
  logger.info('=============================================');
}

verifyChallengeLifecycle().then(() => {
  process.exit(0);
}).catch(err => {
  logger.error('Challenge Lifecycle Test Failed:', err);
  process.exit(1);
});

