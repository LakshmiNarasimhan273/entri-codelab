const { enqueueExecution, testExecutionQueue } = require('../services/executionQueue.service');
const { sendSuccess, sendError } = require('../utils/response.util');

class ExecutionController {
  async execute(req, res, next) {
    try {
      const payload = req.body;

      // Type check guard before invoking enqueueExecution
      if (typeof enqueueExecution !== 'function') {
        throw new TypeError('enqueueExecution is not a function');
      }

      const job = await enqueueExecution(payload);
      return sendSuccess(res, job, 'Test execution dispatched to queue', 202);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ExecutionController();

