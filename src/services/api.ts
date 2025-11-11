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
  timeout: 10000, // 10 second timeout
});

// Cache token to avoid parsing localStorage on every request
let cachedToken: string | null = null;
let tokenCacheTime: number = 0;
const TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getAuthToken = (): string | null => {
  const now = Date.now();
  // Return cached token if still valid
  if (cachedToken && (now - tokenCacheTime) < TOKEN_CACHE_DURATION) {
    return cachedToken;
  }

  // Refresh token from localStorage
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed.token) {
        cachedToken = parsed.token;
        tokenCacheTime = now;
        return cachedToken;
      }
    }
  } catch (error) {
    console.error('Error parsing auth token:', error);
  }
  
  cachedToken = null;
  tokenCacheTime = 0;
  return null;
};

// Clear token cache (call this on logout)
export const clearTokenCache = (): void => {
  cachedToken = null;
  tokenCacheTime = 0;
};

// Add token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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
      // Clear cached token
      clearTokenCache();
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

