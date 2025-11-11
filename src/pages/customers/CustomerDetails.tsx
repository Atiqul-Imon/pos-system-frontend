import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { customerService } from '../../services/customerService.js';
import { loyaltyService } from '../../services/loyaltyService.js';
import type { Customer } from '../../types/index.js';
import { format } from 'date-fns';

interface CustomerDetailsProps {
  customer: Customer;
  onClose: () => void;
  onEdit: () => void;
}

const CustomerDetails = ({ customer, onClose, onEdit }: CustomerDetailsProps) => {
  const queryClient = useQueryClient();
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [redeemReason, setRedeemReason] = useState('');

  const { data: customerData, isLoading } = useQuery(
    ['customer', customer._id],
    () => customerService.getCustomer(customer._id),
    { enabled: true }
  );

  const { data: loyaltyHistory } = useQuery(
    ['loyalty-history', customer._id],
    () => loyaltyService.getLoyaltyHistory(customer._id, 50),
    { enabled: true }
  );

  const redeemMutation = useMutation(
    (data: { points: number; reason?: string }) => 
      loyaltyService.redeemPoints(customer._id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['customer', customer._id]);
        queryClient.invalidateQueries(['loyalty-history', customer._id]);
        setShowRedeemModal(false);
        setRedeemPoints(0);
        setRedeemReason('');
      },
    }
  );

  const handleRedeem = () => {
    if (redeemPoints > 0 && redeemPoints <= customer.loyaltyPoints) {
      redeemMutation.mutate({
        points: redeemPoints,
        reason: redeemReason || 'Points redeemed'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl">Loading...</div>
      </div>
    );
  }

  const fullCustomerData = customerData?.data?.customer || customer;
  const transactions = customerData?.data?.recentTransactions || [];
  const history = loyaltyHistory?.data?.history || [];

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-mercellus text-gray-800">Customer Details</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Customer Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
              <div className="space-y-2">
                <p><strong>Name:</strong> {fullCustomerData.name}</p>
                <p><strong>Phone:</strong> {fullCustomerData.phone}</p>
                {fullCustomerData.email && <p><strong>Email:</strong> {fullCustomerData.email}</p>}
                {fullCustomerData.alternatePhone && <p><strong>Alternate Phone:</strong> {fullCustomerData.alternatePhone}</p>}
                {fullCustomerData.address && (
                  <div>
                    <strong>Address:</strong>
                    <p>{fullCustomerData.address.street}</p>
                    <p>{fullCustomerData.address.city}, {fullCustomerData.address.district}</p>
                    {fullCustomerData.address.postalCode && <p>Postal Code: {fullCustomerData.address.postalCode}</p>}
                  </div>
                )}
                {fullCustomerData.dateOfBirth && (
                  <p><strong>Date of Birth:</strong> {format(new Date(fullCustomerData.dateOfBirth), 'MMM dd, yyyy')}</p>
                )}
                {fullCustomerData.gender && <p><strong>Gender:</strong> {fullCustomerData.gender}</p>}
                {fullCustomerData.tags && fullCustomerData.tags.length > 0 && (
                  <div>
                    <strong>Tags:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {fullCustomerData.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {fullCustomerData.notes && <p><strong>Notes:</strong> {fullCustomerData.notes}</p>}
              </div>
            </div>

            {/* Loyalty Points */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Loyalty Points</h3>
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {fullCustomerData.loyaltyPoints} Points
                </div>
                <p className="text-sm text-gray-600">Total Spent: ৳{fullCustomerData.totalSpent.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Total Transactions: {fullCustomerData.totalTransactions}</p>
                {fullCustomerData.lastPurchaseDate && (
                  <p className="text-sm text-gray-600">
                    Last Purchase: {format(new Date(fullCustomerData.lastPurchaseDate), 'MMM dd, yyyy')}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowRedeemModal(true)}
                  disabled={fullCustomerData.loyaltyPoints === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Redeem Points
                </button>
                <button
                  onClick={onEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit Customer
                </button>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Transaction #</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Points Earned</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((txn: any) => (
                    <tr key={txn._id}>
                      <td className="px-4 py-2 text-sm">{txn.transactionNumber}</td>
                      <td className="px-4 py-2 text-sm">
                        {format(new Date(txn.createdAt), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-2 text-sm">৳{txn.total.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-green-600">
                        {txn.loyaltyPointsEarned || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length === 0 && (
                <p className="text-center text-gray-500 py-4">No transactions yet</p>
              )}
            </div>
          </div>

          {/* Loyalty Points History */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Loyalty Points History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((item: any) => (
                    <tr key={item._id}>
                      <td className="px-4 py-2 text-sm">
                        {format(new Date(item.createdAt), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 text-xs rounded ${
                          item.type === 'earned' ? 'bg-green-100 text-green-800' :
                          item.type === 'redeemed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className={`px-4 py-2 text-sm font-medium ${
                        item.points > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.points > 0 ? '+' : ''}{item.points}
                      </td>
                      <td className="px-4 py-2 text-sm">{item.balance}</td>
                      <td className="px-4 py-2 text-sm">{item.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.length === 0 && (
                <p className="text-center text-gray-500 py-4">No loyalty points history</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Redeem Points Modal */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Redeem Loyalty Points</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Available Points: <strong>{fullCustomerData.loyaltyPoints}</strong></p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points to Redeem
                </label>
                <input
                  type="number"
                  min="1"
                  max={fullCustomerData.loyaltyPoints}
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={redeemReason}
                  onChange={(e) => setRedeemReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowRedeemModal(false);
                    setRedeemPoints(0);
                    setRedeemReason('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRedeem}
                  disabled={redeemPoints <= 0 || redeemPoints > fullCustomerData.loyaltyPoints || redeemMutation.isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {redeemMutation.isLoading ? 'Redeeming...' : 'Redeem'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerDetails;

