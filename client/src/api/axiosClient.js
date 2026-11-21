import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let accessToken = localStorage.getItem('ag_token') || null;

export const setAuthToken = (token) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('ag_token', token);
    axiosClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('ag_token');
    delete axiosClient.defaults.headers.common['Authorization'];
  }
};

// Initialize header if token existed
if (accessToken) {
  axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
}

// Interceptor for handling token expiration and automatic refreshing
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.errors?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const refreshRes = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshRes.data.data.accessToken;
        setAuthToken(newAccessToken);
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        return axiosClient(originalRequest);
      } catch (refreshErr) {
        setAuthToken(null);
        window.location.href = '/login?expired=1';
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;

