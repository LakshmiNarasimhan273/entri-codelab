import { create } from 'zustand';

// Helper to extract flat file map from tree
const extractFilesMap = (nodes, map = {}) => {
  for (const node of nodes) {
    if (node.type === 'file') {
      map[node.path] = node.content || '';
    } else if (node.children) {
      extractFilesMap(node.children, map);
    }
  }
  return map;
};

// Helper to find initial active editable file
const findDefaultFile = (nodes) => {
  for (const node of nodes) {
    if (node.type === 'file' && !node.isReadOnly && !node.path.startsWith('__tests__')) {
      return node.path;
    }
    if (node.children) {
      const nested = findDefaultFile(node.children);
      if (nested) return nested;
    }
  }
  return nodes[0]?.path || '';
};

export const useIdeStore = create((set, get) => ({
  challenge: null,
  fileTree: [],
  filesMap: {},
  activeFilePath: '',
  testResults: null,
  terminalLogs: ['[Antigravity IDE Ready] Select a file to begin coding.'],
  isExecuting: false,
  executionStatus: 'IDLE', // 'IDLE' | 'EVALUATING' | 'COMPLETED' | 'FAILED'
  executionProgress: 0,
  activeSubmissionId: null,
  isFinalSubmitted: false,
  isSubmitting: false,
  isTryMode: false,
  timeSpentSeconds: 0,
  antiCheatViolations: {
    copyCount: 0,
    pasteCount: 0,
    tabSwitchCount: 0,
    blurCount: 0,
    fullscreenExitCount: 0,
    total: 0
  },
  isFullscreen: false,

  setChallenge: (challenge, existingSubmission = null, isTryMode = false) => {
    const fileTree = challenge.scaffoldingTree || [];
    let filesMap = extractFilesMap(fileTree);

    // If flat scaffolding exists and filesMap is empty, populate from flat list
    if (Object.keys(filesMap).length === 0 && Array.isArray(challenge.scaffolding)) {
      challenge.scaffolding.forEach((f) => {
        if (!f.isHidden) {
          filesMap[f.path] = f.content || '';
        }
      });
    }

    // If existing submission has edited code, merge it
    if (existingSubmission?.submittedCode) {
      filesMap = {
        ...filesMap,
        ...existingSubmission.submittedCode
      };
    }

    let defaultFile = findDefaultFile(fileTree);
    if (!defaultFile && Object.keys(filesMap).length > 0) {
      defaultFile = Object.keys(filesMap).find((p) => !p.startsWith('__tests__') && !p.includes('.test.')) || Object.keys(filesMap)[0];
    }

    set({
      challenge,
      fileTree,
      filesMap,
      activeFilePath: defaultFile,
      isTryMode: !!isTryMode,
      isSubmitting: false,
      testResults: existingSubmission?.testResults || null,
      isFinalSubmitted: existingSubmission?.isFinalSubmission || false,
      timeSpentSeconds: existingSubmission?.timeSpentSeconds || 0,
      antiCheatViolations: {
        copyCount: existingSubmission?.antiCheatSummary?.copyCount || 0,
        pasteCount: existingSubmission?.antiCheatSummary?.pasteCount || 0,
        tabSwitchCount: existingSubmission?.antiCheatSummary?.tabSwitchCount || 0,
        blurCount: existingSubmission?.antiCheatSummary?.blurCount || 0,
        fullscreenExitCount: existingSubmission?.antiCheatSummary?.fullscreenExitCount || 0,
        total: existingSubmission?.antiCheatSummary?.totalViolations || 0
      },
      terminalLogs: existingSubmission?.testResults?.rawOutput
        ? [`[Assessment Loaded] Previous score: ${existingSubmission.score}%`, existingSubmission.testResults.rawOutput]
        : ['[Antigravity IDE Initialized] Workspace mounted. Sandbox ready.']
    });
  },

  setActiveFile: (filePath) => {
    set({ activeFilePath: filePath });
  },

  updateFileContent: (filePath, newContent) => {
    const { filesMap, isFinalSubmitted } = get();
    if (isFinalSubmitted) return; // Prevent edits once submitted

    // Prevent modifying read-only test files
    if (filePath.startsWith('__tests__') || filePath.includes('.test.')) {
      return;
    }

    set({
      filesMap: {
        ...filesMap,
        [filePath]: newContent
      }
    });
  },

  appendTerminalLog: (log) => {
    set((state) => ({
      terminalLogs: [...state.terminalLogs, log]
    }));
  },

  clearTerminal: () => {
    set({ terminalLogs: [] });
  },

  setIsExecuting: (val, submissionId = null) => {
    set((state) => ({
      isExecuting: val,
      executionStatus: val ? 'EVALUATING' : state.executionStatus,
      activeSubmissionId: submissionId,
      executionProgress: val ? 10 : 100,
      ...(val ? { testResults: null } : {})
    }));
  },

  setExecutionStatus: (status) => {
    set({ executionStatus: status });
  },

  setExecutionProgress: (progress, message = '') => {
    set((state) => ({
      executionProgress: progress,
      terminalLogs: message ? [...state.terminalLogs, `[Execution Progress ${progress}%] ${message}`] : state.terminalLogs
    }));
  },

  setTestResults: (results) => {
    set({
      testResults: results,
      isExecuting: false,
      executionStatus: 'COMPLETED',
      executionProgress: 100
    });
  },

  setIsFinalSubmitted: (val) => {
    set({ isFinalSubmitted: val });
  },

  setIsSubmitting: (val) => {
    set({ isSubmitting: val });
  },

  setIsTryMode: (val) => {
    set({ isTryMode: val });
  },

  incrementTimeSpent: () => {
    set((state) => ({ timeSpentSeconds: state.timeSpentSeconds + 1 }));
  },

  recordViolation: (type) => {
    set((state) => {
      const v = { ...state.antiCheatViolations };
      v.total += 1;
      if (type === 'COPY_ATTEMPT') v.copyCount += 1;
      if (type === 'PASTE_ATTEMPT') v.pasteCount += 1;
      if (type === 'TAB_SWITCH') v.tabSwitchCount += 1;
      if (type === 'WINDOW_BLUR') v.blurCount += 1;
      if (type === 'FULLSCREEN_EXIT') v.fullscreenExitCount += 1;
      return { antiCheatViolations: v };
    });
  },

  setIsFullscreen: (val) => {
    set({ isFullscreen: val });
  }
}));

