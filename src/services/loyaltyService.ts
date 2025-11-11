import api from './api.js';
import type { LoyaltyTransaction } from '../types/index.js';

interface LoyaltyBalanceResponse {
  success: boolean;
  data: {
    customerId: string;
    loyaltyPoints: number;
    totalSpent: number;
    totalTransactions: number;
  };
}

interface LoyaltyHistoryResponse {
  success: boolean;
  data: {
    history: LoyaltyTransaction[];
  };
  count?: number;
}

interface LoyaltySettingsResponse {
  success: boolean;
  data: {
    settings: {
      pointsPerCurrency: number;
      pointsValue: number;
      minimumRedeemablePoints: number;
      pointsExpiryDays: number | null;
      enabled: boolean;
    };
  };
}

interface RedeemPointsData {
  points: number;
  reason?: string;
  notes?: string;
}

interface AdjustPointsData {
  points: number;
  reason: string;
  notes?: string;
}

export const loyaltyService = {
  getCustomerBalance: async (customerId: string): Promise<LoyaltyBalanceResponse> => {
    const response = await api.get<LoyaltyBalanceResponse>(`/loyalty/customer/${customerId}/balance`);
    return response.data;
  },

  getLoyaltyHistory: async (customerId: string, limit?: number, type?: string): Promise<LoyaltyHistoryResponse> => {
    const response = await api.get<LoyaltyHistoryResponse>(`/loyalty/customer/${customerId}/history`, {
      params: { limit, type }
    });
    return response.data;
  },

  redeemPoints: async (customerId: string, data: RedeemPointsData): Promise<LoyaltyHistoryResponse> => {
    const response = await api.post(`/loyalty/customer/${customerId}/redeem`, data);
    return response.data;
  },

  adjustPoints: async (customerId: string, data: AdjustPointsData): Promise<LoyaltyHistoryResponse> => {
    const response = await api.post(`/loyalty/customer/${customerId}/adjust`, data);
    return response.data;
  },

  getLoyaltySettings: async (): Promise<LoyaltySettingsResponse> => {
    const response = await api.get<LoyaltySettingsResponse>('/loyalty/settings');
    return response.data;
  },
};

