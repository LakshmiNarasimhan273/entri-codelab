import React, { useState, useEffect } from 'react';
import { challengeApi } from '../../api/challengeApi';
import {
  Code2,
  Plus,
  Trash2,
  Save,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Layers,
  FileText,
  Edit3,
  RotateCcw,
  FlaskConical,
  ShieldAlert,
  Sparkles,
  FilePlus,
  Eraser,
  X
} from 'lucide-react';

const STACK_PRESETS = {
  JS: {
    label: 'Pure JavaScript (Algorithms & Functions)',
    scaffolding: [
      {
        name: 'solution.js',
        path: 'solution.js',
        isReadOnly: false,
        isHidden: false,
        content: `/**
 * Solution Function
 * @param {*} input - Problem input
 * @return {*} Output
 */
function solution(input) {
  // Write your algorithm here
  return input;
}

module.exports = { solution };`
      }
    ],
    sampleTests: `const { solution } = require('./solution');

describe('Sample Test Suite', () => {
  test('Sample TC01: Basic input assertion', () => {
    expect(solution('sample')).toBe('sample');
  });

  test('Sample TC02: Returns defined value', () => {
    expect(solution(42)).toBe(42);
  });
});`,
    hiddenTests: `const { solution } = require('./solution');

describe('Hidden Evaluator Suite', () => {
  test('Hidden TC03: Edge case or null parameter', () => {
    expect(solution(null)).toBe(null);
  });

  test('Hidden TC04: Array or object parameter', () => {
    expect(solution([1, 2, 3])).toEqual([1, 2, 3]);
  });
});`
  },
  HTML_CSS_JS: {
    label: 'Frontend: HTML, CSS, Vanilla JS',
    scaffolding: [
      {
        name: 'index.html',
        path: 'index.html',
        isReadOnly: false,
        isHidden: false,
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Assessment Workspace</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div id="app">
    <h1 id="title">Welcome</h1>
    <button id="action-btn">Click Me</button>
  </div>
  <script src="script.js"></script>
</body>
</html>`
      },
      {
        name: 'style.css',
        path: 'style.css',
        isReadOnly: false,
        isHidden: false,
        content: `body {
  font-family: sans-serif;
  margin: 0;
  padding: 2rem;
  background-color: #0f172a;
  color: #f8fafc;
}`
      },
      {
        name: 'script.js',
        path: 'script.js',
        isReadOnly: false,
        isHidden: false,
        content: `// Implement DOM interaction logic here
const title = document.getElementById('title');
const btn = document.getElementById('action-btn');

if (btn) {
  btn.addEventListener('click', () => {
    if (title) title.textContent = 'Updated!';
  });
}`
      }
    ],
    sampleTests: `describe('Sample DOM Suite', () => {
  test('Sample TC01: Title element is rendered', () => {
    const title = document.getElementById('title');
    expect(title).toBeDefined();
  });
});`,
    hiddenTests: `describe('Hidden Evaluator DOM Suite', () => {
  test('Hidden TC02: Button click modifies title', () => {
    const btn = document.getElementById('action-btn');
    const title = document.getElementById('title');
    if (btn) btn.click();
    expect(title ? title.textContent : '').toBe('Updated!');
  });
});`
  },
  REACT: {
    label: 'Frontend: React.js (Components & State)',
    scaffolding: [
      {
        name: 'App.jsx',
        path: 'src/App.jsx',
        isReadOnly: false,
        isHidden: false,
        content: `import React, { useState } from 'react';

export default function App() {
  const [value, setValue] = useState('Active');

  return (
    <div className="app-container">
      <h2 data-testid="heading">{value}</h2>
      <button onClick={() => setValue('Changed')}>Toggle</button>
    </div>
  );
}`
      }
    ],
    sampleTests: `import React from 'react';
import App from '../src/App';

describe('Sample React Suite', () => {
  test('Sample TC01: App exports a functional component', () => {
    expect(typeof App).toBe('function');
  });
});`,
    hiddenTests: `import React from 'react';
import App from '../src/App';

describe('Hidden Evaluator React Suite', () => {
  test('Hidden TC02: Root container rendered', () => {
    const el = App();
    expect(el.props.className).toBe('app-container');
  });
});`
  },
  NODE_EXPRESS: {
    label: 'Backend: Node.js + Express API Engine',
    scaffolding: [
      {
        name: 'server.js',
        path: 'server.js',
        isReadOnly: false,
        isHidden: false,
        content: `const express = require('express');
const app = express();
app.use(express.json());

// Example API Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;`
      }
    ],
    sampleTests: `const app = require('../server');

describe('Sample Express API Suite', () => {
  test('Sample TC01: App instance is exported', () => {
    expect(typeof app).toBe('function');
  });
});`,
    hiddenTests: `const app = require('../server');

describe('Hidden Evaluator API Suite', () => {
  test('Hidden TC02: Router instance defined', () => {
    expect(app._router).toBeDefined();
  });
});`
  }
};

