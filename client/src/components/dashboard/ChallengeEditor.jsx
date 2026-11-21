import React, { useState } from 'react';
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
  ShieldAlert
} from 'lucide-react';

const STACK_PRESETS = {
  JS: {
    label: 'Pure JavaScript (Algorithms & Data Structures)',
    scaffolding: [
      {
        name: 'solution.js',
        path: 'solution.js',
        isReadOnly: false,
        isHidden: false,
        content: `/**
 * Two Sum Algorithm
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

module.exports = { twoSum };`
      }
    ],
    sampleTests: `const { twoSum } = require('../solution');

describe('Sample Tests: Basic Two Sum Assertions', () => {
  test('Sample TC01: Standard positive integers', () => {
    expect(twoSum([2, 7, 11, 15], 9)).toEqual([0, 1]);
  });

  test('Sample TC02: Duplicate elements sum to target', () => {
    expect(twoSum([3, 3], 6)).toEqual([0, 1]);
  });
});`,
    hiddenTests: `const { twoSum } = require('../solution');

describe('Hidden Assessment Suite: Boundary & Edge Cases', () => {
  test('Hidden TC03: Negative numbers and zeroes', () => {
    expect(twoSum([-1, -2, -3, -4, -5], -8)).toEqual([2, 4]);
  });

  test('Hidden TC04: Large array efficiency verification', () => {
    const list = [1, 5, 8, 12, 19, 25, 30];
    expect(twoSum(list, 37)).toEqual([3, 5]);
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
  <title>DOM Counter</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="card">
    <h1 id="counter-value">0</h1>
    <div class="btn-group">
      <button id="decrement-btn">-</button>
      <button id="reset-btn">Reset</button>
      <button id="increment-btn">+</button>
    </div>
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
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #0f172a;
  color: #f8fafc;
}
.card {
  text-align: center;
  padding: 2rem;
  background: #1e293b;
  border-radius: 12px;
}
button {
  padding: 0.5rem 1.25rem;
  margin: 0 0.5rem;
  font-size: 1.1rem;
  cursor: pointer;
}`
      },
      {
        name: 'script.js',
        path: 'script.js',
        isReadOnly: false,
        isHidden: false,
        content: `let count = 0;
const valueDisplay = document.getElementById('counter-value');
const incBtn = document.getElementById('increment-btn');
const decBtn = document.getElementById('decrement-btn');
const resetBtn = document.getElementById('reset-btn');

function updateDisplay() {
  if (valueDisplay) valueDisplay.textContent = count;
}

if (incBtn) {
  incBtn.addEventListener('click', () => {
    count++;
    updateDisplay();
  });
}

if (decBtn) {
  decBtn.addEventListener('click', () => {
    count--;
    updateDisplay();
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    count = 0;
    updateDisplay();
  });
}`
      }
    ],
    sampleTests: `describe('Sample Tests: Interactive Counter DOM Suite', () => {
  beforeEach(() => {
    document.body.innerHTML = \`
      <h1 id="counter-value">0</h1>
      <button id="decrement-btn">-</button>
      <button id="reset-btn">Reset</button>
      <button id="increment-btn">+</button>
    \`;
  });

  test('Sample TC01: Initial counter value should be 0', () => {
    const val = document.getElementById('counter-value').textContent;
    expect(val).toBe('0');
  });

  test('Sample TC02: Increment button increases count by 1', () => {
    const incBtn = document.getElementById('increment-btn');
    incBtn.click();
    expect(document.getElementById('counter-value').textContent).toBe('1');
  });
});`,
    hiddenTests: `describe('Hidden Assessment Suite: Edge Cases & Reset', () => {
  beforeEach(() => {
    document.body.innerHTML = \`
      <h1 id="counter-value">0</h1>
      <button id="decrement-btn">-</button>
      <button id="reset-btn">Reset</button>
      <button id="increment-btn">+</button>
    \`;
  });

  test('Hidden TC03: Decrement button decreases count by 1', () => {
    const decBtn = document.getElementById('decrement-btn');
    decBtn.click();
    expect(document.getElementById('counter-value').textContent).toBe('-1');
  });

  test('Hidden TC04: Reset button restores counter to zero', () => {
    const incBtn = document.getElementById('increment-btn');
    const resetBtn = document.getElementById('reset-btn');
    incBtn.click();
    incBtn.click();
    resetBtn.click();
    expect(document.getElementById('counter-value').textContent).toBe('0');
  });
});`
  },
  REACT: {
    label: 'Frontend: React.js (Component State & Hooks)',
    scaffolding: [
      {
        name: 'App.jsx',
        path: 'src/App.jsx',
        isReadOnly: false,
        isHidden: false,
        content: `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="counter-app">
      <h2 data-testid="count-heading">{count}</h2>
      <button data-testid="inc-btn" onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}`
      }
    ],
    sampleTests: `import React from 'react';
import App from '../src/App';

describe('Sample Tests: React Component Suite', () => {
  test('Sample TC01: App component is a valid React functional component', () => {
    expect(typeof App).toBe('function');
  });
});`,
    hiddenTests: `import React from 'react';
import App from '../src/App';

describe('Hidden Assessment Suite: State Hooks & Render Lifecycle', () => {
  test('Hidden TC02: Component contains root counter-app class', () => {
    const element = App();
    expect(element.props.className).toBe('counter-app');
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

let tasks = [
  { id: 1, title: 'Complete Assessment', completed: false }
];

app.get('/api/tasks', (req, res) => {
  res.json({ success: true, data: tasks });
});

app.post('/api/tasks', (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, error: 'Title required' });
  }
  const task = { id: Date.now(), title, completed: false };
  tasks.push(task);
  res.status(201).json({ success: true, data: task });
});

module.exports = app;`
      }
    ],
    sampleTests: `const app = require('../server');

describe('Sample Tests: Express API Suite', () => {
  test('Sample TC01: Express application instance is exported', () => {
    expect(typeof app).toBe('function');
  });
});`,
    hiddenTests: `const app = require('../server');

describe('Hidden Assessment Suite: Validation & Persistence', () => {
  test('Hidden TC02: Router registers GET and POST handlers', () => {
    expect(app._router).toBeDefined();
  });
});`
  }
};

