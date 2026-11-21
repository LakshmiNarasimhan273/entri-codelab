import { create } from 'zustand';
import { authApi } from '../api/authApi';
import { setAuthToken } from '../api/axiosClient';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initialize: async () => {
    const token = localStorage.getItem('ag_token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const res = await authApi.getMe();
      set({ user: res.data.user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err) {
      setAuthToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(credentials);
      set({ user: res.data.user, isAuthenticated: true, isLoading: false, error: null });
      return res.data.user;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  registerLearner: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.registerLearner(data);
      set({ user: res.data.user, isAuthenticated: true, isLoading: false, error: null });
      return res.data.user;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed.';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  registerMentor: async (secretToken, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.registerMentor(secretToken, data);
      set({ user: res.data.user, isAuthenticated: true, isLoading: false, error: null });
      return res.data.user;
    } catch (err) {
      const message = err.response?.data?.message || 'Mentor registration failed. Invalid invitation key.';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ user: null, isAuthenticated: false, error: null });
    }
  }
}));

