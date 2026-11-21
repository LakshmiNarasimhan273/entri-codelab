import axiosClient from './axiosClient';

export const submissionApi = {
  runTests: async (challengeId, submittedCode, timeSpentSeconds, isTryMode = false, context = 'LEARNER_SUBMISSION_SANDBOX') => {
    const res = await axiosClient.post('/submissions/run-tests', {
      challengeId,
      submittedCode,
      timeSpentSeconds,
      isTryMode,
      context
    });
    return res.data;
  },

  submitFinal: async (challengeId, submittedCode, timeSpentSeconds, isTryMode = false) => {
    const res = await axiosClient.post('/submissions/submit', {
      challengeId,
      submittedCode,
      timeSpentSeconds,
      isTryMode
    });
    return res.data;
  },

  getStatus: async (submissionId) => {
    const res = await axiosClient.get(`/submissions/status/${submissionId}`);
    return res.data;
  },

  getMyState: async (challengeId) => {
    const res = await axiosClient.get(`/submissions/state/${challengeId}`);
    return res.data;
  },

  logAntiCheat: async (challengeId, eventType, details) => {
    const res = await axiosClient.post('/submissions/anticheat', {
      challengeId,
      eventType,
      details
    });
    return res.data;
  }
};

