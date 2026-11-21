const AntiCheatAudit = require('../models/AntiCheatAudit');
const { isInMemoryFallback, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class AntiCheatRepository {
  async logEvent(eventData) {
    if (isInMemoryFallback()) {
      const record = {
        _id: uuidv4(),
        ...eventData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.antiCheatLogs.push(record);
      return record;
    }

    const audit = new AntiCheatAudit(eventData);
    return audit.save();
  }

  async getLogsByChallengeAndLearner(challengeId, learnerId) {
    if (isInMemoryFallback()) {
      return memoryStore.antiCheatLogs.filter(
        log => String(log.challengeId) === String(challengeId) && String(log.learnerId) === String(learnerId)
      );
    }

    return AntiCheatAudit.find({ challengeId, learnerId }).sort({ createdAt: 1 }).lean().exec();
  }
}

module.exports = new AntiCheatRepository();

