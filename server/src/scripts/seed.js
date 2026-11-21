const { connectDB } = require('../config/db');
const userRepository = require('../repositories/user.repository');
const challengeRepository = require('../repositories/challenge.repository');
const submissionRepository = require('../repositories/submission.repository');
const challengeService = require('../services/challenge.service');
const { ROLES, STACK_TYPES, SUBMISSION_STATUS } = require('../config/constants');
const logger = require('../utils/logger');

const seedData = async () => {
  await connectDB();
  logger.info('Seeding database with benchmark challenges and accounts...');

  // 1. Seed Mentor
  let mentor = await userRepository.findByEmail('mentor@antigravity.io');
  if (!mentor) {
    mentor = await userRepository.create({
      name: 'Dr. Sarah Connor (Principal Mentor)',
      email: 'mentor@antigravity.io',
      password: 'Password@123',
      role: ROLES.MENTOR
    });
    logger.info('Created default mentor: mentor@antigravity.io / Password@123');
  }

  // 2. Seed Learner
  let learner = await userRepository.findByEmail('learner@antigravity.io');
  if (!learner) {
    learner = await userRepository.create({
      name: 'Alex Mercer (Candidate)',
      email: 'learner@antigravity.io',
      password: 'Password@123',
      role: ROLES.LEARNER
    });
    logger.info('Created default learner: learner@antigravity.io / Password@123');
  }

  const mentorId = mentor.id || mentor._id;
  const learnerId = learner.id || learner._id;

  // 3. Seed JS Challenge: Two Sum
  const jsChallenge = await challengeRepository.create({
    title: 'Algorithm: Optimized Two Sum with HashMap',
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

### Requirements:
- You may assume that each input would have exactly one solution.
- You may not use the same element twice.
- Aim for **O(n)** time complexity using a Hash Map rather than O(n²) brute force.

### Example:
\`\`\`js
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\``,
    difficulty: 'EASY',
    stack: STACK_TYPES.JS,
    durationMinutes: 45,
    totalScore: 100,
    scaffoldingTree: challengeService.getDefaultScaffolding(STACK_TYPES.JS),
    testCases: `const { twoSum } = require('./solution');

describe('Two Sum Algorithm Evaluation', () => {
  test('TC01: Standard positive integers test case', () => {
    expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1]);
  });

  test('TC02: Duplicate elements sum to target', () => {
    expect(twoSum([3, 3], 6)).toEqual([0, 1]);
  });

  test('TC03: Unordered elements with negative numbers', () => {
    expect(twoSum([-1, -2, -3, -4, -5], -8)).toEqual([2, 4]);
  });

  test('TC04: Large list edge case', () => {
    const list = [1, 5, 8, 12, 19, 25, 30];
    expect(twoSum(list, 37)).toEqual([3, 5]);
  });
});`,
    createdBy: mentorId
  });

  // 4. Seed Frontend Challenge: Interactive Counter
  const feChallenge = await challengeRepository.create({
    title: 'Frontend: Resilient DOM Counter with Reset Logic',
    description: `Build an interactive counter UI with HTML, CSS, and Vanilla JavaScript.

### Requirements:
1. Increment button (\`#increment-btn\`) adds 1 to current count.
2. Decrement button (\`#decrement-btn\`) subtracts 1 from current count.
3. Reset button (\`#reset-btn\`) sets the count back to 0.
4. Value display (\`#counter-value\`) reflects the count in real time.`,
    difficulty: 'MEDIUM',
    stack: STACK_TYPES.HTML_CSS_JS,
    durationMinutes: 60,
    totalScore: 100,
    scaffoldingTree: challengeService.getDefaultScaffolding(STACK_TYPES.HTML_CSS_JS),
    testCases: `/**
 * @jest-environment jsdom
 */
describe('Interactive Counter DOM Suite', () => {
  beforeEach(() => {
    document.body.innerHTML = \`
      <h1 id="counter-value">0</h1>
      <button id="decrement-btn">-</button>
      <button id="reset-btn">Reset</button>
      <button id="increment-btn">+</button>
    \`;
    jest.resetModules();
    require('./script');
  });

  test('TC01: Initial counter value should be 0', () => {
    const val = document.getElementById('counter-value').textContent;
    expect(val).toBe('0');
  });

  test('TC02: Increment button increases count by 1', () => {
    const incBtn = document.getElementById('increment-btn');
    incBtn.click();
    expect(document.getElementById('counter-value').textContent).toBe('1');
  });

  test('TC03: Decrement button decreases count by 1', () => {
    const decBtn = document.getElementById('decrement-btn');
    decBtn.click();
    expect(document.getElementById('counter-value').textContent).toBe('-1');
  });

  test('TC04: Reset button restores count to 0', () => {
    const incBtn = document.getElementById('increment-btn');
    const resetBtn = document.getElementById('reset-btn');
    incBtn.click();
    incBtn.click();
    resetBtn.click();
    expect(document.getElementById('counter-value').textContent).toBe('0');
  });
});`,
    createdBy: mentorId
  });

  // 5. Seed sample submission for analytics
  await submissionRepository.create({
    challengeId: jsChallenge.id || jsChallenge._id,
    learnerId,
    submittedCode: {
      'solution.js': `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}
module.exports = { twoSum };`
    },
    testResults: {
      total: 4,
      passed: 4,
      failed: 0,
      suites: [
        { title: 'TC01: Standard positive integers', status: 'passed', durationMs: 12 },
        { title: 'TC02: Duplicate elements sum to target', status: 'passed', durationMs: 8 },
        { title: 'TC03: Unordered elements with negative numbers', status: 'passed', durationMs: 9 },
        { title: 'TC04: Large list edge case', status: 'passed', durationMs: 14 }
      ]
    },
    score: 100,
    status: SUBMISSION_STATUS.COMPLETED,
    isFinalSubmission: true,
    timeSpentSeconds: 420,
    antiCheatSummary: {
      copyCount: 0,
      pasteCount: 0,
      tabSwitchCount: 1,
      blurCount: 1,
      fullscreenExitCount: 0,
      totalViolations: 2,
      isFlagged: false
    },
    executionTimeMs: 114
  });

  logger.info('Database seeded successfully with benchmark challenges!');
};

if (require.main === module) {
  seedData().then(() => {
    logger.info('Seed script completed.');
    process.exit(0);
  }).catch((err) => {
    logger.error('Seed script failed:', err);
    process.exit(1);
  });
}

module.exports = seedData;

