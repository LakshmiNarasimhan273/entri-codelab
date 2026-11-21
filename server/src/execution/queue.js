const { enqueueExecution, testExecutionQueue, QUEUE_NAME } = require('../services/executionQueue.service');

const initExecutionQueue = () => {
  // Handled inside executionQueue.service.js
};

module.exports = {
  initExecutionQueue,
  enqueueExecution,
  testExecutionQueue,
  QUEUE_NAME
};