export default function ChallengeEditor({ onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [stack, setStack] = useState('JS');
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Scaffolding state
  const [scaffolding, setScaffolding] = useState(STACK_PRESETS.JS.scaffolding);
  const [editingFileIndex, setEditingFileIndex] = useState(null);
  const [newFilePath, setNewFilePath] = useState('');

  // Dual-Tier Test Suite State
  const [activeTestTab, setActiveTestTab] = useState('sample'); // 'sample' | 'hidden'
  const [sampleTests, setSampleTests] = useState(STACK_PRESETS.JS.sampleTests);
  const [hiddenTests, setHiddenTests] = useState(STACK_PRESETS.JS.hiddenTests);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Switch stack preset
  const handleStackChange = (newStack) => {
    setStack(newStack);
    const preset = STACK_PRESETS[newStack];
    if (preset) {
      setScaffolding(JSON.parse(JSON.stringify(preset.scaffolding)));
      setSampleTests(preset.sampleTests);
      setHiddenTests(preset.hiddenTests);
      setEditingFileIndex(null);
    }
  };

  const handleResetToPreset = () => {
    const preset = STACK_PRESETS[stack];
    if (preset) {
      setScaffolding(JSON.parse(JSON.stringify(preset.scaffolding)));
      setSampleTests(preset.sampleTests);
      setHiddenTests(preset.hiddenTests);
      setEditingFileIndex(null);
    }
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
    if (editingFileIndex === index) {
      setEditingFileIndex(null);
    } else if (editingFileIndex > index) {
      setEditingFileIndex(editingFileIndex - 1);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Title and description are required.');
      return;
    }

    if (!sampleTests.trim() || !hiddenTests.trim()) {
      setErrorMsg('Both Sample and Evaluator test suites are required.');
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
            content: sampleTests
          },
          hiddenTests: {
            path: '__tests__/hidden.test.js',
            content: hiddenTests
          }
        },
        testCases: sampleTests,
        isPublished: true
      };

      const res = await challengeApi.create(payload);
      const created = res.data?.data || res.data;

      setSuccessMsg(`Challenge "${title}" published successfully! Available immediately in Learner Catalog.`);
      setTitle('');
      setDescription('');
      handleResetToPreset();

      if (onCreated) {
        onCreated(created);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to create challenge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      {/* Studio Header */}
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <span>Mentor Challenge Authoring & Scaffolding Studio</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Build custom directory scaffoldings, assign per-file learner permissions, and orchestrate dual-tier Jest test suites.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetToPreset}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
          title="Reset files and test suites to stack preset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Preset</span>
        </button>
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
            placeholder="e.g. High-Concurrency Two Sum Algorithm"
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
        <label className="text-xs font-semibold text-slate-300">Problem Description & Candidate Instructions</label>
        <textarea
          rows="4"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="State algorithmic requirements, constraints, time/space complexity expectations, and edge cases..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono"
        />
      </div>

      {/* 1. VISUAL SCAFFOLDING BUILDER */}
      <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/60 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Visual Scaffolding Builder
            </h4>
            <span className="text-[11px] text-slate-500">
              ({scaffolding.length} workspace file{scaffolding.length === 1 ? '' : 's'})
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              placeholder="e.g. src/helper.js"
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono w-48"
            />
            <button
              type="button"
              onClick={handleAddFile}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add File</span>
            </button>
          </div>
        </div>

        {/* Files Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2 font-medium">Path</th>
                <th className="pb-2 font-medium">Learner Access</th>
                <th className="pb-2 font-medium">Visibility</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {scaffolding.map((file, idx) => (
                <tr key={file.path} className="hover:bg-slate-900/50 transition">
                  <td className="py-2.5 font-mono text-slate-200 flex items-center space-x-2">
                    <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{file.path}</span>
                  </td>
                  <td className="py-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleReadOnly(idx)}
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium transition ${
                        file.isReadOnly
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {file.isReadOnly ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                      <span>{file.isReadOnly ? 'Read-Only (Locked)' : 'Editable'}</span>
                    </button>
                  </td>
                  <td className="py-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleHidden(idx)}
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-medium transition ${
                        file.isHidden
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {file.isHidden ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                      <span>{file.isHidden ? 'Hidden (Sandbox Only)' : 'Visible in Workspace'}</span>
                    </button>
                  </td>
                  <td className="py-2.5 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingFileIndex(editingFileIndex === idx ? null : idx)}
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium transition ${
                        editingFileIndex === idx
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{editingFileIndex === idx ? 'Close Edit' : 'Edit Code'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(idx)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Delete file from scaffolding"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Inline Code Editor for Active File */}
        {editingFileIndex !== null && scaffolding[editingFileIndex] && (
          <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-indigo-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-indigo-300 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Editing Starter Boilerplate: {scaffolding[editingFileIndex].path}</span>
              </span>
              <button
                type="button"
                onClick={() => setEditingFileIndex(null)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Done Editing
              </button>
            </div>
            <textarea
              rows="6"
              value={scaffolding[editingFileIndex].content || ''}
              onChange={(e) => handleFileContentChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* 2. DUAL-TIER TEST CASE ORCHESTRATOR */}
      <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/60 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Dual-Tier Jest Test Suite Orchestrator
            </h4>
          </div>

          {/* Test Tabs */}
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
              <span>Sample Tests (Tier 1)</span>
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
              <span>Evaluator Tests (Tier 2)</span>
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
                Visible to Candidate &bull; Runs on "Run Test Cases"
              </span>
            </div>
            <textarea
              rows="8"
              required
              value={sampleTests}
              onChange={(e) => setSampleTests(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-blue-300 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">
                Evaluator Hidden Test Suite (`__tests__/hidden.test.js`)
              </span>
              <span className="text-[11px] text-purple-400 font-mono">
                Concealed from Candidate &bull; Evaluates Score on "Submit Assessment"
              </span>
            </div>
            <textarea
              rows="8"
              required
              value={hiddenTests}
              onChange={(e) => setHiddenTests(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-purple-300 font-mono focus:outline-none focus:border-purple-500"
            />
          </div>
        )}
      </div>

      {/* Submission CTA */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition"
        >
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? 'Publishing Challenge to Platform...' : 'Publish Challenge'}</span>
        </button>
      </div>
    </form>
  );
}
