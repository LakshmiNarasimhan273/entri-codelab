const mongoose = require('mongoose');
const { STACK_TYPES } = require('../config/constants');

const scaffoldingItemSchema = new mongoose.Schema({
  path: { type: String, required: true },
  name: { type: String, default: '' },
  content: { type: String, default: '' },
  isReadOnly: { type: Boolean, default: false },
  isHidden: { type: Boolean, default: false }
}, { _id: false });

const testSuiteItemSchema = new mongoose.Schema({
  path: { type: String, default: '' },
  content: { type: String, default: '' }
}, { _id: false });

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Challenge title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Problem description and instructions are required']
    },
    difficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD'],
      default: 'MEDIUM'
    },
    stack: {
      type: String,
      enum: Object.values(STACK_TYPES),
      required: [true, 'Technology stack is required'],
      default: STACK_TYPES.JS
    },
    // Revised flat scaffolding list with path, isReadOnly, isHidden
    scaffolding: {
      type: [scaffoldingItemSchema],
      default: []
    },
    // Hierarchical tree representation for the file explorer
    scaffoldingTree: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    // Dual-tier test suites: sample visible to learner, hidden executed server-side
    testSuites: {
      sampleTests: {
        type: testSuiteItemSchema,
        default: () => ({ path: '__tests__/sample.test.js', content: '' })
      },
      hiddenTests: {
        type: testSuiteItemSchema,
        default: () => ({ path: '__tests__/hidden.test.js', content: '' })
      }
    },
    // Backward compatibility with single test suite if needed
    testCases: {
      type: String,
      default: ''
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: [5, 'Assessment duration must be at least 5 minutes']
    },
    totalScore: {
      type: Number,
      default: 100
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isPublished: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Performance indices for high concurrency queries
challengeSchema.index({ createdBy: 1, createdAt: -1 });
challengeSchema.index({ stack: 1 });
challengeSchema.index({ difficulty: 1 });
challengeSchema.index({ isPublished: 1 });

module.exports = mongoose.model('Challenge', challengeSchema);
