const assert = require('assert');
const { connectDB } = require('../config/db');
const challengeService = require('../services/challenge.service');
const submissionService = require('../services/submission.service');
const submissionRepository = require('../repositories/submission.repository');
const IsolatedProcessDriver = require('../execution/isolatedProcessDriver');
const { STACK_TYPES, EXECUTION_CONTEXTS } = require('../config/constants');
const logger = require('../utils/logger');

async function verifyArchitecturalFixes() {
  logger.info('====================================================');
  logger.info(' Verifying Entri CodeLab Architectural Refinements');
  logger.info('====================================================');

  await connectDB();

  // Test 1: Challenge with Dual-Tier Test Suites (Sample vs Hidden)
  logger.info('Test 1: Creating challenge with Scaffolding & Dual-Tier Test Suites...');
  const challenge = await challengeService.createChallenge('mentor-42', {
    title: 'Dual-Tier Architecture Assessment',
    description: 'Implement sum array algorithm with edge cases',
    stack: STACK_TYPES.JS,
    difficulty: 'MEDIUM',
    durationMinutes: 60,
    scaffolding: [
      {
        path: 'solution.js',
        name: 'solution.js',
        content: `function sumArray(arr) { if (!Array.isArray(arr)) return 0; return arr.reduce((a, b) => a + b, 0); }\nmodule.exports = { sumArray };`,
        isReadOnly: false,
        isHidden: false
      },
      {
        path: 'internal-constants.json',
        name: 'internal-constants.json',
        content: `{"MAX_ITEMS": 1000}`,
        isReadOnly: true,
        isHidden: true // Confidential server-side only file
      }
    ],
    testSuites: {
      sampleTests: {
        path: '__tests__/sample.test.js',
        content: `const { sumArray } = require('../solution');
describe('Sample Tier 1', () => {
  test('Sample TC01: Sums positive numbers', () => {
    expect(sumArray([1, 2, 3])).toBe(6);
  });
});`
      },
      hiddenTests: {
        path: '__tests__/hidden.test.js',
        content: `const { sumArray } = require('../solution');
describe('Hidden Tier 2', () => {
  test('Hidden TC02: Empty array returns zero', () => {
    expect(sumArray([])).toBe(0);
  });
  test('Hidden TC03: Non-array argument handled safely', () => {
    expect(sumArray(null)).toBe(0);
  });
});`
      }
    }
  });

  const cId = challenge.id || challenge._id;
  assert(cId, 'Challenge created successfully');
  logger.info(`[PASS] Challenge created with ID: ${cId}`);

  // Test 2: Verify Candidate Data Sanitization (Concealing Hidden Tests & Hidden Files)
  logger.info('Test 2: Verifying Candidate View Data Sanitization...');
  const candidateView = await challengeService.getChallengeById(cId, false); // isMentor = false
  assert.strictEqual(candidateView.testSuites.hiddenTests.content, '', 'Candidate must NOT see hidden test contents');
  assert(candidateView.testSuites.sampleTests.content.includes('Sample TC01'), 'Candidate must see sample tests');

  const hasHiddenFileInTree = candidateView.scaffoldingTree.some(n => n.path === 'internal-constants.json');
  assert.strictEqual(hasHiddenFileInTree, false, 'Candidate must NOT see isHidden files in scaffolding tree');

  // Verify Mentor View Preserves Hidden Content
  const mentorView = await challengeService.getChallengeById(cId, true); // isMentor = true
  assert(mentorView.testSuites.hiddenTests.content.includes('Hidden TC02'), 'Mentor must see full hidden test code');
  logger.info('[PASS] Candidate vs Mentor data segregation verified.');

  // Test 3: Sandbox Execution & Dual-Tier Pass/Fail Metrics
  logger.info('Test 3: Testing Dual-Tier Isolated Test Runner...');
  const driver = new IsolatedProcessDriver();
  const execResult = await driver.execute({
    files: {
      'solution.js': `function sumArray(arr) { if (!Array.isArray(arr)) return 0; return arr.reduce((a, b) => a + b, 0); }\nmodule.exports = { sumArray };`
    },
    sampleTests: challenge.testSuites.sampleTests.content,
    hiddenTests: challenge.testSuites.hiddenTests.content,
    stack: STACK_TYPES.JS,
    isMentor: false
  });

  assert.strictEqual(execResult.samplePassed, 1, 'Sample tests passed');
  assert.strictEqual(execResult.sampleTotal, 1, 'Sample total is 1');
  assert.strictEqual(execResult.hiddenPassed, 2, 'Hidden tests passed');
  assert.strictEqual(execResult.hiddenTotal, 2, 'Hidden total is 2');
  assert.strictEqual(execResult.total, 3, 'Total tests is 3');
  assert.strictEqual(execResult.passed, 3, 'All passed');
  assert.strictEqual(execResult.score, 100, 'Score is 100%');
  logger.info(`[PASS] Dual-Tier Runner executed successfully: ${execResult.passed}/${execResult.total} passed (Score: ${execResult.score}%)`);

  // Test 4: Strict Context Isolation: Mentor TRY_IDE_SANDBOX vs Learner Submissions Collection
  logger.info('Test 4: Verifying TRY_IDE_SANDBOX Context Isolation (Volatile Memory)...');
  const initialSubmissions = await submissionRepository.findAll();
  const initialCount = initialSubmissions.length;

  // Run as Mentor in TRY_IDE_SANDBOX mode
  const tryModeSession = await submissionService.runTests(
    'mentor-preview-user',
    cId,
    { 'solution.js': 'module.exports = { sumArray: () => 6 };' },
    30,
    true, // isTryMode
    EXECUTION_CONTEXTS.TRY_IDE_SANDBOX
  );

  assert(tryModeSession.submissionId.startsWith('try_ide_'), 'Try IDE session receives ephemeral ID');
  assert(tryModeSession.status === 'RUNNING' || tryModeSession.status === 'IN_PROGRESS', 'Status should be active');

  // Verify that the Submissions collection in DB has NOT been written to
  const afterTrySubmissions = await submissionRepository.findAll();
  assert.strictEqual(
    afterTrySubmissions.length,
    initialCount,
    'TRY_IDE_SANDBOX test runs MUST NEVER write or pollute Submissions database!'
  );
  logger.info('[PASS] TRY_IDE_SANDBOX zero-pollution constraint verified. DB collection untouched.');

  // Test 5: Learner Official Submission persists to Submissions collection
  logger.info('Test 5: Verifying Learner Official Submission persistence...');
  const learnerSession = await submissionService.submitFinal(
    'learner-user-1',
    cId,
    { 'solution.js': 'module.exports = { sumArray: () => 6 };' },
    180,
    false // learner mode
  );

  const afterLearnerSubmissions = await submissionRepository.findAll();
  assert.strictEqual(
    afterLearnerSubmissions.length,
    initialCount + 1,
    'Learner submission MUST be recorded in database'
  );
  logger.info('[PASS] Learner submission persistence verified.');

  logger.info('====================================================');
  logger.info(' ALL ARCHITECTURAL REFINEMENTS VERIFIED (100% PASS)');
  logger.info('====================================================');
}

verifyArchitecturalFixes().then(() => {
  process.exit(0);
}).catch(err => {
  logger.error('Architectural Test Suite Failed:', err);
  process.exit(1);
});
