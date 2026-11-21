const logger = require('../utils/logger');

class CircuitBreaker {
  constructor(threshold = 5, coolDownPeriodMs = 30000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.coolDownPeriodMs = coolDownPeriodMs;
    this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
    this.nextAttempt = Date.now();
  }

  isOpen() {
    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttempt) {
        this.state = 'HALF_OPEN';
        logger.warn('Circuit Breaker transitioned to HALF_OPEN state. Testing service health...');
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() {
    if (this.state === 'HALF_OPEN') {
      logger.info('Circuit Breaker reset to CLOSED state after successful test run.');
    }
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failureCount++;
    logger.warn(`Execution Worker failure recorded. Count: ${this.failureCount}/${this.threshold}`);

    if (this.failureCount >= this.threshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.coolDownPeriodMs;
      logger.error(`Circuit Breaker tripped to OPEN state! Sandbox execution paused for ${this.coolDownPeriodMs / 1000}s`);
    }
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null
    };
  }
}

module.exports = new CircuitBreaker();

