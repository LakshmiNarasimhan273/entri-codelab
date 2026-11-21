import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useIdeStore } from '../store/ideStore';

export const useSocket = (submissionId) => {
  const socketRef = useRef(null);
  const currentSubIdRef = useRef(submissionId);
  const { setExecutionProgress, setTestResults, appendTerminalLog, setIsExecuting } = useIdeStore();

  // Keep submissionId in ref without triggering socket reconnects
  useEffect(() => {
    currentSubIdRef.current = submissionId;
    if (socketRef.current?.connected && submissionId) {
      socketRef.current.emit('join:submission', submissionId);
    }
  }, [submissionId]);

  useEffect(() => {
    const token = localStorage.getItem('ag_token');
    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (currentSubIdRef.current) {
        socket.emit('join:submission', currentSubIdRef.current);
      }
    });

    socket.on('test:progress', (data) => {
      if (data.progress !== undefined) {
        setExecutionProgress(data.progress, data.message);
      }
    });

    socket.on('test:complete', (data) => {
      setTestResults(data.testResults);
      appendTerminalLog(`[EVALUATION COMPLETE] Final Score: ${data.score}%`);
    });

    socket.on('test:error', (data) => {
      setIsExecuting(false);
      appendTerminalLog(`[EXECUTION ERROR] ${data.message}`);
    });

    return () => {
      if (currentSubIdRef.current) {
        socket.emit('leave:submission', currentSubIdRef.current);
      }
      socket.disconnect();
    };
  }, [setExecutionProgress, setTestResults, appendTerminalLog, setIsExecuting]);

  const joinSubmissionRoom = useCallback((newSubmissionId) => {
    if (!newSubmissionId) return;
    currentSubIdRef.current = newSubmissionId;
    if (socketRef.current?.connected) {
      socketRef.current.emit('join:submission', newSubmissionId);
    }
  }, []);

  return {
    socket: socketRef.current,
    joinSubmissionRoom
  };
};
