import type { User, Store } from '../services/authService.js';

export interface Product {
  _id: string;
  store: Store | string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  brand?: string;
  description?: string;
  price: number;
  cost: number;
  unit: 'pcs' | 'kg' | 'gm' | 'L' | 'mL' | 'box' | 'pack';
  taxRate: number;
  image?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Inventory {
  _id: string;
  store: Store | string;
  product: Product | string;
  quantity: number;
  reservedQuantity: number;
  reorderPoint: number;
  reorderQuantity: number;
  lastRestocked?: string;
  location?: string;
  availableQuantity?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransactionItem {
  product: Product | string;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  subtotal: number;
}

export interface Customer {
  _id: string;
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
  loyaltyPoints: number;
  totalSpent: number;
  totalTransactions: number;
  lastPurchaseDate?: string;
  notes?: string;
  tags?: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoyaltyTransaction {
  _id: string;
  customer: Customer | string;
  store: Store | string;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  points: number;
  balance: number;
  transaction?: Transaction | string;
  reason?: string;
  expiresAt?: string;
  notes?: string;
  createdBy: User | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  _id: string;
  transactionNumber: string;
  store: Store | string;
  type: 'sale' | 'return' | 'refund' | 'transfer_in' | 'transfer_out' | 'adjustment';
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile_payment' | 'mixed';
  paymentDetails: {
    cashAmount: number;
    cardAmount: number;
    mobileAmount: number;
    change: number;
  };
  customer?: Customer | string | {
    name?: string;
    phone?: string;
    email?: string;
  };
  cashier: User | string;
  status: 'completed' | 'pending' | 'cancelled';
  notes?: string;
  relatedTransaction?: string;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreWithManager extends Store {
  manager?: User;
  isActive: boolean;
  openingDate?: string;
}

export { User, Store };

