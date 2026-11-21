const ExcelJS = require('exceljs');
const submissionRepository = require('../repositories/submission.repository');
const challengeRepository = require('../repositories/challenge.repository');

class ExcelService {
  /**
   * Generates formatted .xlsx assessment scorecard workbook
   * @param {string} challengeId
   * @returns {Promise<Buffer>} Excel file buffer
   */
  async generateChallengeReport(challengeId) {
    const challenge = await challengeRepository.findById(challengeId);
    if (!challenge) {
      const error = new Error('Challenge not found');
      error.statusCode = 404;
      throw error;
    }

    const submissions = await submissionRepository.findByChallenge(challengeId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Antigravity Assessment Platform';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Candidate Scorecard', {
      views: [{ state: 'frozen', ySplit: 4 }]
    });

    // 1. Report Header / Title Block
    worksheet.mergeCells('A1:L1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `ANTIGRAVITY ASSESSMENT PLATFORM - TECHNICAL EVALUATION REPORT`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' } // Slate 900
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 36;

    // Subtitle Info Block
    worksheet.mergeCells('A2:L2');
    const subCell = worksheet.getCell('A2');
    subCell.value = `Challenge: ${challenge.title} | Stack: ${challenge.stack} | Generated: ${new Date().toLocaleString()} | Total Candidates: ${submissions.length}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FFCBD5E1' } };
    subCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' } // Slate 800
    };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 24;

    worksheet.getRow(3).height = 12; // Spacer row

    // 2. Table Column Headers
    const headers = [
      { key: 'learnerName', header: 'Candidate Name', width: 24 },
      { key: 'learnerEmail', header: 'Email Address', width: 28 },
      { key: 'score', header: 'Score (%)', width: 14 },
      { key: 'testsPassed', header: 'Passed', width: 12 },
      { key: 'totalTests', header: 'Total', width: 12 },
      { key: 'status', header: 'Evaluation Status', width: 18 },
      { key: 'isFinal', header: 'Finalized', width: 14 },
      { key: 'violations', header: 'Anti-Cheat Alerts', width: 18 },
      { key: 'integrity', header: 'Integrity Flag', width: 16 },
      { key: 'timeSpent', header: 'Time Spent', width: 16 },
      { key: 'submittedAt', header: 'Submission Date', width: 22 },
      { key: 'executionTime', header: 'Execution (ms)', width: 16 }
    ];

    const headerRow = worksheet.getRow(4);
    headerRow.values = headers.map(h => h.header);
    headerRow.height = 28;

    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' } // Antigravity Brand Blue
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
    });

    // 3. Populate Rows
    let totalScoreSum = 0;
    let flaggedCount = 0;

    submissions.forEach((sub, idx) => {
      const learner = sub.learnerId || {};
      const score = sub.score || 0;
      totalScoreSum += score;

      const antiCheat = sub.antiCheatSummary || {};
      const violations = antiCheat.totalViolations || 0;
      const isFlagged = antiCheat.isFlagged || violations >= 5;
      if (isFlagged) flaggedCount++;

      const timeMins = Math.floor((sub.timeSpentSeconds || 0) / 60);
      const timeSecs = (sub.timeSpentSeconds || 0) % 60;
      const formattedTime = `${timeMins}m ${timeSecs}s`;

      const row = worksheet.addRow([
        learner.name || 'Anonymous Learner',
        learner.email || 'N/A',
        score,
        sub.testResults?.passed || 0,
        sub.testResults?.total || 0,
        sub.status,
        sub.isFinalSubmission ? 'YES' : 'NO',
        violations,
        isFlagged ? 'FLAGGED' : 'CLEAN',
        formattedTime,
        new Date(sub.createdAt).toLocaleString(),
        sub.executionTimeMs || 0
      ]);

      row.height = 22;

      // Conditional formatting on score and integrity
      const scoreCell = row.getCell(3);
      if (score >= 80) {
        scoreCell.font = { color: { argb: 'FF16A34A' }, bold: true }; // Green
      } else if (score >= 50) {
        scoreCell.font = { color: { argb: 'FFCA8A04' }, bold: true }; // Yellow
      } else {
        scoreCell.font = { color: { argb: 'FFDC2626' }, bold: true }; // Red
      }

      const flagCell = row.getCell(9);
      if (isFlagged) {
        flagCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' } // Light red alert
        };
        flagCell.font = { color: { argb: 'FFB91C1C' }, bold: true };
      } else {
        flagCell.font = { color: { argb: 'FF15803D' } };
      }

      // Zebra striping
      if (idx % 2 === 1) {
        row.eachCell((cell, colNumber) => {
          if (colNumber !== 9 || !isFlagged) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' }
            };
          }
        });
      }

      row.alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
    });

    // 4. Summary Row
    const summaryRowIdx = worksheet.rowCount + 2;
    const avgScore = submissions.length > 0 ? (totalScoreSum / submissions.length).toFixed(1) : 0;

    worksheet.mergeCells(`A${summaryRowIdx}:B${summaryRowIdx}`);
    const summaryLabel = worksheet.getCell(`A${summaryRowIdx}`);
    summaryLabel.value = 'BATCH METRICS SUMMARY:';
    summaryLabel.font = { bold: true, size: 11, color: { argb: 'FF1E293B' } };
    summaryLabel.alignment = { horizontal: 'right', vertical: 'middle' };

    const avgCell = worksheet.getCell(`C${summaryRowIdx}`);
    avgCell.value = Number(avgScore);
    avgCell.font = { bold: true, size: 11, color: { argb: 'FF2563EB' } };
    avgCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.getCell(`I${summaryRowIdx}`).value = `${flaggedCount} Flagged`;
    worksheet.getCell(`I${summaryRowIdx}`).font = { bold: true, color: { argb: 'FFDC2626' } };
    worksheet.getCell(`I${summaryRowIdx}`).alignment = { horizontal: 'center', vertical: 'middle' };

    // Column widths auto-adjustment
    headers.forEach((h, i) => {
      worksheet.getColumn(i + 1).width = h.width;
    });

    return workbook.xlsx.writeBuffer();
  }
}

module.exports = new ExcelService();

