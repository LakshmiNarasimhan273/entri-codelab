const mongoose = require('mongoose');

const testDetailSchema = new mongoose.Schema({
  title: String,
  status: { type: String, enum: ['passed', 'failed', 'pending'] },
  tier: { type: String, enum: ['sample', 'hidden'], default: 'sample' },
  durationMs: Number,
  failureMessages: [String]
}, { _id: false });

const submissionSchema = new mongoose.Schema(
  {
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
    // Key-value map of file paths to learner code
    submittedCode: {
      type: Map,
      of: String,
      required: true
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    testSummary: {
      total: { type: Number, default: 0 },
      passed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      samplePassed: { type: Number, default: 0 },
      sampleTotal: { type: Number, default: 0 },
      hiddenPassed: { type: Number, default: 0 },
      hiddenTotal: { type: Number, default: 0 },
      details: [testDetailSchema],
      rawOutput: { type: String, default: '' }
    },
    // Backward compatibility alias getter
    testResults: {
      total: { type: Number, default: 0 },
      passed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      suites: [testDetailSchema],
      rawOutput: { type: String, default: '' }
    },
    status: {
      type: String,
      enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      index: true
    },
    isFinalSubmission: {
      type: Boolean,
      default: false
    },
    antiCheatSummary: {
      copyCount: { type: Number, default: 0 },
      pasteCount: { type: Number, default: 0 },
      tabSwitchCount: { type: Number, default: 0 },
      blurCount: { type: Number, default: 0 },
      fullscreenExitCount: { type: Number, default: 0 },
      totalViolations: { type: Number, default: 0 },
      isFlagged: { type: Boolean, default: false }
    },
    timeSpentSeconds: {
      type: Number,
      default: 0
    },
    executionTimeMs: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// High concurrency compound indices for reporting, queries, and analytics
submissionSchema.index({ challengeId: 1, learnerId: 1 });
submissionSchema.index({ challengeId: 1, createdAt: -1 });
submissionSchema.index({ learnerId: 1, createdAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
