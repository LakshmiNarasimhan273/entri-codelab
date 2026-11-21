const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const SandboxDriverInterface = require('./sandboxDriver.interface');
const logger = require('../utils/logger');
const env = require('../config/env');

class IsolatedProcessDriver extends SandboxDriverInterface {
  async execute({
    files,
    sampleTests = '',
    hiddenTests = '',
    testCases = '',
    isTryMode = false,
    stack,
    jobId,
    timestamp = Date.now(),
    timeoutMs = env.SANDBOX_TIMEOUT_MS,
    memoryLimitMb = env.SANDBOX_MEMORY_LIMIT_MB
  }) {
    const runId = jobId || uuidv4();
    const tempDir = path.join(os.tmpdir(), `exec-${runId}-${timestamp}`);
    const startTime = Date.now();

    try {
      await fs.mkdir(tempDir, { recursive: true });

      // 1. Write user/scaffolding files
      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(tempDir, filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf8');
      }

      // 2. Prepare test code: support sampleTests + hiddenTests dual-tier or fallback to testCases
      const sampleCode = sampleTests || testCases || '';
      const hiddenCode = hiddenTests || '';

      // 3. Write runner test script that executes both tiers
      const runnerScript = `
const path = require('path');
const assert = require('assert');
const Module = require('module');
const fs = require('fs');

// 1. Resilient module resolver supporting both require('../solution') and require('./solution')
const origResolveFilename = Module._resolveFilename;
const projectRoot = path.resolve(__dirname, '..');

Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return origResolveFilename.call(this, request, parent, isMain, options);
  } catch (err) {
    if (request.startsWith('../')) {
      const fromRoot = '.' + request.slice(2);
      try {
        return origResolveFilename.call(this, fromRoot, { ...parent, filename: path.join(projectRoot, 'index.js') }, isMain, options);
      } catch (e) {}
    }
    if (request.startsWith('./')) {
      try {
        return origResolveFilename.call(this, request, { ...parent, filename: path.join(projectRoot, 'index.js') }, isMain, options);
      } catch (e) {}
    }
    throw err;
  }
};

// 2. On-the-fly Sucrase Transpiler for JSX & ES Modules (import/export)
let sucrase = null;
try {
  sucrase = require('sucrase');
} catch (e) {}

const transformCode = (code, filename) => {
  if (!sucrase) return code;
  try {
    return sucrase.transform(code, {
      transforms: ['jsx', 'imports'],
      jsxRuntime: 'classic',
      production: true,
      filePath: filename || 'file.jsx'
    }).code;
  } catch (err) {
    return code;
  }
};

if (sucrase) {
  require.extensions['.jsx'] = function (module, filename) {
    const content = fs.readFileSync(filename, 'utf8');
    module._compile(transformCode(content, filename), filename);
  };

  const origJsCompile = require.extensions['.js'];
  require.extensions['.js'] = function (module, filename) {
    if (filename.includes('node_modules')) {
      return origJsCompile(module, filename);
    }
    const content = fs.readFileSync(filename, 'utf8');
    if (content.includes('import ') || content.includes('export ') || content.includes('</') || content.includes('/>')) {
      module._compile(transformCode(content, filename), filename);
    } else {
      origJsCompile(module, filename);
    }
  };
}

// 3. Resilient In-Memory DOM Mock for Browser/React/DOM Tests
class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this._textContent = '';
    this._innerHTML = '';
    this.attributes = {};
    this.style = {};
    this.listeners = {};
    this.value = '';
    this.id = '';
    this.className = '';
  }

  get textContent() {
    if (this.children.length > 0) {
      return this.children.map(c => c.textContent).join('');
    }
    return this._textContent;
  }
  set textContent(val) {
    this._textContent = String(val);
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML || this._textContent;
  }
  set innerHTML(html) {
    this._innerHTML = html;
    this.children = [];
    const tagRegex = /<([a-z0-9]+)([^>]*)>(.*?)<\\/\\1>|<([a-z0-9]+)([^>]*)\\/>/gis;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const tag = match[1] || match[4];
      const attrs = match[2] || match[5] || '';
      const text = match[3] || '';
      const child = new MockElement(tag);
      child.textContent = text;
      
      const idMatch = attrs.match(/id=["']([^"']+)["']/i);
      if (idMatch) child.id = idMatch[1];
      
      const classMatch = attrs.match(/class=["']([^"']+)["']/i);
      if (classMatch) child.className = classMatch[1];

      const testIdMatch = attrs.match(/data-testid=["']([^"']+)["']/i);
      if (testIdMatch) child.setAttribute('data-testid', testIdMatch[1]);

      this.appendChild(child);
    }
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      child.parentNode = null;
      this.children.splice(idx, 1);
    }
    return child;
  }

  addEventListener(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
  }

  dispatchEvent(event) {
    const type = typeof event === 'string' ? event : event.type;
    const handlers = this.listeners[type] || [];
    handlers.forEach(h => h.call(this, event));
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this });
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
    if (name === 'id') this.id = String(val);
    if (name === 'class') this.className = String(val);
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  getElementById(id) {
    if (this.id === id) return this;
    for (const child of this.children) {
      if (child.getElementById) {
        const found = child.getElementById(id);
        if (found) return found;
      }
    }
    return null;
  }

  querySelector(sel) {
    if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      if (this.className.split(' ').includes(cls)) return this;
      for (const child of this.children) {
        const found = child.querySelector(sel);
        if (found) return found;
      }
      return null;
    }
    const tag = sel.toUpperCase();
    if (this.tagName === tag) return this;
    for (const child of this.children) {
      const found = child.querySelector(sel);
      if (found) return found;
    }
    return null;
  }

  querySelectorAll(sel) {
    const res = [];
    const check = (node) => {
      if (sel.startsWith('#') && node.id === sel.slice(1)) res.push(node);
      else if (sel.startsWith('.') && node.className.split(' ').includes(sel.slice(1))) res.push(node);
      else if (node.tagName === sel.toUpperCase()) res.push(node);
      for (const child of node.children) check(child);
    };
    for (const child of this.children) check(child);
    return res;
  }

  get classList() {
    const self = this;
    return {
      add(...classes) {
        const current = self.className.split(' ').filter(Boolean);
        classes.forEach(c => { if (!current.includes(c)) current.push(c); });
        self.className = current.join(' ');
      },
      remove(...classes) {
        let current = self.className.split(' ').filter(Boolean);
        current = current.filter(c => !classes.includes(c));
        self.className = current.join(' ');
      },
      contains(c) {
        return self.className.split(' ').filter(Boolean).includes(c);
      },
      toggle(c) {
        if (this.contains(c)) this.remove(c);
        else this.add(c);
      }
    };
  }
}

const mockDoc = {
  body: new MockElement('body'),
  createElement(tag) { return new MockElement(tag); },
  getElementById(id) { return this.body.getElementById(id); },
  querySelector(sel) { return this.body.querySelector(sel); },
  querySelectorAll(sel) { return this.body.querySelectorAll(sel); }
};

global.window = global;
global.document = mockDoc;
global.Element = MockElement;
global.HTMLElement = MockElement;

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  samplePassed: 0,
  sampleTotal: 0,
  hiddenPassed: 0,
  hiddenTotal: 0,
  suites: []
};

let currentSuite = '';
let currentTier = 'sample'; // 'sample' | 'hidden'
const beforeEachHooks = [];
const afterEachHooks = [];

function describe(name, fn) {
  currentSuite = name;
  try {
    fn();
  } catch (err) {
    results.suites.push({
      title: name + ' (Suite Setup Failure)',
      status: 'failed',
      tier: currentTier,
      durationMs: 0,
      failureMessages: [err.message]
    });
    results.total++;
    results.failed++;
    if (currentTier === 'sample') {
      results.sampleTotal++;
    } else {
      results.hiddenTotal++;
    }
  }
}

function test(name, fn) {
  results.total++;
  if (currentTier === 'sample') {
    results.sampleTotal++;
  } else {
    results.hiddenTotal++;
  }

  const testTitle = currentSuite ? currentSuite + ' > ' + name : name;
  const start = Date.now();
  try {
    for (const hook of beforeEachHooks) hook();
    fn();
    for (const hook of afterEachHooks) hook();
    results.passed++;
    if (currentTier === 'sample') results.samplePassed++;
    else results.hiddenPassed++;

    results.suites.push({
      title: testTitle,
      status: 'passed',
      tier: currentTier,
      durationMs: Date.now() - start,
      failureMessages: []
    });
  } catch (err) {
    results.failed++;
    results.suites.push({
      title: testTitle,
      status: 'failed',
      tier: currentTier,
      durationMs: Date.now() - start,
      failureMessages: [err.message || String(err)]
    });
  }
}

function createMatchers(actual, isNot = false) {
  const assertCondition = (cond, msg) => {
    const passed = isNot ? !cond : cond;
    if (!passed) throw new Error(msg);
  };

  return {
    toBe(expected) {
      assertCondition(
        actual === expected,
        isNot
          ? 'Expected value not to be: ' + JSON.stringify(expected)
          : 'Expected: ' + JSON.stringify(expected) + ', Received: ' + JSON.stringify(actual)
      );
    },
    toEqual(expected) {
      let isEqual = false;
      try {
        assert.deepStrictEqual(actual, expected);
        isEqual = true;
      } catch (e) {
        isEqual = false;
      }
      assertCondition(
        isEqual,
        isNot
          ? 'Expected values not to deeply equal'
          : 'Expected deep equality: ' + JSON.stringify(expected) + ', Received: ' + JSON.stringify(actual)
      );
    },
    toBeGreaterThan(expected) {
      assertCondition(actual > expected, 'Expected ' + actual + (isNot ? ' not to be > ' : ' to be > ') + expected);
    },
    toBeLessThan(expected) {
      assertCondition(actual < expected, 'Expected ' + actual + (isNot ? ' not to be < ' : ' to be < ') + expected);
    },
    toBeNull() {
      assertCondition(actual === null, 'Expected ' + actual + (isNot ? ' not to be null' : ' to be null'));
    },
    toBeDefined() {
      assertCondition(typeof actual !== 'undefined', 'Expected defined, got undefined');
    },
    toBeUndefined() {
      assertCondition(typeof actual === 'undefined', 'Expected undefined, got ' + typeof actual);
    },
    toBeTruthy() {
      assertCondition(Boolean(actual), 'Expected truthy value, received: ' + actual);
    },
    toBeFalsy() {
      assertCondition(!Boolean(actual), 'Expected falsy value, received: ' + actual);
    },
    toContain(item) {
      const has = Array.isArray(actual) ? actual.includes(item) : (typeof actual === 'string' ? actual.includes(item) : false);
      assertCondition(has, 'Expected ' + JSON.stringify(actual) + (isNot ? ' not to contain ' : ' to contain ') + JSON.stringify(item));
    },
    toThrow(expected) {
      let threw = false;
      let thrownErr = null;
      try {
        if (typeof actual === 'function') actual();
      } catch (e) {
        threw = true;
        thrownErr = e;
      }
      assertCondition(threw, 'Expected function to throw error');
      if (threw && expected && !isNot) {
        const msg = thrownErr ? thrownErr.message : '';
        if (typeof expected === 'string' && !msg.includes(expected)) {
          throw new Error('Expected error message to include "' + expected + '", got "' + msg + '"');
        }
      }
    }
  };
}

function expect(actual) {
  const matchers = createMatchers(actual, false);
  matchers.not = createMatchers(actual, true);
  return matchers;
}

// Global Jest test harness bindings
global.describe = describe;
global.test = test;
global.it = test;
global.expect = expect;
global.beforeEach = (fn) => { beforeEachHooks.push(fn); };
global.afterEach = (fn) => { afterEachHooks.push(fn); };

try {
  // Execute Tier 1: Sample Tests
  if (${JSON.stringify(sampleCode)}.trim()) {
    currentTier = 'sample';
    try {
      (() => {
        const compiledSample = transformCode(${JSON.stringify(sampleCode)}, '__tests__/sample.test.js');
        eval(compiledSample);
      })();
    } catch (sampleErr) {
      results.suites.push({
        title: 'Sample Test Suite Runtime Error',
        status: 'failed',
        tier: 'sample',
        durationMs: 0,
        failureMessages: [sampleErr.message || String(sampleErr)]
      });
      results.total++;
      results.failed++;
      results.sampleTotal++;
    }
  }

  // Execute Tier 2: Hidden Evaluator Tests
  if (${JSON.stringify(hiddenCode)}.trim()) {
    currentTier = 'hidden';
    try {
      (() => {
        const compiledHidden = transformCode(${JSON.stringify(hiddenCode)}, '__tests__/hidden.test.js');
        eval(compiledHidden);
      })();
    } catch (hiddenErr) {
      results.suites.push({
        title: 'Hidden Test Suite Runtime Error',
        status: 'failed',
        tier: 'hidden',
        durationMs: 0,
        failureMessages: [hiddenErr.message || String(hiddenErr)]
      });
      results.total++;
      results.failed++;
      results.hiddenTotal++;
    }
  }

  console.log('__ANTIGRAVITY_RESULT_START__' + JSON.stringify(results) + '__ANTIGRAVITY_RESULT_END__');
} catch (err) {
  console.log('__ANTIGRAVITY_RESULT_START__' + JSON.stringify({
    total: 1,
    passed: 0,
    failed: 1,
    sampleTotal: 1,
    samplePassed: 0,
    hiddenTotal: 0,
    hiddenPassed: 0,
    suites: [{
      title: 'Test Execution Runtime Error',
      status: 'failed',
      tier: 'sample',
      durationMs: 0,
      failureMessages: [err.message, err.stack]
    }]
  }) + '__ANTIGRAVITY_RESULT_END__');
}
`;

      const testsDir = path.join(tempDir, '__tests__');
      await fs.mkdir(testsDir, { recursive: true });
      const runnerFile = path.join(testsDir, '__ag_runner.js');
      await fs.writeFile(runnerFile, runnerScript, 'utf8');

      // 4. Spawn isolated Node child process
      const nodeArgs = [
        `--max-old-space-size=${memoryLimitMb}`,
        runnerFile
      ];

      return await new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        let killed = false;

        const projectRoot = path.resolve(__dirname, '../../..');
        const rootNodeModules = path.join(projectRoot, 'node_modules');
        const serverNodeModules = path.join(projectRoot, 'server', 'node_modules');
        const nodePath = [rootNodeModules, serverNodeModules, process.env.NODE_PATH || ''].filter(Boolean).join(path.delimiter);

        const proc = spawn(process.execPath, nodeArgs, {
          cwd: tempDir,
          env: {
            NODE_ENV: 'test',
            PATH: process.env.PATH,
            NODE_PATH: nodePath
          },
          windowsHide: true
        });

        const timer = setTimeout(() => {
          killed = true;
          proc.kill('SIGKILL');
        }, timeoutMs);

        proc.stdout.on('data', (d) => { stdout += d.toString(); });
        proc.stderr.on('data', (d) => { stderr += d.toString(); });

        proc.on('close', () => {
          clearTimeout(timer);
          const executionTimeMs = Date.now() - startTime;

          if (killed) {
            return resolve({
              total: 1,
              passed: 0,
              failed: 1,
              sampleTotal: 1,
              samplePassed: 0,
              hiddenTotal: 0,
              hiddenPassed: 0,
              score: 0,
              suites: [{
                title: 'Execution Timeout',
                status: 'failed',
                tier: 'sample',
                durationMs: executionTimeMs,
                failureMessages: [`Execution exceeded strict timeout cap of ${timeoutMs / 1000}s.`]
              }],
              executionTimeMs,
              rawOutput: 'Process killed due to execution timeout limit.'
            });
          }

          // Parse results delimiter
          const startMarker = '__ANTIGRAVITY_RESULT_START__';
          const endMarker = '__ANTIGRAVITY_RESULT_END__';
          const startIdx = stdout.indexOf(startMarker);
          const endIdx = stdout.indexOf(endMarker);

          if (startIdx !== -1 && endIdx !== -1) {
            try {
              const jsonStr = stdout.substring(startIdx + startMarker.length, endIdx);
              const data = JSON.parse(jsonStr);
              const score = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;

              // Format suites: if learner mode (!isTryMode), obscure hidden test failure details
              let hiddenIndex = 1;
              const formattedSuites = (data.suites || []).map((suite) => {
                if (suite.tier === 'hidden' && !isTryMode) {
                  return {
                    title: `Evaluator Test Case #${hiddenIndex++}`,
                    status: suite.status,
                    tier: 'hidden',
                    durationMs: suite.durationMs,
                    failureMessages: suite.status === 'failed'
                      ? ['Evaluator assertion failed. Details hidden to preserve test integrity.']
                      : []
                  };
                }
                return suite;
              });

              return resolve({
                total: data.total || 0,
                passed: data.passed || 0,
                failed: data.failed || 0,
                samplePassed: data.samplePassed || 0,
                sampleTotal: data.sampleTotal || 0,
                hiddenPassed: data.hiddenPassed || 0,
                hiddenTotal: data.hiddenTotal || 0,
                score,
                suites: formattedSuites,
                executionTimeMs,
                rawOutput: stdout.replace(startMarker + jsonStr + endMarker, '').trim() ||
                  (data.passed === data.total ? 'All test cases passed successfully.' : 'Tests completed with failures.')
              });
            } catch (pErr) {
              logger.error('Failed to parse isolated test output JSON:', pErr);
            }
          }

          resolve({
            total: 1,
            passed: 0,
            failed: 1,
            sampleTotal: 1,
            samplePassed: 0,
            hiddenTotal: 0,
            hiddenPassed: 0,
            score: 0,
            suites: [{
              title: 'Test Suite Execution',
              status: 'failed',
              tier: 'sample',
              durationMs: executionTimeMs,
              failureMessages: [stderr || 'Unknown execution failure']
            }],
            executionTimeMs,
            rawOutput: stdout + '\n' + stderr
          });
        });

        proc.on('error', (err) => {
          clearTimeout(timer);
          resolve({
            total: 1,
            passed: 0,
            failed: 1,
            sampleTotal: 1,
            samplePassed: 0,
            hiddenTotal: 0,
            hiddenPassed: 0,
            score: 0,
            suites: [{
              title: 'Subprocess Launch Failure',
              status: 'failed',
              tier: 'sample',
              durationMs: 0,
              failureMessages: [err.message]
            }],
            executionTimeMs: Date.now() - startTime,
            rawOutput: err.message
          });
        });
      });

    } finally {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cErr) {
        // Ignored
      }
    }
  }
}

module.exports = IsolatedProcessDriver;
