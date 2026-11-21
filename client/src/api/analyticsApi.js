import axiosClient from './axiosClient';

export const analyticsApi = {
  getChallengeSubmissions: async (challengeId) => {
    const res = await axiosClient.get(`/analytics/challenge/${challengeId}`);
    return res.data;
  },

  downloadExcelReport: async (challengeId, challengeTitle = 'report') => {
    const res = await axiosClient.get(`/analytics/challenge/${challengeId}/export`, {
      responseType: 'blob'
    });

    // Create browser download link for the .xlsx file
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedTitle = challengeTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `Antigravity_${sanitizedTitle}_Scorecard.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};

