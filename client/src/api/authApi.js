import axiosClient, { setAuthToken } from './axiosClient';

export const authApi = {
  login: async (credentials) => {
    const res = await axiosClient.post('/auth/login', credentials);
    if (res.data.data?.accessToken) {
      setAuthToken(res.data.data.accessToken);
    }
    return res.data;
  },

  registerLearner: async (data) => {
    const res = await axiosClient.post('/auth/register', data);
    if (res.data.data?.accessToken) {
      setAuthToken(res.data.data.accessToken);
    }
    return res.data;
  },

  registerMentor: async (secretToken, data) => {
    const res = await axiosClient.post(`/auth/invite/${secretToken}`, data);
    if (res.data.data?.accessToken) {
      setAuthToken(res.data.data.accessToken);
    }
    return res.data;
  },

  getMe: async () => {
    const res = await axiosClient.get('/auth/me');
    return res.data;
  },

  logout: async () => {
    try {
      await axiosClient.post('/auth/logout');
    } finally {
      setAuthToken(null);
    }
  }
};