export default function ChallengeEditor({ challengeToEdit = null, onCreated, onUpdated, onCancel }) {
  const isEditing = Boolean(challengeToEdit);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [stack, setStack] = useState('JS');
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Scaffolding state
  const [scaffolding, setScaffolding] = useState(STACK_PRESETS.JS.scaffolding);
  const [editingFileIndex, setEditingFileIndex] = useState(0);
  const [newFilePath, setNewFilePath] = useState('');

  // Dual-Tier Test Suite State
  const [activeTestTab, setActiveTestTab] = useState('sample'); // 'sample' | 'hidden'
  const [sampleTests, setSampleTests] = useState(STACK_PRESETS.JS.sampleTests);
  const [hiddenTests, setHiddenTests] = useState(STACK_PRESETS.JS.hiddenTests);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Populate form if editing existing challenge
  useEffect(() => {
    if (challengeToEdit) {
      setTitle(challengeToEdit.title || '');
      setDescription(challengeToEdit.description || '');
      setDifficulty(challengeToEdit.difficulty || 'MEDIUM');
      setStack(challengeToEdit.stack || 'JS');
      setDurationMinutes(challengeToEdit.durationMinutes || 60);

      const scaf = challengeToEdit.scaffolding && challengeToEdit.scaffolding.length > 0
        ? challengeToEdit.scaffolding
        : (STACK_PRESETS[challengeToEdit.stack]?.scaffolding || STACK_PRESETS.JS.scaffolding);
      setScaffolding(JSON.parse(JSON.stringify(scaf)));
      setEditingFileIndex(0);

      setSampleTests(
        challengeToEdit.testSuites?.sampleTests?.content ||
        challengeToEdit.testCases ||
        STACK_PRESETS[challengeToEdit.stack]?.sampleTests ||
        ''
      );
      setHiddenTests(
        challengeToEdit.testSuites?.hiddenTests?.content ||
        STACK_PRESETS[challengeToEdit.stack]?.hiddenTests ||
        ''
      );
    }
  }, [challengeToEdit]);

  // Switch stack preset
  const handleStackChange = (newStack) => {
    setStack(newStack);
    const preset = STACK_PRESETS[newStack];
    if (preset) {
      setScaffolding(JSON.parse(JSON.stringify(preset.scaffolding)));
      setSampleTests(preset.sampleTests);
      setHiddenTests(preset.hiddenTests);
      setEditingFileIndex(0);
    }
  };

  const handleResetToPreset = () => {
    const preset = STACK_PRESETS[stack] || STACK_PRESETS.JS;
    setScaffolding(JSON.parse(JSON.stringify(preset.scaffolding)));
    setSampleTests(preset.sampleTests);
    setHiddenTests(preset.hiddenTests);
    setEditingFileIndex(0);
    setErrorMsg('');
    setSuccessMsg('Loaded clean minimal template.');
  };

  // Start with completely blank files
  const handleClearToBlank = () => {
    const starterFileName = stack === 'HTML_CSS_JS'
      ? 'index.html'
      : (stack === 'NODE_EXPRESS' ? 'server.js' : (stack === 'REACT' ? 'src/App.jsx' : 'solution.js'));
    setScaffolding([
      {
        name: starterFileName,
        path: starterFileName,
        isReadOnly: false,
        isHidden: false,
        content: `// Write your clean starter code here\n`
      }
    ]);
    setSampleTests(`// Write your sample Jest assertions here\ndescribe('Sample Tests', () => {\n  test('Sample TC01', () => {\n    expect(true).toBe(true);\n  });\n});`);
    setHiddenTests(`// Write your evaluator Jest assertions here\ndescribe('Hidden Evaluator Tests', () => {\n  test('Hidden TC02', () => {\n    expect(true).toBe(true);\n  });\n});`);
    setEditingFileIndex(0);
    setErrorMsg('');
    setSuccessMsg('Workspace cleared! You have a 100% blank canvas.');
  };

  // Scaffolding file management
  const handleAddFile = () => {
    const clean = newFilePath.trim();
    if (!clean) return;
    if (scaffolding.some((f) => f.path.toLowerCase() === clean.toLowerCase())) {
      setErrorMsg(`File with path "${clean}" already exists.`);
      return;
    }
    const fileName = clean.split('/').pop() || clean;
    const newFile = {
      name: fileName,
      path: clean,
      isReadOnly: false,
      isHidden: false,
      content: `// ${clean}\n`
    };
    const updated = [...scaffolding, newFile];
    setScaffolding(updated);
    setNewFilePath('');
    setEditingFileIndex(updated.length - 1);
    setErrorMsg('');
  };

  const handleDeleteFile = (index) => {
    if (scaffolding.length <= 1) {
      setErrorMsg('Scaffolding must contain at least one starter file.');
      return;
    }
    const updated = scaffolding.filter((_, i) => i !== index);
    setScaffolding(updated);
    if (editingFileIndex >= updated.length) {
      setEditingFileIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleToggleReadOnly = (index) => {
    const updated = [...scaffolding];
    updated[index].isReadOnly = !updated[index].isReadOnly;
    setScaffolding(updated);
  };

  const handleToggleHidden = (index) => {
    const updated = [...scaffolding];
    updated[index].isHidden = !updated[index].isHidden;
    setScaffolding(updated);
  };

  const handleFileContentChange = (content) => {
    if (editingFileIndex === null || !scaffolding[editingFileIndex]) return;
    const updated = [...scaffolding];
    updated[editingFileIndex].content = content;
    setScaffolding(updated);
  };

  // Quick test assertion snippets
  const handleInsertAssertionSnippet = (type) => {
    let snippet = '';
    if (type === 'equal') {
      snippet = `\n  test('Validates deep equality', () => {\n    expect(solution([1, 2])).toEqual([1, 2]);\n  });`;
    } else if (type === 'value') {
      snippet = `\n  test('Validates expected return value', () => {\n    expect(solution('input')).toBe('expected');\n  });`;
    } else if (type === 'contain') {
      snippet = `\n  test('Validates collection contents', () => {\n    expect(solution()).toContain('item');\n  });`;
    } else if (type === 'truthy') {
      snippet = `\n  test('Validates truthy condition', () => {\n    expect(solution()).toBeTruthy();\n  });`;
    } else if (type === 'describe') {
      snippet = `\ndescribe('New Test Suite', () => {\n  test('Initial assertion', () => {\n    expect(true).toBe(true);\n  });\n});`;
    }

    if (activeTestTab === 'sample') {
      setSampleTests((prev) => (type === 'clear' ? '' : prev.trimEnd() + snippet));
    } else {
      setHiddenTests((prev) => (type === 'clear' ? '' : prev.trimEnd() + snippet));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Title and description are required.');
      return;
    }

    if (!sampleTests.trim()) {
      setErrorMsg('Sample test suite is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        difficulty,
        stack,
        durationMinutes: Number(durationMinutes),
        scaffolding,
        testSuites: {
          sampleTests: {
            path: '__tests__/sample.test.js',
            content: sampleTests.trim()
          },
          hiddenTests: {
            path: '__tests__/hidden.test.js',
            content: (hiddenTests || sampleTests).trim()
          }
        },
        testCases: sampleTests.trim(),
        isPublished: true
      };

      if (isEditing) {
        const id = challengeToEdit._id || challengeToEdit.id;
        const res = await challengeApi.update(id, payload);
        const updated = res.data?.data || res.data;
        setSuccessMsg(`Challenge "${title}" updated successfully!`);
        if (onUpdated) onUpdated(updated);
      } else {
        const res = await challengeApi.create(payload);
        const created = res.data?.data || res.data;
        setSuccessMsg(`Challenge "${title}" published successfully! Available immediately in Learner Catalog.`);
        setTitle('');
        setDescription('');
        handleResetToPreset();
        if (onCreated) onCreated(created);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save challenge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      {/* Studio Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <span>{isEditing ? `Edit Challenge: ${challengeToEdit.title}` : 'Mentor Challenge Authoring Studio'}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Build custom directory scaffoldings, assign per-file permissions, and author custom Jest test assertions.
          </p>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleClearToBlank}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs transition"
            title="Wipe boilerplate code and start with 100% blank files"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Start Blank Canvas</span>
          </button>

          <button
            type="button"
            onClick={handleResetToPreset}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            title="Reset files to clean minimal template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Load Minimal Stub</span>
          </button>

          {isEditing && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white text-xs transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Basic Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Challenge Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Inverted Binary Tree or String Compression"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Technology Stack</label>
          <select
            value={stack}
            onChange={(e) => handleStackChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
          >
            {Object.entries(STACK_PRESETS).map(([key, item]) => (
              <option key={key} value={key}>{item.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Duration Limit (Minutes)</label>
          <input
            type="number"
            min="5"
            max="180"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Problem Description */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300">Problem Description & Instructions</label>
        <textarea
          rows="4"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="State the algorithmic problem, edge case expectations, constraints, and time/space complexity requirements..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono"
        />
      </div>

      {/* 1. VISUAL SCAFFOLDING BUILDER & CODE EDITOR */}
      <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Scaffolding Files & Starter Code
            </h4>
            <span className="text-[11px] text-slate-500">
              ({scaffolding.length} file{scaffolding.length === 1 ? '' : 's'})
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              placeholder="e.g. helper.js or utils.js"
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono w-44"
            />
            <button
              type="button"
              onClick={handleAddFile}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shrink-0"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>Add File</span>
            </button>
          </div>
        </div>

        {/* Tabbed File Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800/60 pb-2">
          {scaffolding.map((file, idx) => {
            const isSelected = editingFileIndex === idx;
            return (
              <div
                key={file.path}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 font-semibold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
                onClick={() => setEditingFileIndex(idx)}
              >
                <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{file.path}</span>

                {file.isReadOnly && (
                  <span title="Read-only to candidate">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                  </span>
                )}
                {file.isHidden && (
                  <span title="Hidden from candidate (server sandbox only)">
                    <EyeOff className="w-2.5 h-2.5 text-purple-400" />
                  </span>
                )}

                {scaffolding.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(idx);
                    }}
                    className="p-0.5 text-slate-500 hover:text-red-400 transition ml-1"
                    title="Remove File"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Active File Editor & Access Toggles */}
        {scaffolding[editingFileIndex] && (
          <div className="space-y-3 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-mono font-bold text-white">
                  Editing: {scaffolding[editingFileIndex].path}
                </span>
              </div>

              {/* Toggles */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleToggleReadOnly(editingFileIndex)}
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition border ${
                    scaffolding[editingFileIndex].isReadOnly
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {scaffolding[editingFileIndex].isReadOnly ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  <span>{scaffolding[editingFileIndex].isReadOnly ? 'Read-Only (Locked)' : 'Learner Can Edit'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleHidden(editingFileIndex)}
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition border ${
                    scaffolding[editingFileIndex].isHidden
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  }`}
                >
                  {scaffolding[editingFileIndex].isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{scaffolding[editingFileIndex].isHidden ? 'Hidden (Server-Side Only)' : 'Visible in Workspace'}</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>Starter Boilerplate Content (Served to candidates on session mount):</span>
                <button
                  type="button"
                  onClick={() => handleFileContentChange('')}
                  className="text-slate-500 hover:text-amber-400 transition"
                >
                  Clear File Content
                </button>
              </div>
              <textarea
                rows="8"
                value={scaffolding[editingFileIndex].content || ''}
                onChange={(e) => handleFileContentChange(e.target.value)}
                placeholder="// Enter starter code, class signatures, or stubs for candidates..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-emerald-300 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. CUSTOM TEST CASE ORCHESTRATOR */}
      <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Custom Jest Test Assertions
            </h4>
          </div>

          {/* Test Tabs & Snippet Helpers */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTestTab('sample')}
                className={`px-3 py-1 rounded text-xs font-medium transition flex items-center space-x-1.5 ${
                  activeTestTab === 'sample'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Sample Tests (Candidate Debugging)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTestTab('hidden')}
                className={`px-3 py-1 rounded text-xs font-medium transition flex items-center space-x-1.5 ${
                  activeTestTab === 'hidden'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3 h-3" />
                <span>Evaluator Tests (Secret Final Score)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleInsertAssertionSnippet('describe')}
              className="px-2.5 py-1 rounded border border-slate-700 bg-slate-800 text-[11px] text-indigo-300 hover:text-white transition hidden md:inline-flex"
            >
              + Describe
            </button>
            <button
              type="button"
              onClick={() => handleInsertAssertionSnippet('value')}
              className="px-2.5 py-1 rounded border border-slate-700 bg-slate-800 text-[11px] text-slate-300 hover:text-white transition hidden md:inline-flex"
            >
              + toBe()
            </button>
            <button
              type="button"
              onClick={() => handleInsertAssertionSnippet('equal')}
              className="px-2.5 py-1 rounded border border-slate-700 bg-slate-800 text-[11px] text-slate-300 hover:text-white transition hidden md:inline-flex"
            >
              + toEqual()
            </button>
            <button
              type="button"
              onClick={() => handleInsertAssertionSnippet('contain')}
              className="px-2.5 py-1 rounded border border-slate-700 bg-slate-800 text-[11px] text-slate-300 hover:text-white transition hidden lg:inline-flex"
            >
              + toContain()
            </button>
            <button
              type="button"
              onClick={() => handleInsertAssertionSnippet('truthy')}
              className="px-2.5 py-1 rounded border border-slate-700 bg-slate-800 text-[11px] text-slate-300 hover:text-white transition hidden lg:inline-flex"
            >
              + toBeTruthy()
            </button>
            <button
              type="button"
              onClick={() => handleInsertAssertionSnippet('clear')}
              className="px-2.5 py-1 rounded border border-red-900/40 bg-red-950/30 text-[11px] text-red-400 hover:text-red-300 transition"
            >
              Clear
            </button>
          </div>
        </div>

        {activeTestTab === 'sample' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">
                Sample Test Suite (`__tests__/sample.test.js`)
              </span>
              <span className="text-[11px] text-blue-400 font-mono">
                Visible to candidate in IDE &bull; Evaluated on "Run Tests"
              </span>
            </div>
            <textarea
              rows="9"
              required
              value={sampleTests}
              onChange={(e) => setSampleTests(e.target.value)}
              placeholder="const { solution } = require('./solution');\n\ndescribe('Sample Tests', () => {\n  test('Sample TC01', () => {\n    expect(solution('test')).toBe('test');\n  });\n});"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-blue-300 font-mono focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">
                Evaluator Hidden Test Suite (`__tests__/hidden.test.js`)
              </span>
              <span className="text-[11px] text-purple-400 font-mono">
                Strictly secret from candidate &bull; Evaluated for final score on submission
              </span>
            </div>
            <textarea
              rows="9"
              required
              value={hiddenTests}
              onChange={(e) => setHiddenTests(e.target.value)}
              placeholder="const { solution } = require('./solution');\n\ndescribe('Hidden Evaluator Tests', () => {\n  test('Hidden TC02: Edge case', () => {\n    expect(solution(null)).toBe(null);\n  });\n});"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-purple-300 font-mono focus:outline-none focus:border-purple-500 leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* Submission CTA */}
      <div className="flex items-center justify-end space-x-3 pt-2">
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition"
        >
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? 'Saving Assessment...' : isEditing ? 'Update Challenge' : 'Publish Challenge'}</span>
        </button>
      </div>
    </form>
  );
}
