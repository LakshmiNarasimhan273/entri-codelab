import React, { useEffect, useRef } from 'react';
import { useIdeStore } from '../../store/ideStore';
import { Terminal, Trash2, Loader2 } from 'lucide-react';

export default function TerminalOutput() {
  const {
    terminalLogs,
    clearTerminal,
    isExecuting,
    executionProgress
  } = useIdeStore();

  const terminalEndRef = useRef(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  return (
    <div className="h-full flex flex-col bg-slate-950 font-mono text-xs">
      <div className="h-8 px-3 border-b border-slate-800 bg-slate-900/70 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Execution Console
          </span>
          {isExecuting && (
            <span className="flex items-center space-x-1.5 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              <span>Sandbox Active ({executionProgress}%)</span>
            </span>
          )}
        </div>

        <button
          onClick={clearTerminal}
          className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-800 transition"
          title="Clear Console"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Progress Bar */}
      {isExecuting && (
        <div className="w-full bg-slate-800 h-1 overflow-hidden">
          <div
            className="bg-blue-500 h-1 transition-all duration-300"
            style={{ width: `${executionProgress}%` }}
          />
        </div>
      )}

      {/* Log Output Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 select-text">
        {terminalLogs.map((log, idx) => (
          <div
            key={idx}
            className={`leading-relaxed break-all ${
              log.includes('[SECURITY ALERT]') || log.includes('FAIL') || log.includes('Error:')
                ? 'text-red-400 font-semibold'
                : log.includes('PASS') || log.includes('COMPLETE')
                ? 'text-emerald-400 font-medium'
                : log.includes('Progress')
                ? 'text-blue-300'
                : 'text-slate-300'
            }`}
          >
            {log}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}

