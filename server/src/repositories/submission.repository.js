const Submission = require('../models/Submission');
const { isInMemoryFallback, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class SubmissionRepository {
  async findAll(filter = {}) {
    if (isInMemoryFallback()) {
      return Array.from(memoryStore.submissions.values());
    }
    return Submission.find(filter).lean().exec();
  }

  async findById(id) {
    if (isInMemoryFallback()) {
      return memoryStore.submissions.get(String(id)) || null;
    }

    return Submission.findById(id)
      .populate('challengeId', 'title stack durationMinutes totalScore')
      .populate('learnerId', 'name email')
      .lean()
      .exec();
  }

  async findByChallenge(challengeId) {
    if (isInMemoryFallback()) {
      const list = Array.from(memoryStore.submissions.values())
        .filter(s => String(s.challengeId) === String(challengeId));
      
      // Populate mock relations
      return list.map(sub => {
        const learner = memoryStore.users.get(String(sub.learnerId));
        const challenge = memoryStore.challenges.get(String(sub.challengeId));
        return {
          ...sub,
          learnerId: learner ? { _id: learner.id, name: learner.name, email: learner.email } : { name: 'Learner', email: '' },
          challengeId: challenge ? { _id: challenge.id, title: challenge.title, stack: challenge.stack } : { title: 'Challenge' }
        };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return Submission.find({ challengeId })
      .populate('learnerId', 'name email')
      .populate('challengeId', 'title stack')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findByUserAndChallenge(learnerId, challengeId) {
    if (isInMemoryFallback()) {
      const list = Array.from(memoryStore.submissions.values())
        .filter(s => String(s.learnerId) === String(learnerId) && String(s.challengeId) === String(challengeId))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return list[0] || null;
    }

    return Submission.findOne({ learnerId, challengeId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async create(submissionData) {
    if (isInMemoryFallback()) {
      const id = uuidv4();
      const submission = {
        _id: id,
        id,
        ...submissionData,
        antiCheatSummary: submissionData.antiCheatSummary || {
          copyCount: 0,
          pasteCount: 0,
          tabSwitchCount: 0,
          blurCount: 0,
          fullscreenExitCount: 0,
          totalViolations: 0,
          isFlagged: false
        },
        testSummary: submissionData.testSummary || {
          total: 0,
          passed: 0,
          failed: 0,
          samplePassed: 0,
          sampleTotal: 0,
          hiddenPassed: 0,
          hiddenTotal: 0,
          details: []
        },
        testResults: submissionData.testResults || {
          total: 0,
          passed: 0,
          failed: 0,
          suites: []
        },
        score: submissionData.score || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.submissions.set(id, submission);
      return submission;
    }

    const submission = new Submission(submissionData);
    return submission.save();
  }

  async update(id, updateData) {
    if (isInMemoryFallback()) {
      const existing = memoryStore.submissions.get(String(id));
      if (!existing) return null;
      const updated = {
        ...existing,
        ...updateData,
        updatedAt: new Date()
      };
      memoryStore.submissions.set(String(id), updated);
      return updated;
    }

    return Submission.findByIdAndUpdate(id, updateData, { new: true }).lean().exec();
  }
}

module.exports = new SubmissionRepository();

