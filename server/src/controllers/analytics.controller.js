const excelService = require('../services/excel.service');
const submissionRepository = require('../repositories/submission.repository');
const challengeRepository = require('../repositories/challenge.repository');
const { sendSuccess, sendError } = require('../utils/response.util');

class AnalyticsController {
  async getChallengeSubmissions(req, res, next) {
    try {
      const { challengeId } = req.params;
      const challenge = await challengeRepository.findById(challengeId);
      if (!challenge) {
        return sendError(res, 'Challenge not found', 404);
      }

      const submissions = await submissionRepository.findByChallenge(challengeId);

      // Compute aggregate stats
      const totalCandidates = submissions.length;
      let totalScore = 0;
      let totalPassed = 0;
      let totalFlagged = 0;

      submissions.forEach(s => {
        totalScore += s.score || 0;
        if (s.score === 100) totalPassed++;
        if (s.antiCheatSummary?.isFlagged || (s.antiCheatSummary?.totalViolations || 0) >= 5) {
          totalFlagged++;
        }
      });

      const metrics = {
        totalCandidates,
        averageScore: totalCandidates > 0 ? Math.round(totalScore / totalCandidates) : 0,
        perfectScores: totalPassed,
        flaggedViolations: totalFlagged
      };

      return sendSuccess(res, { challenge, submissions, metrics }, 'Challenge analytics fetched');
    } catch (err) {
      next(err);
    }
  }

  async exportExcel(req, res, next) {
    try {
      const { challengeId } = req.params;
      const buffer = await excelService.generateChallengeReport(challengeId);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="assessment-report-${challengeId}-${Date.now()}.xlsx"`
      );
      res.setHeader('Content-Length', buffer.length);

      return res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AnalyticsController();

