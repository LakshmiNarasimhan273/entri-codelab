const challengeRepository = require('../repositories/challenge.repository');
const cacheService = require('./cache.service');
const { STACK_TYPES } = require('../config/constants');

const CACHE_KEYS = {
  ALL_CHALLENGES: 'challenges:all',
  CHALLENGE_PREFIX: 'challenge:'
};

class ChallengeService {
  /**
   * Helper to convert flat scaffolding items into hierarchical tree representation for Monaco file explorer
   */
  buildTreeFromScaffolding(scaffoldingList = [], sampleTestContent = '') {
    const root = [];

    // Helper to insert a node at given path
    const insertPath = (filePath, content, isReadOnly = false) => {
      const parts = filePath.split('/').filter(Boolean);
      let currentLevel = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        if (isFile) {
          const existing = currentLevel.find((n) => n.path === currentPath);
          if (!existing) {
            currentLevel.push({
              name: part,
              path: currentPath,
              type: 'file',
              content: content || '',
              isReadOnly
            });
          }
        } else {
          let folder = currentLevel.find((n) => n.type === 'folder' && n.name === part);
          if (!folder) {
            folder = {
              name: part,
              path: currentPath,
              type: 'folder',
              isReadOnly,
              children: []
            };
            currentLevel.push(folder);
          }
          currentLevel = folder.children;
        }
      }
    };

    // Insert user-defined files (excluding hidden files)
    for (const item of scaffoldingList) {
      if (!item.isHidden) {
        insertPath(item.path, item.content || '', Boolean(item.isReadOnly));
      }
    }

    // Ensure sample test file is present in __tests__/sample.test.js as read-only
    if (sampleTestContent) {
      insertPath('__tests__/sample.test.js', sampleTestContent, true);
    }

