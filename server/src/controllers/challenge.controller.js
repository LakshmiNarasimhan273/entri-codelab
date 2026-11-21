const challengeService = require('../services/challenge.service');
const { sendSuccess, sendError } = require('../utils/response.util');

class ChallengeController {
  async createChallenge(req, res, next) {
    try {
      const {
        title,
        description,
        stack,
        scaffolding,
        scaffoldingTree,
        testSuites,
        testCases,
        durationMinutes,
        totalScore
      } = req.body;

      if (!title || !description) {
        return sendError(res, 'Title and description are required', 400);
      }

      const challenge = await challengeService.createChallenge(req.user.id, {
        title,
        description,
        stack,
        scaffolding,
        scaffoldingTree,
        testSuites,
        testCases,
        durationMinutes,
        totalScore
      });

      return sendSuccess(res, challenge, 'Challenge created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getAllChallenges(req, res, next) {
    try {
      const isMentor = req.user?.role === 'MENTOR';
      const challenges = await challengeService.getAllChallenges(isMentor);
      return sendSuccess(res, challenges, 'Challenges retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getChallengeById(req, res, next) {
    try {
      const isMentor = req.user?.role === 'MENTOR';
      const challenge = await challengeService.getChallengeById(req.params.id, isMentor);
      if (!challenge) {
        return sendError(res, 'Challenge not found', 404);
      }
      return sendSuccess(res, challenge, 'Challenge retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateChallenge(req, res, next) {
    try {
      const updated = await challengeService.updateChallenge(req.params.id, req.user.id, req.body);
      return sendSuccess(res, updated, 'Challenge updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async deleteChallenge(req, res, next) {
    try {
      await challengeService.deleteChallenge(req.params.id);
      return sendSuccess(res, null, 'Challenge deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ChallengeController();

