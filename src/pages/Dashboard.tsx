import { useState, ChangeEvent } from 'react';
import { useQuery } from 'react-query';
import api from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import type { Store } from '../types/index.js';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface StoresResponse {
  success: boolean;
  data: {
    stores: Store[];
  };
}

interface GroupedData {
  date: string;
  sales: number;
  transactions: number;
  items: number;
}

interface SalesReportResponse {
  success: boolean;
  data: {
    summary: {
      totalSales: number;
      totalTransactions: number;
      totalItems?: number;
      averageTransaction?: number;
    };
    grouped?: GroupedData[];
  };
}

interface TopProduct {
  product: {
    _id: string;
    name: string;
    sku?: string;
  };
  quantity: number;
  revenue: number;
}

interface TopProductsResponse {
  success: boolean;
  data: {
    topProducts: TopProduct[];
  };
}

interface InventoryReportResponse {
  success: boolean;
  data: {
    summary: {
      totalProducts: number;
      totalValue?: number;
      lowStockCount: number;
      outOfStockCount?: number;
    };
  };
}

const Dashboard = () => {
  const { user } = useAuthStore();
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';

  // Fetch all stores for admin
  const { data: storesData } = useQuery<StoresResponse>(
    'stores',
    async () => {
      const response = await api.get<StoresResponse>('/stores');
      return response.data;
    },
    { enabled: isAdmin }
  );

  const storeId = selectedStore || (typeof user?.store === 'object' ? user.store._id : user?.store) || null;

  // Sales report for selected store or user's store
  const { data: salesData } = useQuery<SalesReportResponse>(
    ['sales-report', storeId],
    async () => {
      const params: Record<string, string> = { groupBy: 'day' };
      if (storeId) params.store = storeId;
      const response = await api.get<SalesReportResponse>('/reports/sales', { params });
      return response.data;
    },
    { enabled: !!storeId || isAdmin }
  );

  // Combined sales report for admin (all stores)
  const { data: combinedSalesData } = useQuery<SalesReportResponse>(
    'combined-sales-report',
    async () => {
      const response = await api.get<SalesReportResponse>('/reports/sales?groupBy=day');
      return response.data;
    },
    { enabled: isAdmin }
  );

  // Top products
  const { data: topProductsData } = useQuery<TopProductsResponse>(
    ['top-products', storeId],
    async () => {
      const params: Record<string, string> = { limit: '5' };
      if (storeId) params.store = storeId;
      const response = await api.get<TopProductsResponse>('/reports/top-products', { params });
      return response.data;
    },
    { enabled: !!storeId || isAdmin }
  );

  // Inventory report for selected store or user's store
  const { data: inventoryData } = useQuery<InventoryReportResponse>(
    ['inventory-report', storeId],
    async () => {
      const params: Record<string, string> = {};
      if (storeId) params.store = storeId;
      const response = await api.get<InventoryReportResponse>('/reports/inventory', { params });
      return response.data;
    },
    { enabled: !!storeId || isAdmin }
  );

  // Combined inventory report for admin
  const { data: combinedInventoryData } = useQuery<InventoryReportResponse>(
    'combined-inventory-report',
    async () => {
      const response = await api.get<InventoryReportResponse>('/reports/inventory');
      return response.data;
    },
    { enabled: isAdmin }
  );

  const displaySalesData = isAdmin && !selectedStore ? combinedSalesData : salesData;
  const displayInventoryData = isAdmin && !selectedStore ? combinedInventoryData : inventoryData;

  const handleStoreChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedStore(e.target.value === 'all' ? null : e.target.value);
  };

  // Format chart data
  const salesChartData = displaySalesData?.data?.grouped?.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sales: item.sales,
    transactions: item.transactions
  })) || [];

  const topProductsChartData = topProductsData?.data?.topProducts?.map(item => ({
    name: item.product.name.length > 15 ? item.product.name.substring(0, 15) + '...' : item.product.name,
    quantity: item.quantity,
    revenue: item.revenue
  })) || [];

  // Inventory pie chart data
  const inventoryPieData = displayInventoryData?.data?.summary ? [
    {
      name: 'In Stock',
      value: (displayInventoryData.data.summary.totalProducts || 0) - (displayInventoryData.data.summary.lowStockCount || 0)
    },
    {
      name: 'Low Stock',
      value: displayInventoryData.data.summary.lowStockCount || 0
    }
  ] : [];

  const PIE_COLORS = ['#10B981', '#F59E0B'];

  // Calculate percentage changes (mock for now, can be enhanced with previous period data)
  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-mercellus text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
        </div>
        {isAdmin && (
          <div className="flex items-center space-x-4">
            <select
              value={selectedStore || 'all'}
              onChange={handleStoreChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            >
              <option value="all">All Stores (Combined)</option>
              {storesData?.data?.stores?.map((store) => (
                <option key={store._id} value={store._id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Info Banner */}
      {isAdmin && !selectedStore && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <p className="text-blue-800">
            <strong>Admin View:</strong> Showing combined data from all stores. Select a specific store to view store-specific data.
          </p>
        </div>
      )}

      {selectedStore && (
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-gray-800">
            <strong>Store View:</strong> Showing data for{' '}
            {storesData?.data?.stores?.find(s => s._id === selectedStore)?.name || 'Selected Store'}
          </p>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sales Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-blue-100 text-sm font-medium mb-2">Total Sales</h3>
          <p className="text-3xl font-bold">
            {formatCurrency(displaySalesData?.data?.summary?.totalSales || 0)}
          </p>
          {displaySalesData?.data?.summary?.averageTransaction && (
            <p className="text-blue-100 text-xs mt-2">
              Avg: {formatCurrency(displaySalesData.data.summary.averageTransaction)}
            </p>
          )}
        </div>

        {/* Transactions Card */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h3 className="text-purple-100 text-sm font-medium mb-2">Transactions</h3>
          <p className="text-3xl font-bold">
            {displaySalesData?.data?.summary?.totalTransactions || '0'}
          </p>
          {displaySalesData?.data?.summary?.totalItems && (
            <p className="text-purple-100 text-xs mt-2">
              {displaySalesData.data.summary.totalItems} items sold
            </p>
          )}
        </div>

        {/* Products Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <h3 className="text-green-100 text-sm font-medium mb-2">Total Products</h3>
          <p className="text-3xl font-bold">
            {displayInventoryData?.data?.summary?.totalProducts || '0'}
          </p>
          {displayInventoryData?.data?.summary?.totalValue && (
            <p className="text-green-100 text-xs mt-2">
              Value: {formatCurrency(displayInventoryData.data.summary.totalValue)}
            </p>
          )}
        </div>

        {/* Low Stock Card */}
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h3 className="text-orange-100 text-sm font-medium mb-2">Low Stock Items</h3>
          <p className="text-3xl font-bold">
            {displayInventoryData?.data?.summary?.lowStockCount || '0'}
          </p>
          {displayInventoryData?.data?.summary?.outOfStockCount !== undefined && (
            <p className="text-orange-100 text-xs mt-2">
              {displayInventoryData.data.summary.outOfStockCount} out of stock
            </p>
          )}
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-mercellus text-gray-900">Sales Trend</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Sales</span>
            </div>
          </div>
          {salesChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesChartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6B7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6B7280"
                  fontSize={12}
                  tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#3B82F6" 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>No sales data available</p>
            </div>
          )}
        </div>

        {/* Transaction Volume Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-mercellus text-gray-900">Transaction Volume</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>Transactions</span>
            </div>
          </div>
          {salesChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6B7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6B7280"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar 
                  dataKey="transactions" 
                  fill="#8B5CF6"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>No transaction data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-mercellus text-gray-900 mb-4">Top Selling Products</h2>
          {topProductsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={topProductsChartData}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  type="number"
                  stroke="#6B7280"
                  fontSize={12}
                />
                <YAxis 
                  dataKey="name" 
                  type="category"
                  stroke="#6B7280"
                  fontSize={12}
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => `${value} units`}
                />
                <Bar 
                  dataKey="quantity" 
                  fill="#10B981"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>No product data available</p>
            </div>
          )}
        </div>

        {/* Inventory Status Pie Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-mercellus text-gray-900 mb-4">Inventory Status</h2>
          {inventoryPieData.length > 0 && inventoryPieData.some(item => item.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={inventoryPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {inventoryPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>No inventory data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Store-specific breakdown for admin */}
      {isAdmin && !selectedStore && storesData?.data?.stores && storesData.data.stores.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-mercellus text-gray-900 mb-4">Store-wise Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {storesData.data.stores.map((store) => (
              <div 
                key={store._id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedStore(store._id)}
              >
                <h3 className="font-semibold text-gray-900 mb-2">{store.name}</h3>
                <p className="text-sm text-gray-600 mb-1">Code: {store.code}</p>
                <p className="text-sm text-gray-600 mb-3">{store.address?.city}</p>
                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View Details →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
