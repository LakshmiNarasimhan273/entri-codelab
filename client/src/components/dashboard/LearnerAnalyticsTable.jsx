import React from 'react';
import { ShieldAlert, CheckCircle, Clock, Calendar, AlertTriangle } from 'lucide-react';

export default function LearnerAnalyticsTable({ submissions = [], metrics = null }) {
  if (!submissions || submissions.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 font-mono text-xs">
        No candidate submissions recorded for this assessment yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metric summary banner */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Candidates</div>
            <div className="text-xl font-bold text-white mt-1">{metrics.totalCandidates}</div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Average Score</div>
            <div className="text-xl font-bold text-blue-400 mt-1">{metrics.averageScore}%</div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase">100% Solutions</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{metrics.perfectScores}</div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Flagged Violations</div>
            <div className={`text-xl font-bold mt-1 ${metrics.flaggedViolations > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {metrics.flaggedViolations}
            </div>
          </div>
        </div>
      )}

      {/* Submissions Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-slate-800/80 text-slate-400 text-[11px] font-mono uppercase border-b border-slate-700/80">
            <tr>
              <th className="py-3 px-4">Candidate</th>
              <th className="py-3 px-4">Score</th>
              <th className="py-3 px-4">Test Suite</th>
              <th className="py-3 px-4">Integrity Status</th>
              <th className="py-3 px-4">Time Spent</th>
              <th className="py-3 px-4">Submission Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {submissions.map((sub) => {
              const learner = sub.learnerId || {};
              const score = sub.score || 0;
              const antiCheat = sub.antiCheatSummary || {};
              const isFlagged = antiCheat.isFlagged || (antiCheat.totalViolations || 0) >= 5;
              const timeMins = Math.floor((sub.timeSpentSeconds || 0) / 60);
              const timeSecs = (sub.timeSpentSeconds || 0) % 60;

              return (
                <tr key={sub.id || sub._id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{learner.name || 'Learner'}</div>
                    <div className="text-[11px] font-mono text-slate-500">{learner.email || 'N/A'}</div>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold">
                    <span className={`px-2.5 py-1 rounded-md ${
                      score >= 80
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : score >= 50
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {score}%
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono">
                    <span className="text-emerald-400 font-semibold">{sub.testResults?.passed || 0}</span>
                    <span className="text-slate-500"> / {sub.testResults?.total || 0} passed</span>
                  </td>

                  <td className="py-3.5 px-4">
                    {isFlagged ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 text-[11px] font-mono font-semibold">
                        <ShieldAlert className="w-3 h-3 text-red-400" />
                        <span>FLAGGED ({antiCheat.totalViolations || 0} alerts)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span>VERIFIED CLEAN</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    <span className="inline-flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{timeMins}m {timeSecs}s</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                    <span className="inline-flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{new Date(sub.createdAt).toLocaleString()}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

