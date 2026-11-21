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

// Resilient module resolver supporting both require('../solution') and require('./solution')
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
    fn();
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

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error('Expected: ' + JSON.stringify(expected) + ', Received: ' + JSON.stringify(actual));
      }
    },
    toEqual(expected) {
      try {
        assert.deepStrictEqual(actual, expected);
      } catch (e) {
        throw new Error('Expected deep equality: ' + JSON.stringify(expected) + ', Received: ' + JSON.stringify(actual));
      }
    },
    toBeGreaterThan(expected) {
      if (!(actual > expected)) throw new Error('Expected ' + actual + ' to be > ' + expected);
    },
    toBeLessThan(expected) {
      if (!(actual < expected)) throw new Error('Expected ' + actual + ' to be < ' + expected);
    },
    toBeNull() {
      if (actual !== null) throw new Error('Expected null, got ' + actual);
    },
    toBeDefined() {
      if (typeof actual === 'undefined') throw new Error('Expected defined, got undefined');
    },
    toContain(item) {
      if (!actual || !actual.includes(item)) throw new Error('Expected ' + JSON.stringify(actual) + ' to contain ' + JSON.stringify(item));
    },
    toBeTruthy() {
      if (!actual) throw new Error('Expected truthy value, received: ' + actual);
    },
    toBeFalsy() {
      if (actual) throw new Error('Expected falsy value, received: ' + actual);
    }
  };
}

// Global Jest test harness bindings
global.describe = describe;
global.test = test;
global.it = test;
global.expect = expect;
global.beforeEach = (fn) => {};
global.afterEach = (fn) => {};

try {
  // Execute Tier 1: Sample Tests
  if (${JSON.stringify(sampleCode)}.trim()) {
    currentTier = 'sample';
    try {
      (() => {
        ${sampleCode}
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
        ${hiddenCode}
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
        '--disallow-code-generation-from-strings',
        runnerFile
      ];

      return await new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        let killed = false;

        const proc = spawn(process.execPath, nodeArgs, {
          cwd: tempDir,
          env: {
            NODE_ENV: 'test',
            PATH: process.env.PATH
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
