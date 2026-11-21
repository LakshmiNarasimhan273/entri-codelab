import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useIdeStore } from '../store/ideStore';

export const useSocket = (submissionId) => {
  const socketRef = useRef(null);
  const { setExecutionProgress, setTestResults, appendTerminalLog, setIsExecuting } = useIdeStore();

  useEffect(() => {
    const token = localStorage.getItem('ag_token');
    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Antigravity Live Socket:', socket.id);
      if (submissionId) {
        socket.emit('join:submission', submissionId);
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
      if (submissionId) {
        socket.emit('leave:submission', submissionId);
      }
      socket.disconnect();
    };
  }, [submissionId, setExecutionProgress, setTestResults, appendTerminalLog, setIsExecuting]);

  const joinSubmissionRoom = (newSubmissionId) => {
    if (socketRef.current && newSubmissionId) {
      socketRef.current.emit('join:submission', newSubmissionId);
    }
  };

  return {
    socket: socketRef.current,
    joinSubmissionRoom
  };
};

