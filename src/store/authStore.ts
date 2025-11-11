import { create } from 'zustand';
import type { User } from '../services/authService.js';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

// Simple persistence using localStorage directly
const getStoredAuth = (): { user: User | null; token: string | null } => {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading auth from storage:', error);
  }
  return { user: null, token: null };
};

const setStoredAuth = (user: User, token: string): void => {
  try {
    localStorage.setItem('auth-storage', JSON.stringify({ user, token }));
  } catch (error) {
    console.error('Error saving auth to storage:', error);
  }
};

const clearStoredAuth = (): void => {
  try {
    localStorage.removeItem('auth-storage');
  } catch (error) {
    console.error('Error clearing auth from storage:', error);
  }
};

const stored = getStoredAuth();

export const useAuthStore = create<AuthState>((set) => ({
  user: stored.user,
  token: stored.token,
  setAuth: (user: User, token: string) => {
    setStoredAuth(user, token);
    set({ user, token });
  },
  logout: () => {
    clearStoredAuth();
    set({ user: null, token: null });
  },
}));

