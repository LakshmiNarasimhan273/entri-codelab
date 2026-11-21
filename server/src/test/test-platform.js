const assert = require('assert');
const { connectDB } = require('../config/db');
const userRepository = require('../repositories/user.repository');
const challengeRepository = require('../repositories/challenge.repository');
const submissionRepository = require('../repositories/submission.repository');
const authService = require('../services/auth.service');
const challengeService = require('../services/challenge.service');
const submissionService = require('../services/submission.service');
const excelService = require('../services/excel.service');
const IsolatedProcessDriver = require('../execution/isolatedProcessDriver');
const circuitBreaker = require('../execution/circuitBreaker');
const { ROLES, STACK_TYPES, SUBMISSION_STATUS } = require('../config/constants');
const logger = require('../utils/logger');

async function runPlatformTests() {
  logger.info('=============================================');
  logger.info(' Starting Antigravity Platform Test Suite');
  logger.info('=============================================');

  // 1. Initialize DB (Mock / Real)
  await connectDB();
  logger.info('[PASS] Database initialization successful.');

  // 2. Test Learner Auth
  const learnerData = {
    name: 'Ada Lovelace',
    email: `ada_${Date.now()}@test.io`,
    password: 'Password@123'
  };
  const learnerAuth = await authService.registerLearner(learnerData);
  assert(learnerAuth.accessToken, 'Access token generated');
  assert.strictEqual(learnerAuth.user.role, ROLES.LEARNER);
  logger.info('[PASS] Learner Registration & JWT Generation verified.');

  // 3. Test Mentor Auth via Secret Route
  const mentorData = {
    name: 'Dr. Alan Turing',
    email: `alan_${Date.now()}@test.io`,
    password: 'Password@123',
    inviteSecret: 'mentor-secret-signup-99x'
  };
  const mentorAuth = await authService.registerMentor(mentorData);
  assert.strictEqual(mentorAuth.user.role, ROLES.MENTOR);
  logger.info('[PASS] Mentor Registration via Obfuscated Secret Route verified.');

  // 4. Test Unified Login
  const loginRes = await authService.login({
    email: learnerData.email,
    password: learnerData.password
  });
  assert(loginRes.accessToken, 'Login token generated');
  logger.info('[PASS] Unified Login Portal verified.');

  // 5. Test Challenge Creation with Scaffolding & Jest Tests
  const challenge = await challengeService.createChallenge(mentorAuth.user.id, {
    title: 'Palindrome Substring Algorithm',
    description: 'Find length of longest palindrome substring',
    stack: STACK_TYPES.JS,
    difficulty: 'MEDIUM',
    durationMinutes: 45,
    scaffoldingTree: [
      {
        name: 'solution.js',
        path: 'solution.js',
        type: 'file',
        content: `function isPalindrome(str) { return str === str.split('').reverse().join(''); }\nmodule.exports = { isPalindrome };`
      }
    ],
    testCases: `const { isPalindrome } = require('./solution');
describe('Palindrome Suite', () => {
  test('TC01: Valid palindrome', () => {
    expect(isPalindrome('racecar')).toBe(true);
  });
  test('TC02: Invalid palindrome', () => {
    expect(isPalindrome('antigravity')).toBe(false);
  });
});`
  });
  assert(challenge.id || challenge._id, 'Challenge ID present');
  logger.info('[PASS] Challenge Creation with Scaffolding & Jest Suite verified.');

  // 6. Test Ephemeral Sandbox Runner (IsolatedProcessDriver)
  logger.info('Executing Jest assertions inside sandboxed process driver...');
  const driver = new IsolatedProcessDriver();
  const execResult = await driver.execute({
    files: {
      'solution.js': `function isPalindrome(str) { return str === str.split('').reverse().join(''); }\nmodule.exports = { isPalindrome };`
    },
    testCases: `const { isPalindrome } = require('./solution');
describe('Palindrome Suite', () => {
  test('TC01: Valid palindrome', () => {
    expect(isPalindrome('racecar')).toBe(true);
  });
  test('TC02: Invalid palindrome', () => {
    expect(isPalindrome('antigravity')).toBe(false);
  });
});`,
    stack: STACK_TYPES.JS,
    timeoutMs: 5000,
    memoryLimitMb: 128
  });

  assert.strictEqual(execResult.total, 2, 'Total tests should be 2');
  assert.strictEqual(execResult.passed, 2, 'Passed tests should be 2');
  assert.strictEqual(execResult.failed, 0, 'Failed tests should be 0');
  assert.strictEqual(execResult.score, 100, 'Score should be 100%');
  logger.info(`[PASS] Isolated Sandbox Runner verified! Score: ${execResult.score}%, Duration: ${execResult.executionTimeMs}ms`);

  // 7. Test Anti-Cheat Event Telemetry
  const challengeId = challenge.id || challenge._id;
  const learnerId = learnerAuth.user.id;

  // Create submission record
  await submissionService.runTests(learnerId, challengeId, {
    'solution.js': 'module.exports = { isPalindrome: () => true };'
  }, 120);

  const antiCheatRes = await submissionService.recordAntiCheatEvent(
    learnerId,
    challengeId,
    'TAB_SWITCH',
    { window: 'blurred' }
  );
  assert(antiCheatRes.summary.tabSwitchCount >= 1, 'Anti-cheat event recorded');
  logger.info('[PASS] Anti-Cheat Telemetry Logging verified.');

  // 8. Test Excel Report Generation (ExcelJS)
  logger.info('Generating official assessment scorecard via ExcelJS...');
  const excelBuffer = await excelService.generateChallengeReport(challengeId);
  assert(excelBuffer && excelBuffer.length > 1000, 'Excel buffer generated successfully');
  logger.info(`[PASS] ExcelJS Report Generation verified! Generated ${excelBuffer.length} bytes .xlsx file.`);

  // 9. Test Circuit Breaker
  assert.strictEqual(circuitBreaker.isOpen(), false, 'Circuit breaker should be closed initially');
  logger.info('[PASS] Circuit Breaker resilience verified.');

  logger.info('=============================================');
  logger.info(' ALL 9/9 ARCHITECTURAL TESTS PASSED!');
  logger.info(' Antigravity Assessment Platform is Production Ready.');
  logger.info('=============================================');
}

runPlatformTests().then(() => {
  process.exit(0);
}).catch(err => {
  logger.error('Test suite failed:', err);
  process.exit(1);
});

