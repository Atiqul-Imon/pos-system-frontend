import api from './api.js';
import type { Customer } from '../types/index.js';

interface CustomersResponse {
  success: boolean;
  data: {
    customers: Customer[];
  };
  count?: number;
}

interface CustomerResponse {
  success: boolean;
  data: {
    customer: Customer;
    recentTransactions?: any[];
    loyaltyHistory?: any[];
  };
}

interface CreateCustomerData {
  name: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  address?: {
    street?: string;
    city?: string;
    district?: string;
    postalCode?: string;
    country?: string;
  };
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  notes?: string;
  tags?: string[];
  store?: string;
}

export const customerService = {
  getAllCustomers: async (params?: {
    search?: string;
    isActive?: boolean;
    tag?: string;
    minPoints?: number;
    sortBy?: string;
  }): Promise<CustomersResponse> => {
    const response = await api.get<CustomersResponse>('/customers', { params });
    return response.data;
  },

  getCustomer: async (id: string): Promise<CustomerResponse> => {
    const response = await api.get<CustomerResponse>(`/customers/${id}`);
    return response.data;
  },

  createCustomer: async (customerData: CreateCustomerData): Promise<CustomerResponse> => {
    const response = await api.post<CustomerResponse>('/customers', customerData);
    return response.data;
  },

  updateCustomer: async (id: string, customerData: Partial<CreateCustomerData>): Promise<CustomerResponse> => {
    const response = await api.put<CustomerResponse>(`/customers/${id}`, customerData);
    return response.data;
  },

  deleteCustomer: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },

  searchCustomers: async (query: string, _store?: string, limit?: number): Promise<CustomersResponse> => {
    const response = await api.get<CustomersResponse>('/customers/search', {
      params: { q: query, limit }
    });
    return response.data;
  },
};

