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
  <title>Assessment Workspace</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div id="app">
    <h1 id="title">Starter Workspace</h1>
    <button id="action-btn">Click Me</button>
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
  margin: 0;
  padding: 2rem;
  background-color: #0f172a;
  color: #f8fafc;
}`
            },
            {
              path: 'script.js',
              name: 'script.js',
              isReadOnly: false,
              isHidden: false,
              content: `// Implement DOM interaction logic here
const title = document.getElementById('title');
const btn = document.getElementById('action-btn');

if (btn) {
  btn.addEventListener('click', () => {
    if (title) title.textContent = 'Updated!';
  });
}`
            }
          ],
          testSuites: {
            sampleTests: {
              path: '__tests__/sample.test.js',
              content: `describe('Sample DOM Suite', () => {
  test('Sample TC01: Title element is rendered', () => {
    const title = document.getElementById('title');
    expect(title).toBeDefined();
  });
});`
            },
            hiddenTests: {
              path: '__tests__/hidden.test.js',
              content: `describe('Hidden Evaluator DOM Suite', () => {
  test('Hidden TC02: Button click modifies title', () => {
    const btn = document.getElementById('action-btn');
    const title = document.getElementById('title');
    if (btn) btn.click();
    expect(title ? title.textContent : '').toBe('Updated!');
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

export default function App() {
  const [value, setValue] = useState('Active');

  return (
    <div className="app-container">
      <h2 data-testid="heading">{value}</h2>
      <button onClick={() => setValue('Changed')}>Toggle</button>
    </div>
  );
}`
            }
          ],
          testSuites: {
            sampleTests: {
              path: '__tests__/sample.test.js',
              content: `import React from 'react';
import App from '../src/App';

describe('Sample React Suite', () => {
  test('Sample TC01: App exports a functional component', () => {
    expect(typeof App).toBe('function');
  });
});`
            },
            hiddenTests: {
              path: '__tests__/hidden.test.js',
              content: `import React from 'react';
import App from '../src/App';

describe('Hidden Evaluator React Suite', () => {
  test('Hidden TC02: Root container rendered', () => {
    const el = App();
    expect(el.props.className).toBe('app-container');
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

// Implement API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;`
            }
          ],
          testSuites: {
            sampleTests: {
              path: '__tests__/sample.test.js',
              content: `const app = require('../server');

describe('Sample Express API Suite', () => {
  test('Sample TC01: App instance is exported', () => {
    expect(typeof app).toBe('function');
  });
});`
            },
            hiddenTests: {
              path: '__tests__/hidden.test.js',
              content: `const app = require('../server');

describe('Hidden Evaluator API Suite', () => {
  test('Hidden TC02: Router instance defined', () => {
    expect(app._router).toBeDefined();
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
 * Solution Implementation
 * @param {*} input
 * @return {*}
 */
function solution(input) {
  // Write your algorithm here
  return input;
}

module.exports = { solution };`
            }
          ],
          testSuites: {
            sampleTests: {
              path: '__tests__/sample.test.js',
              content: `const { solution } = require('../solution');

describe('Sample Test Suite', () => {
  test('Sample TC01: Basic input assertion', () => {
    expect(solution('hello')).toBe('hello');
  });

  test('Sample TC02: Identity verification', () => {
    expect(solution(42)).toBe(42);
  });
});`
            },
            hiddenTests: {
              path: '__tests__/hidden.test.js',
              content: `const { solution } = require('../solution');

describe('Hidden Assessment Suite', () => {
  test('Hidden TC03: Empty or null input handling', () => {
    expect(solution(null)).toBe(null);
  });

  test('Hidden TC04: Array parameter handling', () => {
    expect(solution([1, 2, 3])).toEqual([1, 2, 3]);
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
