import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Get API URL from environment variable or use relative path
const API_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed.token && config.headers) {
          config.headers.Authorization = `Bearer ${parsed.token}`;
        }
      } catch (error) {
        console.error('Error parsing auth token:', error);
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Don't redirect if we're already on login or register page
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        // Clear auth and redirect to login
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

