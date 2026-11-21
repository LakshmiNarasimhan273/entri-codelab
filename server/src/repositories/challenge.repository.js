const Challenge = require('../models/Challenge');
const { isInMemoryFallback, memoryStore } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class ChallengeRepository {
  async findAll(filter = {}) {
    if (isInMemoryFallback()) {
      let list = Array.from(memoryStore.challenges.values());
      if (filter.createdBy) {
        list = list.filter(c => String(c.createdBy) === String(filter.createdBy));
      }
      if (filter.stack) {
        list = list.filter(c => c.stack === filter.stack);
      }
      if (filter.isPublished !== undefined) {
        list = list.filter(c => {
          const isPub = c.isPublished !== undefined ? c.isPublished : true;
          return isPub === filter.isPublished;
        });
      }
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const mongoFilter = { ...filter };
    if (mongoFilter.isPublished === true) {
      mongoFilter.isPublished = { $ne: false };
    }
    return Challenge.find(mongoFilter).populate('createdBy', 'name email').sort({ createdAt: -1 }).lean().exec();
  }

  async findById(id) {
    if (isInMemoryFallback()) {
      return memoryStore.challenges.get(String(id)) || null;
    }

    return Challenge.findById(id).populate('createdBy', 'name email').lean().exec();
  }

  async create(challengeData) {
    const isPublished = challengeData.isPublished !== undefined ? challengeData.isPublished : true;

    if (isInMemoryFallback()) {
      const id = uuidv4();
      const challenge = {
        _id: id,
        id,
        ...challengeData,
        isPublished,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryStore.challenges.set(id, challenge);
      return challenge;
    }

    const challenge = new Challenge({
      ...challengeData,
      isPublished
    });
    return challenge.save();
  }

  async update(id, updateData) {
    if (isInMemoryFallback()) {
      const existing = memoryStore.challenges.get(String(id));
      if (!existing) return null;
      const updated = {
        ...existing,
        ...updateData,
        updatedAt: new Date()
      };
      memoryStore.challenges.set(String(id), updated);
      return updated;
    }

    return Challenge.findByIdAndUpdate(id, updateData, { new: true }).lean().exec();
  }

  async delete(id) {
    if (isInMemoryFallback()) {
      return memoryStore.challenges.delete(String(id));
    }

    return Challenge.findByIdAndDelete(id).exec();
  }
}

module.exports = new ChallengeRepository();

