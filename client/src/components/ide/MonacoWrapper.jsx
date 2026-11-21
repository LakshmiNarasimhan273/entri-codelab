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

export default function MonacoWrapper({ readOnlyOverride = false }) {
  const editorRef = useRef(null);
  const monaco = useMonaco();
  const viewStatesRef = useRef({});
  const prevActiveFileRef = useRef('');
  const contentChangeSubRef = useRef(null);

  const {
    activeFilePath,
    filesMap,
    fileTree,
    challenge,
    updateFileContent,
    isFinalSubmitted,
    recordViolation
  } = useIdeStore();

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

  // Synchronize and instantiate individual ITextModel for every file in the workspace
  useEffect(() => {
    if (!monaco) return;
    if (typeof window !== 'undefined') {
      window.monaco = monaco;
    }
    if (!filesMap) return;

    Object.entries(filesMap).forEach(([filePath, content]) => {
      const uri = getFileUri(monaco, filePath);
      if (!uri) return;

      let model = monaco.editor.getModel(uri);
      if (!model) {
        model = monaco.editor.createModel(content || '', getLanguageForPath(filePath), uri);
      } else if (filePath !== activeFilePath && model.getValue() !== content) {
        // Only sync background model if content changed externally
        model.setValue(content || '');
      }
    });
  }, [monaco, filesMap, activeFilePath]);

  // Clean Model Switch Protocol
  const switchModel = useCallback((filePath, readOnlyState) => {
    const editor = editorRef.current;
    if (!editor || !monaco || !filePath) return;

    // 1. Save current view state before switching
    if (prevActiveFileRef.current && prevActiveFileRef.current !== filePath) {
      viewStatesRef.current[prevActiveFileRef.current] = editor.saveViewState();
    }

    // 2. Resolve or create target model
    const targetUri = getFileUri(monaco, filePath);
    let targetModel = monaco.editor.getModel(targetUri);
    if (!targetModel) {
      const initialContent = filesMap[filePath] || '';
      targetModel = monaco.editor.createModel(initialContent, getLanguageForPath(filePath), targetUri);
    }

    // 3. Dismount previous change listener to avoid cross-fire
    if (contentChangeSubRef.current) {
      contentChangeSubRef.current.dispose();
      contentChangeSubRef.current = null;
    }

    // 4. Safely set model on editor
    editor.setModel(targetModel);

    // 5. Restore saved view state if available
    if (viewStatesRef.current[filePath]) {
      editor.restoreViewState(viewStatesRef.current[filePath]);
    }

    // 6. Apply dynamic read-only locks AFTER model switch
    editor.updateOptions({
      readOnly: readOnlyState,
      domReadOnly: readOnlyState
    });

    // 7. Subscribe to model edits for the active file
    contentChangeSubRef.current = targetModel.onDidChangeContent(() => {
      if (!readOnlyState) {
        const updatedVal = targetModel.getValue();
        updateFileContent(filePath, updatedVal);
      }
    });

    prevActiveFileRef.current = filePath;
  }, [monaco, filesMap, updateFileContent]);

  // React to activeFilePath or read-only status changes
  useEffect(() => {
    if (editorRef.current && monaco && activeFilePath) {
      switchModel(activeFilePath, isReadOnly);
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
      contextmenu: false // Disable Monaco's internal right-click context menu
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

    // If an active file is already selected, mount its model immediately
    if (activeFilePath) {
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
            options={{
              readOnly: isReadOnly,
              domReadOnly: isReadOnly,
              contextmenu: false
            }}
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
