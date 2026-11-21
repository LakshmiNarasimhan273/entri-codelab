import React, { useState, useEffect } from 'react';
import { useIdeStore } from '../../store/ideStore';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Trophy,
  ShieldAlert,
  Eye,
  Filter
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function TestResultsPanel() {
  const { testResults, isExecuting, executionStatus, isTryMode } = useIdeStore();
  const [tierFilter, setTierFilter] = useState('ALL'); // 'ALL' | 'SAMPLE' | 'HIDDEN'

  useEffect(() => {
    if (testResults?.score === 100 && testResults?.passed > 0) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  }, [testResults]);

  if (isExecuting || executionStatus === 'EVALUATING') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-950 font-mono text-xs space-y-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="space-y-1">
          <p className="font-bold text-white text-xs flex items-center justify-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>[EVALUATING] TEST RUNNER ACTIVE</span>
          </p>
          <p className="text-[11px] text-slate-500">
            Executing Jest test suites in isolated sandbox container...
          </p>
        </div>
      </div>
    );
  }

  if (!testResults) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 bg-slate-950 font-mono text-xs">
        <AlertCircle className="w-8 h-8 mb-2 text-slate-600" />
        <p className="font-medium text-slate-400">No test results yet</p>
        <p className="text-[11px] text-slate-600 mt-1">
          Click "Run Tests" in the action bar to evaluate your solution against the Jest test suite.
        </p>
      </div>
    );
  }

  const {
    total = 0,
    passed = 0,
    failed = 0,
    score = 0,
    samplePassed = 0,
    sampleTotal = 0,
    hiddenPassed = 0,
    hiddenTotal = 0,
    suites = [],
    executionTimeMs = 0
  } = testResults || {};

  const filteredSuites = suites.filter((suite) => {
    if (tierFilter === 'SAMPLE') return suite.tier === 'SAMPLE' || !suite.isHidden;
    if (tierFilter === 'HIDDEN') return suite.tier === 'HIDDEN' || suite.isHidden;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-y-auto p-4 space-y-4">
      {/* Scorecard Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border ${
              score === 100
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : score >= 50
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}
          >
            {score}%
          </div>

          <div>
            <div className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Dual-Tier Jest Evaluation</span>
              {score === 100 && (
                <span className="flex items-center text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  <Trophy className="w-3 h-3 mr-1" />
                  All Tests Passed
                </span>
              )}
              {isTryMode && (
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30">
                  Try IDE Preview
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center space-x-3">
              <span>
                {passed} of {total} passed
              </span>
              <span>•</span>
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1 text-slate-500" />
                {executionTimeMs}ms
              </span>
            </div>
          </div>
        </div>

        {/* Dual-Tier Breakdown Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sample tier */}
          <div className="px-3 py-1.5 rounded-md bg-blue-950/40 border border-blue-800/40 text-center">
            <div className="text-xs font-bold text-blue-400">
              {samplePassed} / {sampleTotal || Math.max(1, samplePassed)}
            </div>
            <div className="text-[10px] uppercase font-mono text-blue-400/80 flex items-center justify-center space-x-1">
              <Eye className="w-2.5 h-2.5" />
              <span>Sample Tests</span>
            </div>
          </div>

          {/* Evaluator tier */}
          <div className="px-3 py-1.5 rounded-md bg-purple-950/40 border border-purple-800/40 text-center">
            <div className="text-xs font-bold text-purple-400">
              {hiddenPassed} / {hiddenTotal || Math.max(1, hiddenPassed)}
            </div>
            <div className="text-[10px] uppercase font-mono text-purple-400/80 flex items-center justify-center space-x-1">
              <ShieldAlert className="w-2.5 h-2.5" />
              <span>Evaluator Tests</span>
            </div>
          </div>

          {/* Overall pass badge */}
          <div className="px-3 py-1.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-center">
            <div className="text-xs font-bold text-emerald-400">{passed}</div>
            <div className="text-[10px] uppercase font-mono text-emerald-500/80">Passed</div>
          </div>

          {/* Overall fail badge */}
          <div className="px-3 py-1.5 rounded-md bg-red-950/60 border border-red-800/60 text-center">
            <div className="text-xs font-bold text-red-400">{failed}</div>
            <div className="text-[10px] uppercase font-mono text-red-500/80">Failed</div>
          </div>
        </div>
      </div>

      {/* Filter and Test Suite List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Assertions Breakdown ({filteredSuites.length})
          </h4>

          <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-[11px]">
            <button
              onClick={() => setTierFilter('ALL')}
              className={`px-2 py-0.5 rounded font-medium transition ${
                tierFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({suites.length})
            </button>
            <button
              onClick={() => setTierFilter('SAMPLE')}
              className={`px-2 py-0.5 rounded font-medium transition ${
                tierFilter === 'SAMPLE' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sample Tests
            </button>
            <button
              onClick={() => setTierFilter('HIDDEN')}
              className={`px-2 py-0.5 rounded font-medium transition ${
                tierFilter === 'HIDDEN' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Evaluator Tests
            </button>
          </div>
        </div>

        {filteredSuites.map((suite, idx) => {
          const isPassed = suite.status === 'passed';
          const isHiddenTier = suite.tier === 'HIDDEN' || suite.isHidden;

          return (
            <div
              key={idx}
              className={`border rounded-lg p-3 transition ${
                isPassed ? 'bg-slate-900/60 border-slate-800' : 'bg-red-950/20 border-red-900/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}

                  <span className={`text-xs font-medium ${isPassed ? 'text-slate-200' : 'text-red-200'}`}>
                    {suite.title}
                  </span>

                  {isHiddenTier ? (
                    <span className="flex items-center space-x-1 text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 font-mono">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      <span>Evaluator</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30 font-mono">
                      <Eye className="w-2.5 h-2.5" />
                      <span>Sample</span>
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-mono text-slate-500">{suite.durationMs || 0}ms</span>
              </div>

              {/* Failure Error Messages */}
              {!isPassed && suite.failureMessages && suite.failureMessages.length > 0 && (
                <div className="mt-2.5 p-2.5 rounded bg-black/60 border border-red-900/40 text-[11px] font-mono text-red-300 overflow-x-auto whitespace-pre-wrap">
                  {suite.failureMessages.join('\n')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
