const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const SandboxDriverInterface = require('./sandboxDriver.interface');
const logger = require('../utils/logger');
const env = require('../config/env');

class DockerDriver extends SandboxDriverInterface {
  constructor() {
    super();
    this.imageName = env.DOCKER_IMAGE;
  }

  async execute({ files, testCases, stack, jobId, timestamp = Date.now(), timeoutMs = env.SANDBOX_TIMEOUT_MS, memoryLimitMb = env.SANDBOX_MEMORY_LIMIT_MB }) {
    const sandboxRunId = jobId || uuidv4();
    const tempDir = path.join(os.tmpdir(), `exec-${sandboxRunId}-${timestamp}`);
    const startTime = Date.now();

    try {
      await fs.mkdir(tempDir, { recursive: true });

      // 1. Write learner files
      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(tempDir, filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf8');
      }

      // 2. Ensure __tests__ directory with testCases Jest file
      const testsDir = path.join(tempDir, '__tests__');
      await fs.mkdir(testsDir, { recursive: true });
      const testFile = path.join(testsDir, 'assessment.test.js');
      await fs.writeFile(testFile, testCases, 'utf8');

      logger.info(`Spawning isolated Docker sandbox [${sandboxRunId}] with limits: RAM=${memoryLimitMb}MB, CPU=${env.SANDBOX_CPU_QUOTA}, Net=none`);

      // 3. Docker execution command arguments with --no-cache
      const dockerArgs = [
        'run',
        '--rm',
        '--net', 'none',
        '--cpus', String(env.SANDBOX_CPU_QUOTA),
        '-m', `${memoryLimitMb}m`,
        '--pids-limit', '64',
        '-v', `${tempDir}:/sandbox/app:ro`,
        '-w', '/sandbox',
        this.imageName,
        '--json',
        '--no-cache',
        '--testPathPattern=/sandbox/app/__tests__'
      ];

      return await new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        let killed = false;

        const proc = spawn('docker', dockerArgs, { windowsHide: true });

        const timer = setTimeout(() => {
          killed = true;
          proc.kill('SIGKILL');
          logger.warn(`Docker sandbox execution timed out after ${timeoutMs}ms`);
        }, timeoutMs);

        proc.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        proc.on('close', (code) => {
          clearTimeout(timer);
          const executionTimeMs = Date.now() - startTime;

          if (killed) {
            return resolve({
              total: 1,
              passed: 0,
              failed: 1,
              score: 0,
              executionTimeMs,
              suites: [{
                title: 'Execution Timeout',
                status: 'failed',
                durationMs: executionTimeMs,
                failureMessages: [`Execution exceeded strict timeout limit of ${timeoutMs / 1000} seconds.`]
              }],
              rawOutput: 'Error: Execution Timeout Exceeded (Infinite loop or hung process)'
            });
          }

          const parsed = this.parseJestOutput(stdout, stderr, executionTimeMs);
          resolve(parsed);
        });

        proc.on('error', (err) => {
          clearTimeout(timer);
          logger.error('Failed to spawn Docker sandbox:', err);
          resolve({
            total: 1,
            passed: 0,
            failed: 1,
            score: 0,
            executionTimeMs: Date.now() - startTime,
            suites: [{
              title: 'Sandbox Container Initialization Error',
              status: 'failed',
              durationMs: 0,
              failureMessages: [err.message]
            }],
            rawOutput: `Docker Error: ${err.message}`
          });
        });
      });

    } finally {
      // Clean up temporary workspace
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        logger.warn(`Failed to clean up temp dir ${tempDir}: ${cleanupErr.message}`);
      }
    }
  }

  parseJestOutput(stdout, stderr, executionTimeMs) {
    try {
      // Jest JSON reporter prints json object to stdout
      const jsonStart = stdout.indexOf('{');
      const jsonEnd = stdout.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = stdout.substring(jsonStart, jsonEnd + 1);
        const jestData = JSON.parse(jsonStr);

        const total = jestData.numTotalTests || 0;
        const passed = jestData.numPassedTests || 0;
        const failed = jestData.numFailedTests || 0;

        const suites = [];
        if (Array.isArray(jestData.testResults)) {
          for (const suite of jestData.testResults) {
            for (const assertion of suite.assertionResults || []) {
              suites.push({
                title: assertion.title || assertion.fullName,
                status: assertion.status, // 'passed' | 'failed'
                durationMs: assertion.duration || 0,
                failureMessages: assertion.failureMessages || []
              });
            }
          }
        }

        const score = total > 0 ? Math.round((passed / total) * 100) : 0;

        return {
          total,
          passed,
          failed,
          score,
          suites,
          executionTimeMs,
          rawOutput: stdout || stderr
        };
      }
    } catch (parseErr) {
      logger.warn(`Could not parse JSON output from Jest: ${parseErr.message}`);
    }

    // Fallback if stdout was not clean JSON
    return {
      total: 1,
      passed: stdout.includes('PASS') ? 1 : 0,
      failed: stdout.includes('FAIL') || stderr.length > 0 ? 1 : 0,
      score: stdout.includes('PASS') && !stdout.includes('FAIL') ? 100 : 0,
      suites: [{
        title: 'Jest Execution',
        status: stdout.includes('PASS') && !stdout.includes('FAIL') ? 'passed' : 'failed',
        durationMs: executionTimeMs,
        failureMessages: stderr ? [stderr] : []
      }],
      executionTimeMs,
      rawOutput: stdout || stderr
    };
  }
}

module.exports = DockerDriver;

