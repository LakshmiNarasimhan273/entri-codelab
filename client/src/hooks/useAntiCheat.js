import { useEffect, useRef, useCallback } from 'react';
import { useIdeStore } from '../store/ideStore';
import { useProctoringStore } from '../store/proctoringStore';
import { submissionApi } from '../api/submissionApi';

const VIOLATION_TYPES = {
  COPY: 'COPY_ATTEMPT',
  PASTE: 'PASTE_ATTEMPT',
  CUT: 'CUT_ATTEMPT',
  CONTEXT_MENU: 'CONTEXT_MENU',
  TAB_SWITCH: 'TAB_SWITCH',
  WINDOW_BLUR: 'WINDOW_BLUR',
  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT'
};

const isCurrentlySubmitting = () => {
  return Boolean(
    useProctoringStore.getState().isSubmitting ||
    useIdeStore.getState().isSubmitting ||
    useIdeStore.getState().isFinalSubmitted
  );
};

export const useAntiCheat = ({ challengeId, enabled = true, onViolationAlert }) => {
  const { recordViolation, setIsFullscreen, appendTerminalLog } = useIdeStore();
  const lastLoggedRef = useRef({});

  // Debounced telemetry dispatcher to avoid spamming network
  const sendViolationTelemetry = useCallback(async (eventType, details = {}) => {
    const { isTryMode } = useIdeStore.getState();
    if (isTryMode) {
      // In Mentor Try IDE mode, completely bypass proctoring infractions
      return;
    }

    if (isCurrentlySubmitting() && (
      eventType === VIOLATION_TYPES.TAB_SWITCH ||
      eventType === VIOLATION_TYPES.WINDOW_BLUR ||
      eventType === VIOLATION_TYPES.FULLSCREEN_EXIT
    )) {
      // Suppress false-positives during assessment submission lifecycle
      return;
    }

    recordViolation(eventType);
    useProctoringStore.getState().logViolation(eventType);
    appendTerminalLog(`[SECURITY ALERT] Anti-Cheat Policy Violation: ${eventType}`);

    if (onViolationAlert) {
      onViolationAlert(eventType);
    }

    const now = Date.now();
    const lastTime = lastLoggedRef.current[eventType] || 0;
    if (now - lastTime < 1500) {
      return; // 1.5s debounce per type
    }
    lastLoggedRef.current[eventType] = now;

    if (challengeId) {
      try {
        await submissionApi.logAntiCheat(challengeId, eventType, details);
      } catch (err) {
        console.warn('Failed to dispatch telemetry:', err);
      }
    }
  }, [challengeId, recordViolation, appendTerminalLog, onViolationAlert]);

  useEffect(() => {
    if (!enabled) return;

    // 1. Block Keyboard Shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, Cmd+C, Cmd+V, Cmd+X, F12, Ctrl+Shift+I)
    const handleKeyDown = (e) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Copy
      if (isCtrlOrMeta && key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        sendViolationTelemetry(VIOLATION_TYPES.COPY, { key: 'Ctrl+C / Cmd+C' });
        return false;
      }

      // Paste
      if (isCtrlOrMeta && key === 'v') {
        e.preventDefault();
        e.stopPropagation();
        sendViolationTelemetry(VIOLATION_TYPES.PASTE, { key: 'Ctrl+V / Cmd+V' });
        return false;
      }

      // Cut
      if (isCtrlOrMeta && key === 'x') {
        e.preventDefault();
        e.stopPropagation();
        sendViolationTelemetry(VIOLATION_TYPES.CUT, { key: 'Ctrl+X / Cmd+X' });
        return false;
      }

      // Developer Tools Inspection Keys (F12, Ctrl+Shift+I, Ctrl+Shift+J)
      if (e.key === 'F12' || (isCtrlOrMeta && e.shiftKey && (key === 'i' || key === 'j'))) {
        e.preventDefault();
        e.stopPropagation();
        sendViolationTelemetry('DEVTOOLS_OPENED', { key: e.key });
        return false;
      }
    };

    // 2. Block Context Menu (Right Click)
    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      sendViolationTelemetry(VIOLATION_TYPES.CONTEXT_MENU, { target: e.target?.tagName });
      return false;
    };

    // 3. Tab Switch & Page Visibility Change
    const handleVisibilityChange = () => {
      if (isCurrentlySubmitting() || useIdeStore.getState().isTryMode) return;

      if (document.hidden) {
        sendViolationTelemetry(VIOLATION_TYPES.TAB_SWITCH, { state: 'hidden' });
      }
    };

    // 4. Window Blur (Focus Lost to another app / monitor)
    const handleWindowBlur = () => {
      if (isCurrentlySubmitting() || useIdeStore.getState().isTryMode) return;

      sendViolationTelemetry(VIOLATION_TYPES.WINDOW_BLUR, { time: new Date().toISOString() });
    };

    // 5. Fullscreen Change & Exit Detection
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      setIsFullscreen(isCurrentlyFullscreen);

      if (isCurrentlySubmitting() || useIdeStore.getState().isTryMode) return;

      if (!isCurrentlyFullscreen) {
        sendViolationTelemetry(VIOLATION_TYPES.FULLSCREEN_EXIT, {
          timestamp: new Date().toISOString()
        });
      }
    };

    // 6. Block native copy/cut/paste events
    const handleCopy = (e) => {
      e.preventDefault();
      sendViolationTelemetry(VIOLATION_TYPES.COPY);
    };

    const handlePaste = (e) => {
      e.preventDefault();
      sendViolationTelemetry(VIOLATION_TYPES.PASTE);
    };

    const handleCut = (e) => {
      e.preventDefault();
      sendViolationTelemetry(VIOLATION_TYPES.CUT);
    };

    // Attach global listeners
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('cut', handleCut, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('cut', handleCut, true);
    };
  }, [enabled, sendViolationTelemetry, setIsFullscreen]);

  const requestFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen request denied or not supported:', err);
    }
  }, [setIsFullscreen]);

  return {
    requestFullscreen
  };
};

