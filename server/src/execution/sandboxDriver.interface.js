/**
 * Base Abstract Sandbox Driver Interface
 */
class SandboxDriverInterface {
  /**
   * Execute code and tests within isolated boundary
   * @param {Object} options
   * @param {Map|Object} options.files Map of path -> content
   * @param {string} options.testCases Test cases code
   * @param {string} options.stack Technology stack
   * @param {number} options.timeoutMs Maximum execution duration
   * @param {number} options.memoryLimitMb RAM restriction
   * @returns {Promise<{ total: number, passed: number, failed: number, suites: Array, rawOutput: string, executionTimeMs: number }>}
   */
  async execute(options) {
    throw new Error('Method execute() must be implemented by driver');
  }
}

module.exports = SandboxDriverInterface;

