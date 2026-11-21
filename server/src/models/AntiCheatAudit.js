const mongoose = require('mongoose');
const { ANTI_CHEAT_EVENTS } = require('../config/constants');

const antiCheatAuditSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      index: true
    },
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
      index: true
    },
    learnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    eventType: {
      type: String,
      enum: Object.values(ANTI_CHEAT_EVENTS),
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    clientTimestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

antiCheatAuditSchema.index({ challengeId: 1, learnerId: 1, createdAt: -1 });

module.exports = mongoose.model('AntiCheatAudit', antiCheatAuditSchema);

