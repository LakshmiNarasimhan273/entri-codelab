import axiosClient from './axiosClient';

export const challengeApi = {
  getAll: async () => {
    const res = await axiosClient.get('/challenges');
    return res.data;
  },

  getById: async (id) => {
    const res = await axiosClient.get(`/challenges/${id}`);
    return res.data;
  },

  create: async (challengeData) => {
    const res = await axiosClient.post('/challenges', challengeData);
    return res.data;
  },

  update: async (id, challengeData) => {
    const res = await axiosClient.put(`/challenges/${id}`, challengeData);
    return res.data;
  },

  delete: async (id) => {
    const res = await axiosClient.delete(`/challenges/${id}`);
    return res.data;
  }
};