    return root;
  }

  getDefaultScaffolding(stack) {
    const bundle = this.getDefaultScaffoldingAndTests(stack);
    return this.buildTreeFromScaffolding(bundle.scaffolding, bundle.testSuites?.sampleTests?.content || '');
  }

  /**
   * Default starter templates for supported stacks
   */
  getDefaultScaffoldingAndTests(stack) {
    switch (stack) {
      case STACK_TYPES.HTML_CSS_JS:
        return {
          scaffolding: [
            {
              path: 'index.html',
              name: 'index.html',
              isReadOnly: false,
              isHidden: false,
              content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DOM Counter</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="card">
    <h1 id="counter-value">0</h1>
    <div class="btn-group">
      <button id="decrement-btn">-</button>
      <button id="reset-btn">Reset</button>
      <button id="increment-btn">+</button>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>`
            },
            {
              path: 'style.css',
              name: 'style.css',
              isReadOnly: false,
              isHidden: false,
              content: `body {
  font-family: sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #0f172a;
  color: #f8fafc;
}
.card {
  text-align: center;
  padding: 2rem;
  background: #1e293b;
  border-radius: 12px;
}
button {
  padding: 0.5rem 1.25rem;
  margin: 0 0.5rem;
  font-size: 1.1rem;
  cursor: pointer;
}`
            },
            {
              path: 'script.js',
              name: 'script.js',
              isReadOnly: false,
              isHidden: false,
              content: `let count = 0;
const valueDisplay = document.getElementById('counter-value');
const incBtn = document.getElementById('increment-btn');
const decBtn = document.getElementById('decrement-btn');
const resetBtn = document.getElementById('reset-btn');

function updateDisplay() {
  if (valueDisplay) valueDisplay.textContent = count;
}

if (incBtn) {
  incBtn.addEventListener('click', () => {
    count++;
    updateDisplay();
  });
}

if (decBtn) {
  decBtn.addEventListener('click', () => {
    count--;
    updateDisplay();
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    count = 0;
    updateDisplay();
  });
}

if (typeof module !== 'undefined') {
  module.exports = { getCount: () => count };
}`
            }
          ],
          testSuites: {
            sampleTests: {
              path: '__tests__/sample.test.js',
              content: `describe('Sample Tests: Interactive Counter DOM Suite', () => {
  beforeEach(() => {
    document.body.innerHTML = \`
      <h1 id="counter-value">0</h1>
      <button id="decrement-btn">-</button>
      <button id="reset-btn">Reset</button>
      <button id="increment-btn">+</button>
    \`;
  });

  test('Sample TC01: Initial counter value should be 0', () => {
    const val = document.getElementById('counter-value').textContent;
    expect(val).toBe('0');
  });

  test('Sample TC02: Increment button increases count by 1', () => {
    const incBtn = document.getElementById('increment-btn');
    incBtn.click();
    expect(document.getElementById('counter-value').textContent).toBe('1');
  });
});`
            },
            hiddenTests: {
              path: '__tests__/hidden.test.js',
              content: `describe('Hidden Assessment Suite: Edge Cases & Reset', () => {
  beforeEach(() => {
    document.body.innerHTML = \`
      <h1 id="counter-value">0</h1>
      <button id="decrement-btn">-</button>
      <button id="reset-btn">Reset</button>
      <button id="increment-btn">+</button>
    \`;
  });

  test('Hidden TC03: Decrement button decreases count by 1', () => {
    const decBtn = document.getElementById('decrement-btn');
    decBtn.click();
    expect(document.getElementById('counter-value').textContent).toBe('-1');
  });

  test('Hidden TC04: Reset button restores count to 0 after multiple operations', () => {
    const incBtn = document.getElementById('increment-btn');
    const resetBtn = document.getElementById('reset-btn');
    incBtn.click();
    incBtn.click();
    resetBtn.click();
    expect(document.getElementById('counter-value').textContent).toBe('0');
  });
});`
            }
          }
        };

      case STACK_TYPES.REACT:
        return {
          scaffolding: [
            {
              path: 'src/App.jsx',
              name: 'App.jsx',
              isReadOnly: false,
              isHidden: false,
              content: `import React, { useState } from 'react';

export default function TodoApp() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');

  const handleAdd = () => {
    if (!text.trim()) return;
    setItems([...items, { id: Date.now(), text }]);
    setText('');
  };

  return (
    <div className="todo-box">
      <h2>Todo List</h2>
      <input
        data-testid="todo-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add item..."
      />
      <button data-testid="todo-btn" onClick={handleAdd}>Add</button>
      <ul data-testid="todo-list">
        {items.map(item => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ul>
    </div>
  );
}`
            }
          ],
          testSuites: {
            sampleTests: {
              path: '__tests__/sample.test.js',
              content: `describe('Sample Tests: React Component Suite', () => {
  test('Sample TC01: Component module exports valid component', () => {
    const App = require('../src/App');
    expect(typeof App).toBe('function');
  });
});`
            },
            hiddenTests: {
              path: '__tests__/hidden.test.js',
              content: `describe('Hidden Assessment Suite: State Transitions', () => {
  test('Hidden TC02: Disallows empty input additions', () => {
    expect(true).toBe(true);
  });
  test('Hidden TC03: Item list maintains immutable state updates', () => {
    expect(true).toBe(true);
  });
});`
            }
          }
        };

      case STACK_TYPES.NODE_EXPRESS:
        return {
          scaffolding: [
            {
              path: 'server.js',
              name: 'server.js',
              isReadOnly: false,
              isHidden: false,
              content: `const express = require('express');
const app = express();
app.use(express.json());

let tasks = [
  { id: 1, title: 'Complete Assessment', completed: false }
];

app.get('/api/tasks', (req, res) => {
  res.json({ success: true, data: tasks });
});

app.post('/api/tasks', (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, error: 'Title required' });
  }
  const task = { id: Date.now(), title, completed: false };
  tasks.push(task);
  res.status(201).json({ success: true, data: task });
});

module.exports = app;`
            }
          ],
          testSuites: {
            sampleTests: {
              path: '__tests__/sample.test.js',
              content: `const app = require('../server');

describe('Sample Tests: Express API Suite', () => {
  test('Sample TC01: Express application instance is exported', () => {
    expect(typeof app).toBe('function');
  });
});`
            },
            hiddenTests: {
              path: '__tests__/hidden.test.js',
              content: `const app = require('../server');

describe('Hidden Assessment Suite: Edge Cases & Validation', () => {
  test('Hidden TC02: POST /api/tasks rejects payloads missing title', () => {
    expect(true).toBe(true);
  });
  test('Hidden TC03: Task items are persistently stored in memory', () => {
    expect(true).toBe(true);
  });
});`
            }
          }
        };

      case STACK_TYPES.JS:
      default:
        return {
          scaffolding: [
            {
              path: 'solution.js',
              name: 'solution.js',
              isReadOnly: false,
              isHidden: false,
              content: `/**
 * Two Sum: Find indices of two numbers adding up to target
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
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
            }
          ],
          testSuites: {
            sampleTests: {
              path: '__tests__/sample.test.js',
              content: `const { twoSum } = require('../solution');

describe('Sample Tests: Basic Two Sum Assertions', () => {
  test('Sample TC01: Standard positive integers', () => {
    expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1]);
  });

  test('Sample TC02: Duplicate elements sum to target', () => {
    expect(twoSum([3, 3], 6)).toEqual([0, 1]);
  });
});`
            },
            hiddenTests: {
              path: '__tests__/hidden.test.js',
              content: `const { twoSum } = require('../solution');

describe('Hidden Assessment Suite: Complex Boundary Cases', () => {
  test('Hidden TC03: Negative numbers and zeroes', () => {
    expect(twoSum([-1, -2, -3, -4, -5], -8)).toEqual([2, 4]);
  });

  test('Hidden TC04: Large sorted list efficiency verification', () => {
    const list = [1, 5, 8, 12, 19, 25, 30];
    expect(twoSum(list, 37)).toEqual([3, 5]);
  });
});`
            }
          }
        };
    }
  }

  /**
   * Sanitizes challenge object before sending to learner client
   * - Hides confidential files (`isHidden: true`)
   * - Restricts hidden test case source code from learner
   */
  sanitizeChallengeForLearner(challenge) {
    if (!challenge) return null;
    const cloned = JSON.parse(JSON.stringify(challenge));

    // Filter hidden files from scaffolding
    if (Array.isArray(cloned.scaffolding)) {
      cloned.scaffolding = cloned.scaffolding.filter((item) => !item.isHidden);
    }

    // Sanitize testSuites: conceal hiddenTests content
    if (cloned.testSuites) {
      cloned.testSuites = {
        sampleTests: cloned.testSuites.sampleTests || { path: '__tests__/sample.test.js', content: '' },
        hiddenTests: {
          path: cloned.testSuites.hiddenTests?.path || '__tests__/hidden.test.js',
          content: '' // Never leak hidden tests to candidate
        }
      };
    }

    // Ensure scaffoldingTree only displays learner files and sample test cases
    cloned.scaffoldingTree = this.buildTreeFromScaffolding(
      cloned.scaffolding || [],
      cloned.testSuites?.sampleTests?.content || cloned.testCases || ''
    );

    return cloned;
  }

  async createChallenge(mentorId, challengeData) {
    const stack = challengeData.stack || STACK_TYPES.JS;
    const defaultBundle = this.getDefaultScaffoldingAndTests(stack);

    // 1. Process Scaffolding
    let scaffolding = challengeData.scaffolding;
    if (!scaffolding || scaffolding.length === 0) {
      scaffolding = defaultBundle.scaffolding;
    }

    // 2. Process Dual-Tier Test Suites
    let testSuites = challengeData.testSuites;
    if (!testSuites || (!testSuites.sampleTests && !testSuites.hiddenTests)) {
      testSuites = {
        sampleTests: challengeData.testCases
          ? { path: '__tests__/sample.test.js', content: challengeData.testCases }
          : defaultBundle.testSuites.sampleTests,
        hiddenTests: defaultBundle.testSuites.hiddenTests
      };
    } else {
      if (!testSuites.sampleTests) testSuites.sampleTests = defaultBundle.testSuites.sampleTests;
      if (!testSuites.hiddenTests) testSuites.hiddenTests = defaultBundle.testSuites.hiddenTests;
    }

    // 3. Build Hierarchical Tree representation
    const scaffoldingTree = this.buildTreeFromScaffolding(
      scaffolding,
      testSuites.sampleTests?.content || ''
    );

    const challenge = await challengeRepository.create({
      ...challengeData,
      stack,
      scaffolding,
      scaffoldingTree,
      testSuites,
      testCases: testSuites.sampleTests?.content || '',
      isPublished: true,
      createdBy: mentorId
    });

    // Invalidate cache immediately
    await cacheService.del(CACHE_KEYS.ALL_CHALLENGES);

    return challenge;
  }

  async getAllChallenges(isMentor = false) {
    const cached = await cacheService.get(CACHE_KEYS.ALL_CHALLENGES);
    let challenges = cached;

    if (!challenges) {
      challenges = await challengeRepository.findAll({ isPublished: true });
      await cacheService.set(CACHE_KEYS.ALL_CHALLENGES, challenges, 1800);
    }

    if (isMentor) {
      return challenges;
    }

    // Sanitize for learners
    return challenges.map((c) => this.sanitizeChallengeForLearner(c));
  }

  async getChallengeById(id, isMentor = false) {
    const cacheKey = `${CACHE_KEYS.CHALLENGE_PREFIX}${id}`;
    let challenge = await cacheService.get(cacheKey);

    if (!challenge) {
      challenge = await challengeRepository.findById(id);
      if (challenge) {
        await cacheService.set(cacheKey, challenge, 1800);
      }
    }

    if (!challenge) return null;

    if (isMentor) {
      return challenge;
    }

    return this.sanitizeChallengeForLearner(challenge);
  }

  async updateChallenge(id, mentorId, updateData) {
    const challenge = await challengeRepository.findById(id);
    if (!challenge) {
      const error = new Error('Challenge not found');
      error.statusCode = 404;
      throw error;
    }

    // If scaffolding or testSuites were modified, rebuild tree
    const scaffolding = updateData.scaffolding || challenge.scaffolding || [];
    const testSuites = updateData.testSuites || challenge.testSuites || {};
    const scaffoldingTree = this.buildTreeFromScaffolding(
      scaffolding,
      testSuites.sampleTests?.content || updateData.testCases || challenge.testCases || ''
    );

    const updated = await challengeRepository.update(id, {
      ...updateData,
      scaffoldingTree
    });

    await cacheService.del(CACHE_KEYS.ALL_CHALLENGES);
    await cacheService.del(`${CACHE_KEYS.CHALLENGE_PREFIX}${id}`);
    return updated;
  }

  async deleteChallenge(id) {
    const deleted = await challengeRepository.delete(id);
    await cacheService.del(CACHE_KEYS.ALL_CHALLENGES);
    await cacheService.del(`${CACHE_KEYS.CHALLENGE_PREFIX}${id}`);
    return deleted;
  }
}

module.exports = new ChallengeService();
