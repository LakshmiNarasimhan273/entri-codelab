import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useIdeStore } from '../../store/ideStore';
import { Lock, FileCode, CheckCircle2 } from 'lucide-react';

// Map file extensions to Monaco language identifiers
const getLanguageForPath = (path = '') => {
  if (path.endsWith('.js') || path.endsWith('.mjs')) return 'javascript';
  if (path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  return 'javascript';
};

// Convert file path to normalized Monaco URI
const getFileUri = (monaco, filePath) => {
  if (!monaco || !filePath) return null;
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return monaco.Uri.parse(`inmemory://workspace${cleanPath}`);
};

function MonacoWrapper({ readOnlyOverride = false }) {
  const editorRef = useRef(null);
  const monaco = useMonaco();
  const viewStatesRef = useRef({});
  const currentMountedFileRef = useRef('');
  const contentChangeSubRef = useRef(null);

  // Fine-grained Zustand selectors to prevent re-renders on keystrokes
  const activeFilePath = useIdeStore((s) => s.activeFilePath);
  const fileTree = useIdeStore((s) => s.fileTree);
  const challenge = useIdeStore((s) => s.challenge);
  const isFinalSubmitted = useIdeStore((s) => s.isFinalSubmitted);
  const recordViolation = useIdeStore((s) => s.recordViolation);
  const updateFileContent = useIdeStore((s) => s.updateFileContent);

  // Determine if active file is read-only
  const isReadOnly = useMemo(() => {
    if (readOnlyOverride || isFinalSubmitted) return true;
    if (!activeFilePath) return true;
    if (activeFilePath.startsWith('__tests__') || activeFilePath.includes('.test.') || activeFilePath.includes('.spec.')) {
      return true;
    }
    // Check flat scaffolding
    if (Array.isArray(challenge?.scaffolding)) {
      const match = challenge.scaffolding.find((f) => f.path === activeFilePath);
      if (match && match.isReadOnly) return true;
    }
    // Check hierarchical tree
    const checkTree = (nodes) => {
      for (const node of nodes) {
        if (node.path === activeFilePath) return node.isReadOnly;
        if (node.children) {
          const res = checkTree(node.children);
          if (res !== undefined) return res;
        }
      }
      return undefined;
    };
    if (fileTree && fileTree.length > 0) {
      const treeRes = checkTree(fileTree);
      if (treeRes !== undefined) return Boolean(treeRes);
    }
    return false;
  }, [activeFilePath, readOnlyOverride, isFinalSubmitted, challenge, fileTree]);

  const language = useMemo(() => getLanguageForPath(activeFilePath), [activeFilePath]);

  const editorOptions = useMemo(() => ({
    readOnly: isReadOnly,
    domReadOnly: isReadOnly,
    contextmenu: false,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    cursorBlinking: 'smooth',
    renderWhitespace: 'selection',
    formatOnPaste: false,
    formatOnType: false
  }), [isReadOnly]);

  // Expose global window.monaco
  useEffect(() => {
    if (monaco && typeof window !== 'undefined') {
      window.monaco = monaco;
    }
  }, [monaco]);

  // Synchronize initial models for files when challenge changes or monaco loads
  useEffect(() => {
    if (!monaco) return;

    const currentFiles = useIdeStore.getState().filesMap || {};
    Object.entries(currentFiles).forEach(([filePath, content]) => {
      const uri = getFileUri(monaco, filePath);
      if (!uri) return;

      let model = monaco.editor.getModel(uri);
      if (!model) {
        monaco.editor.createModel(content || '', getLanguageForPath(filePath), uri);
      }
    });
  }, [monaco, challenge]);

  // Clean Model Switch Protocol (Only invoked when navigating to a DIFFERENT file)
  const switchModel = useCallback((filePath, readOnlyState) => {
    const editor = editorRef.current;
    if (!editor || !monaco || !filePath) return;

    // 1. Save view state of previously mounted file
    const prevFile = currentMountedFileRef.current;
    if (prevFile && prevFile !== filePath) {
      viewStatesRef.current[prevFile] = editor.saveViewState();
    }

    // 2. Resolve or create target model
    const targetUri = getFileUri(monaco, filePath);
    let targetModel = monaco.editor.getModel(targetUri);
    if (!targetModel) {
      const initialContent = useIdeStore.getState().filesMap[filePath] || '';
      targetModel = monaco.editor.createModel(initialContent, getLanguageForPath(filePath), targetUri);
    }

    // 3. Dismount previous change listener to avoid cross-fire
    if (contentChangeSubRef.current) {
      contentChangeSubRef.current.dispose();
      contentChangeSubRef.current = null;
    }

    // 4. Safely mount model on editor
    editor.setModel(targetModel);

    // 5. Restore saved view state if available (cursor position, scroll)
    if (viewStatesRef.current[filePath]) {
      editor.restoreViewState(viewStatesRef.current[filePath]);
    } else {
      editor.focus();
    }

    // 6. Apply dynamic read-only locks AFTER model switch
    editor.updateOptions({
      readOnly: readOnlyState,
      domReadOnly: readOnlyState
    });

    // 7. Subscribe to model edits: update state without re-triggering setModel
    contentChangeSubRef.current = targetModel.onDidChangeContent(() => {
      if (!readOnlyState) {
        const updatedVal = targetModel.getValue();
        updateFileContent(filePath, updatedVal);
      }
    });

    currentMountedFileRef.current = filePath;
  }, [monaco, updateFileContent]);

  // File navigation watcher: ONLY switch models if user clicked a DIFFERENT file
  useEffect(() => {
    if (!editorRef.current || !monaco || !activeFilePath) return;

    if (currentMountedFileRef.current !== activeFilePath) {
      // User switched to a new file in tree
      switchModel(activeFilePath, isReadOnly);
    } else {
      // Same file, just update readOnly options dynamically without re-mounting model
      editorRef.current.updateOptions({
        readOnly: isReadOnly,
        domReadOnly: isReadOnly
      });
    }
  }, [activeFilePath, isReadOnly, monaco, switchModel]);

  const handleEditorDidMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    if (typeof window !== 'undefined') {
      window.monaco = monacoInstance;
    }

    // Global editor visual and behavioral preferences
    editor.updateOptions({
      fontFamily: "'Fira Code', 'Courier New', monospace",
      fontSize: 13,
      lineHeight: 20,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      cursorBlinking: 'smooth',
      renderWhitespace: 'selection',
      formatOnPaste: false,
      formatOnType: false,
      contextmenu: false
    });

    // Anti-Cheat: Intercept copy, cut, paste inside Monaco widget
    editor.onKeyDown((e) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      // KeyCode 33 is 'C', 52 is 'V', 54 is 'X'
      if (isCtrlOrMeta && (e.keyCode === 33 || e.keyCode === 52 || e.keyCode === 54)) {
        e.preventDefault();
        e.stopPropagation();
        const type = e.keyCode === 33 ? 'COPY_ATTEMPT' : (e.keyCode === 52 ? 'PASTE_ATTEMPT' : 'CUT_ATTEMPT');
        recordViolation(type);
      }
    });

    // If an active file is already selected, mount its model once
    if (activeFilePath && currentMountedFileRef.current !== activeFilePath) {
      switchModel(activeFilePath, isReadOnly);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (contentChangeSubRef.current) {
        contentChangeSubRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] relative">
      {/* File Tab Bar Header */}
      <div className="h-9 bg-[#181818] border-b border-slate-800 flex items-center justify-between px-3">
        <div className="flex items-center space-x-2">
          <FileCode className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-mono font-medium text-slate-200">
            {activeFilePath || 'No file selected'}
          </span>
          {isReadOnly && (
            <span className="flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              <Lock className="w-2.5 h-2.5" />
              <span>Read-Only Test Suite</span>
            </span>
          )}
          {isFinalSubmitted && (
            <span className="flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>Submitted & Locked</span>
            </span>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-500">
          {language.toUpperCase()} | UTF-8
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 relative overflow-hidden">
        {activeFilePath ? (
          <Editor
            height="100%"
            theme="vs-dark"
            onMount={handleEditorDidMount}
            options={editorOptions}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
            Select a file from the explorer to view code.
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(MonacoWrapper);
