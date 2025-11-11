import { useQuery } from 'react-query';
import api from '../../services/api.js';
import { useAuthStore } from '../../store/authStore.js';
import { format } from 'date-fns';
import type { Transaction } from '../../types/index.js';

interface TransactionsResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
  };
}

const Transactions = () => {
  const { user } = useAuthStore();
  const storeId = typeof user?.store === 'object' ? user.store._id : user?.store || null;

  const { data, isLoading } = useQuery<TransactionsResponse>(
    ['transactions', storeId],
    async () => {
      const params: Record<string, string> = {};
      if (storeId) params.store = storeId;
      const response = await api.get<TransactionsResponse>('/transactions', { params });
      return response.data;
    },
    {
      staleTime: 1 * 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-mercellus">Transactions</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Transaction #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.data?.transactions?.map((transaction) => (
              <tr key={transaction._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{transaction.transactionNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    transaction.type === 'sale' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {transaction.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {transaction.createdAt ? format(new Date(transaction.createdAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{transaction.items.length} items</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">৳{transaction.total.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 capitalize">{transaction.paymentMethod}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.data?.transactions?.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow text-center mt-6">
          <p className="text-gray-600">No transactions found</p>
        </div>
      )}
    </div>
  );
};

export default Transactions;

