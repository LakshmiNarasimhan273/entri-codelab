import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { challengeApi } from '../api/challengeApi';
import { submissionApi } from '../api/submissionApi';
import { useIdeStore } from '../store/ideStore';
import { useProctoringStore } from '../store/proctoringStore';
import { useAntiCheat } from '../hooks/useAntiCheat';
import { useSocket } from '../hooks/useSocket';
import { getActiveMonacoCodeMap } from '../utils/monacoModels';

import FileTree from '../components/ide/FileTree';
import MonacoWrapper from '../components/ide/MonacoWrapper';
import TerminalOutput from '../components/ide/TerminalOutput';
import TestResultsPanel from '../components/ide/TestResultsPanel';
import AntiCheatBanner from '../components/ide/AntiCheatBanner';

import {
  Play,
  CheckCircle,
  Clock,
  Terminal as TerminalIcon,
  CheckSquare,
  Lock,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  FlaskConical,
  X,
  ShieldCheck
} from 'lucide-react';

export default function LearnerAssessmentPage() {
  const { id: challengeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isTryModeParam = searchParams.get('mode') === 'try_ide' || searchParams.get('mode') === 'try';

  const {
    challenge,
    setChallenge,
    timeSpentSeconds,
    incrementTimeSpent,
    isExecuting,
    setIsExecuting,
    setExecutionStatus,
    activeSubmissionId,
    isFinalSubmitted,
    setIsFinalSubmitted,
    isSubmitting,
    setIsSubmitting,
    isTryMode,
    setIsTryMode,
    appendTerminalLog,
    testResults,
    setTestResults,
    resetIdeSession
  } = useIdeStore();

  const [bottomTab, setBottomTab] = useState('tests'); // 'tests' | 'terminal' | 'instructions'
  const [violationModalMessage, setViolationModalMessage] = useState(null);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const pollIntervalRef = useRef(null);

  // Set Try Mode from URL
  useEffect(() => {
    if (isTryModeParam) {
      setIsTryMode(true);
    }
  }, [isTryModeParam, setIsTryMode]);

  // Clean up watchers and session when unmounting
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      resetIdeSession();
    };
  }, [resetIdeSession]);

  // Hybrid Polling Fallback Watcher (Prevents Stuck UI even if WebSockets are interrupted)
  const startExecutionWatcher = useCallback((subId) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    const startTime = Date.now();
    pollIntervalRef.current = setInterval(async () => {
      try {
        // 15-second safety cutoff: guarantee UI never remains in stuck Running state
        if (Date.now() - startTime > 15000) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setIsExecuting(false);
          setExecutionStatus('FAILED');
          appendTerminalLog('[TIMEOUT] Ephemeral container execution completed or timed out.');
          return;
        }

        const res = await submissionApi.getStatus(subId);
        const subData = res?.data || res;
        if (subData && (subData.status === 'COMPLETED' || subData.testResults)) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setTestResults(subData.testResults);
          setIsExecuting(false);
          setExecutionStatus('COMPLETED');
          appendTerminalLog(`[EVALUATION COMPLETE] Final Score: ${subData.score || 0}%`);
        } else if (subData && subData.status === 'FAILED') {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setIsExecuting(false);
          setExecutionStatus('FAILED');
          appendTerminalLog(`[EXECUTION FAILED] ${subData.testResults?.rawOutput || 'Execution failure.'}`);
        }
      } catch (pollErr) {
        // Continue polling until timeout
      }
    }, 800);
  }, [setIsExecuting, setExecutionStatus, setTestResults, appendTerminalLog]);

  // 1. Initialize Anti-Cheat Surveillance Hook (bypassed in Try IDE mode or when submitted)
  const { requestFullscreen } = useAntiCheat({
    challengeId,
    enabled: !isFinalSubmitted && !isTryModeParam,
    onViolationAlert: (type) => {
      setViolationModalMessage(
        `Anti-Cheat Policy Notice: ${type} intercepted. Focus shifts and clipboard interactions are audited.`
      );
    }
  });

  // 2. Initialize Real-Time WebSockets
  const { joinSubmissionRoom } = useSocket(activeSubmissionId);

  // 3. Load Challenge Data and Existing Assessment State
  useEffect(() => {
    let timerInterval = null;

    const initAssessment = async () => {
      try {
        const [challengeRes, stateRes] = await Promise.all([
          challengeApi.getById(challengeId),
          submissionApi.getMyState(challengeId).catch(() => ({ data: null }))
        ]);

        const challengeData = challengeRes.data;
        const existingSubmission = stateRes.data;

        setChallenge(challengeData, existingSubmission, isTryModeParam);

        if (existingSubmission?.id || existingSubmission?._id) {
          joinSubmissionRoom(existingSubmission.id || existingSubmission._id);
        }

        // Auto request fullscreen on assessment entry if learner mode
        if (!isTryModeParam && !existingSubmission?.isFinalSubmission) {
          setTimeout(() => {
            requestFullscreen();
          }, 1000);
        }
      } catch (err) {
        console.error('Failed to load assessment room:', err);
      }
    };

    initAssessment();

    // Timer Interval
    timerInterval = setInterval(() => {
      incrementTimeSpent();
    }, 1000);

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [challengeId, isTryModeParam]);

  // Format timer seconds into MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Run Tests Action
  const handleRunTests = async () => {
    if (isExecuting || isFinalSubmitted) return;

    // 1. Iterate over all active Monaco models before triggering execution payload
    const activeCode = getActiveMonacoCodeMap(useIdeStore.getState().filesMap);

    // 2. Instantly reset terminal UI state to 'EVALUATING'
    setIsExecuting(true);
    setExecutionStatus('EVALUATING');
    setBottomTab('tests');
    const runContext = isTryMode ? 'TRY_IDE_SANDBOX' : 'LEARNER_SUBMISSION_SANDBOX';
    appendTerminalLog(`[EVALUATING] Packaging latest Monaco editor models for ${runContext} dispatch...`);

    try {
      const res = await submissionApi.runTests(challengeId, activeCode, timeSpentSeconds, isTryMode, runContext);
      const submissionId = res.data.submissionId;
      setIsExecuting(true, submissionId);
      joinSubmissionRoom(submissionId);
      startExecutionWatcher(submissionId);
    } catch (err) {
      setIsExecuting(false);
      setExecutionStatus('FAILED');
      appendTerminalLog(`[ERROR] Test run failed: ${err.response?.data?.message || err.message}`);
    }
  };

  // Final Assessment Submission Action (In-App Dialog Confirmation)
  const openSubmitConfirmation = () => {
    if (isFinalSubmitted || isSubmitting) return;
    setIsConfirmSubmitOpen(true);
  };

  const handleConfirmFinalSubmit = async () => {
    setIsConfirmSubmitOpen(false);

    // 1. Iterate over all active Monaco models before triggering execution payload
    const activeCode = getActiveMonacoCodeMap(useIdeStore.getState().filesMap);

    // 2. Guard anti-cheat proctoring against false-positives
    useProctoringStore.getState().setIsSubmitting(true);
    setIsSubmitting(true);
    setIsSubmittingFinal(true);

    // 3. Reset terminal UI state to 'EVALUATING'
    setIsExecuting(true);
    setExecutionStatus('EVALUATING');
    setBottomTab('tests');
    appendTerminalLog('[EVALUATING] Executing dual-tier Jest evaluation suites and persisting scorecard...');

    try {
      const res = await submissionApi.submitFinal(challengeId, activeCode, timeSpentSeconds, isTryMode);
      setIsFinalSubmitted(true);
      const submissionId = res.data.submissionId;
      setIsExecuting(true, submissionId);
      joinSubmissionRoom(submissionId);
      startExecutionWatcher(submissionId);
    } catch (err) {
      setExecutionStatus('FAILED');
      appendTerminalLog(`[SUBMISSION ERROR] ${err.response?.data?.message || err.message}`);
      alert(err.response?.data?.message || 'Failed to submit final assessment.');
      setIsExecuting(false);
    } finally {
      setIsSubmittingFinal(false);
      setIsSubmitting(false);
      useProctoringStore.getState().setIsSubmitting(false);
    }
  };

  if (!challenge) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 font-mono text-xs text-slate-400">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p>Provisioning assessment workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-slate-950 overflow-hidden proctor-locked">
      {/* Mentor Try IDE Sandbox Banner */}
      {isTryMode && (
        <div className="bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-blue-900/90 border-b border-purple-500/40 px-4 py-1 text-xs text-purple-200 flex items-center justify-between font-mono z-30">
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
            <span className="font-bold">TRY_IDE_SANDBOX (Mentor Preview Mode):</span>
            <span>Runs execute in volatile memory. Submissions will NOT pollute candidate records.</span>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-[11px] bg-purple-950/80 hover:bg-purple-900 px-2 py-0.5 rounded border border-purple-500/40 text-purple-200 transition"
          >
            Exit Preview
          </button>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/95 px-4 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <div>
            <h2 className="text-xs font-bold text-white truncate max-w-xs md:max-w-md">
              {challenge.title}
            </h2>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
              <span className="text-blue-400">{challenge.stack}</span>
              <span>•</span>
              <span>{challenge.difficulty}</span>
            </div>
          </div>
        </div>

        {/* Center: Proctor & Anti-Cheat Status */}
        <div className="hidden md:flex items-center">
          {!isTryMode ? (
            <AntiCheatBanner onRequestFullscreen={requestFullscreen} />
          ) : (
            <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/30 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Proctoring Inactive (Preview Mode)</span>
            </span>
          )}
        </div>

        {/* Right: Timer & Execution Action Buttons */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{formatTime(timeSpentSeconds)}</span>
          </div>

          <button
            onClick={handleRunTests}
            disabled={isExecuting || isFinalSubmitted}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isExecuting ? 'Running...' : 'Run Tests'}</span>
          </button>

          {!isFinalSubmitted ? (
            <button
              onClick={openSubmitConfirmation}
              disabled={isExecuting || isSubmittingFinal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{isTryMode ? 'Submit (Preview)' : 'Submit Assessment'}</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-emerald-400 text-xs font-mono font-semibold border border-emerald-500/30">
              <Lock className="w-3.5 h-3.5" />
              <span>Finalized</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Split-Pane Workspace: Left (Explorer) | Center (Monaco Editor) | Bottom (Terminal / Tests) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Region: File Explorer + Monaco Editor */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Explorer Sidebar */}
          <div className="w-64 shrink-0 border-r border-slate-800 hidden sm:block">
            <FileTree />
          </div>

          {/* Monaco Editor Center View */}
          <div className="flex-1 relative overflow-hidden">
            <MonacoWrapper />
          </div>
        </div>

        {/* Bottom Panel: Tabbed Test Results, Console, Instructions */}
        <div className="h-64 border-t border-slate-800 bg-slate-950 flex flex-col shrink-0">
          {/* Bottom Tabs Header */}
          <div className="h-8 border-b border-slate-800 bg-slate-900/80 px-3 flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setBottomTab('tests')}
                className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded transition ${
                  bottomTab === 'tests'
                    ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Test Results</span>
                {testResults && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      testResults.score === 100
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {testResults.score}%
                  </span>
                )}
              </button>

              <button
                onClick={() => setBottomTab('terminal')}
                className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded transition ${
                  bottomTab === 'terminal'
                    ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5" />
                <span>Live Terminal</span>
              </button>

              <button
                onClick={() => setBottomTab('instructions')}
                className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded transition ${
                  bottomTab === 'instructions'
                    ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Problem Statement</span>
              </button>
            </div>

            <div className="text-[10px] font-mono text-slate-500">
              Ephemeral Sandbox: {isTryMode ? 'Volatile Memory (Try IDE)' : 'Isolated Container Runner'}
            </div>
          </div>

          {/* Bottom Panel Content */}
          <div className="flex-1 overflow-hidden relative">
            {bottomTab === 'tests' && <TestResultsPanel />}
            {bottomTab === 'terminal' && <TerminalOutput />}
            {bottomTab === 'instructions' && (
              <div className="h-full overflow-y-auto p-4 font-sans text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                {challenge.description}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-App Confirmation Modal for Final Submission (Prevents OS window.blur anti-cheat trigger) */}
      {isConfirmSubmitOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5 text-emerald-400">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold text-white">Finalize & Submit Assessment?</h3>
              </div>
              <button
                onClick={() => setIsConfirmSubmitOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Once submitted, your workspace will be permanently locked and evaluated against both
              <strong className="text-white"> Sample Test Cases</strong> and
              <strong className="text-white"> Hidden Evaluator Test Cases</strong>.
            </p>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              Ensure you have tested all edge cases and boundary conditions before finalizing.
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmSubmitOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Return to Coding
              </button>
              <button
                type="button"
                onClick={handleConfirmFinalSubmit}
                disabled={isSubmittingFinal}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20"
              >
                {isSubmittingFinal ? 'Evaluating & Submitting...' : 'Yes, Submit Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anti-Cheat Violation Alert Modal */}
      {violationModalMessage && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Security Proctor Alert</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {violationModalMessage}
            </p>
            <p className="text-[11px] text-slate-400">
              External clipboard access, window blurring, and tab switches are logged and forwarded to your evaluator.
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setViolationModalMessage(null);
                  requestFullscreen();
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition"
              >
                Acknowledge & Return to Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
