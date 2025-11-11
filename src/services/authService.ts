import api from './api.js';

interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

interface RegisterResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

interface MeResponse {
  success: boolean;
  data: {
    user: User;
  };
}

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier' | 'staff';
  store?: Store | string;
  phone?: string;
}

export interface Store {
  _id: string;
  name: string;
  code: string;
  address?: {
    street: string;
    city: string;
    district: string;
    postalCode?: string;
    country: string;
  };
  phone?: string;
  email?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
  store?: string;
  phone?: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData: RegisterData): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>('/auth/register', userData);
    return response.data;
  },

  getMe: async (): Promise<MeResponse> => {
    const response = await api.get<MeResponse>('/auth/me');
    return response.data;
  },
};

