import { useQuery } from 'react-query';
import api from '../../services/api.js';
import type { Product } from '../../types/index.js';

interface SalesReportResponse {
  success: boolean;
  data: {
    summary: {
      totalSales: number;
      totalTransactions: number;
      totalItems?: number;
      averageTransaction?: number;
    };
  };
}

interface TopProductsResponse {
  success: boolean;
  data: {
    topProducts: Array<{
      product: Product;
      quantity: number;
      revenue: number;
    }>;
  };
}

const Reports = () => {
  const { data: salesData } = useQuery<SalesReportResponse>('sales-report', async () => {
    const response = await api.get<SalesReportResponse>('/reports/sales?groupBy=day');
    return response.data;
  });

  const { data: topProducts } = useQuery<TopProductsResponse>('top-products', async () => {
    const response = await api.get<TopProductsResponse>('/reports/top-products?limit=10');
    return response.data;
  });

  return (
    <div>
      <h1 className="text-3xl font-mercellus mb-6">Reports</h1>

      {/* Sales Summary */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-2xl font-mercellus mb-4">Sales Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Sales</p>
            <p className="text-2xl font-bold">
              ৳{salesData?.data?.summary?.totalSales?.toLocaleString() || '0'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Transactions</p>
            <p className="text-2xl font-bold">
              {salesData?.data?.summary?.totalTransactions || '0'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Items Sold</p>
            <p className="text-2xl font-bold">
              {salesData?.data?.summary?.totalItems || '0'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Average Transaction</p>
            <p className="text-2xl font-bold">
              ৳{salesData?.data?.summary?.averageTransaction?.toLocaleString() || '0'}
            </p>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-mercellus mb-4">Top Selling Products</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity Sold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topProducts?.data?.topProducts?.map((item, index) => (
                <tr key={item.product._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 mr-2">#{index + 1}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                        <div className="text-sm text-gray-500">{item.product.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.quantity}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">৳{item.revenue.toLocaleString()}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {topProducts?.data?.topProducts?.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;

