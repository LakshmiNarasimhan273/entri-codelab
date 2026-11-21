import React from 'react';
import { useIdeStore } from '../../store/ideStore';
import { ShieldAlert, Maximize2, AlertTriangle, Eye } from 'lucide-react';

export default function AntiCheatBanner({ onRequestFullscreen }) {
  const { antiCheatViolations, isFullscreen } = useIdeStore();
  const { total = 0, tabSwitchCount = 0, blurCount = 0, copyCount = 0, pasteCount = 0 } = antiCheatViolations;

  const hasViolations = total > 0;
  const isCritical = total >= 5;

  return (
    <div className="flex items-center space-x-3 text-xs">
      {/* Fullscreen Guard Status */}
      {!isFullscreen ? (
        <button
          onClick={onRequestFullscreen}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition animate-pulse font-medium"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Enter Fullscreen Proctor Mode</span>
        </button>
      ) : (
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono">
          <Eye className="w-3 h-3 text-emerald-400" />
          <span>Proctor Monitored</span>
        </div>
      )}

      {/* Violation Alert Pill */}
      {hasViolations && (
        <div
          title={`Tab Switches: ${tabSwitchCount}, Blurs: ${blurCount}, Copy: ${copyCount}, Paste: ${pasteCount}`}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border text-[11px] font-mono font-medium ${
            isCritical
              ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>
            {total} Violation{total > 1 ? 's' : ''} {isCritical ? '(FLAGGED)' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

