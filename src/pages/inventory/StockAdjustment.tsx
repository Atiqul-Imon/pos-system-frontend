import { useState, FormEvent, ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import api from '../../services/api.js';
import { useAuthStore } from '../../store/authStore.js';

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface InventoryItem {
  _id: string;
  product: Product | string;
  quantity: number;
}

interface InventoryResponse {
  success: boolean;
  data: {
    inventory: InventoryItem[];
  };
}

interface StockAdjustmentFormProps {
  onClose: () => void;
}

type AdjustmentType = 'increase' | 'decrease' | 'set';

const StockAdjustment = ({ onClose }: StockAdjustmentFormProps) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const storeId = typeof user?.store === 'object' ? user.store._id : user?.store || null;

  const [productId, setProductId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('increase');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch inventory to get current quantities
  const { data: inventoryData } = useQuery<InventoryResponse>(
    ['inventory', storeId],
    async () => {
      if (!storeId) throw new Error('No store ID');
      const response = await api.get<InventoryResponse>(`/inventory/store/${storeId}`);
      return response.data;
    },
    { enabled: !!storeId }
  );

  const selectedProduct = inventoryData?.data?.inventory?.find(
    (inv) => (typeof inv.product === 'object' ? inv.product._id : inv.product) === productId
  );

  const currentQuantity = selectedProduct?.quantity || 0;

  const adjustmentMutation = useMutation(
    async ({ productId, adjustment, reason }: { productId: string; adjustment: number; reason: string }) => {
      if (!storeId) throw new Error('No store ID');
      const response = await api.patch(
        `/inventory/store/${storeId}/product/${productId}/adjust`,
        { adjustment, reason }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['inventory', storeId]);
        onClose();
      },
      onError: (err: any) => {
        setError(err.response?.data?.message || 'Failed to adjust inventory');
      }
    }
  );

  const updateMutation = useMutation(
    async ({ productId, quantity }: { productId: string; quantity: number }) => {
      if (!storeId) throw new Error('No store ID');
      const response = await api.put(
        `/inventory/store/${storeId}/product/${productId}`,
        { quantity }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['inventory', storeId]);
        onClose();
      },
      onError: (err: any) => {
        setError(err.response?.data?.message || 'Failed to update inventory');
      }
    }
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!productId) {
      setError('Please select a product');
      return;
    }

    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    const finalReason = reason === 'Other' ? customReason : reason;
    if (!finalReason.trim()) {
      setError('Please provide a reason for the adjustment');
      return;
    }

    setLoading(true);

    try {
      if (adjustmentType === 'set') {
        await updateMutation.mutateAsync({ productId, quantity });
      } else {
        const adjustment = adjustmentType === 'increase' ? quantity : -quantity;
        await adjustmentMutation.mutateAsync({ productId, adjustment, reason: finalReason });
      }
    } catch (err) {
      // Error handled in mutation
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-mercellus">Stock Adjustment</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product <span className="text-red-500">*</span>
              </label>
              <select
                value={productId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setProductId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Product</option>
                {inventoryData?.data?.inventory?.map((inv) => {
                  const product = typeof inv.product === 'object' ? inv.product : null;
                  return (
                    <option key={inv._id} value={product?._id || ''}>
                      {product?.name} ({product?.sku}) - Current: {inv.quantity}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedProduct && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  Current Stock: <span className="font-semibold">{currentQuantity}</span>
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adjustment Type <span className="text-red-500">*</span>
              </label>
              <select
                value={adjustmentType}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setAdjustmentType(e.target.value as AdjustmentType)
                }
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="increase">Increase (Add Stock)</option>
                <option value="decrease">Decrease (Remove Stock)</option>
                <option value="set">Set Quantity (Absolute)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {adjustmentType === 'set' ? 'New Quantity' : 'Adjustment Amount'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={quantity || ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setQuantity(Number(e.target.value))
                }
                min="1"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {adjustmentType !== 'set' && selectedProduct && (
                <p className="mt-1 text-sm text-gray-500">
                  New quantity will be:{' '}
                  <span className="font-semibold">
                    {currentQuantity + (adjustmentType === 'increase' ? quantity : -quantity)}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setReason(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
              >
                <option value="">Select Reason</option>
                <option value="Damage">Damage</option>
                <option value="Loss/Theft">Loss/Theft</option>
                <option value="Expired">Expired</option>
                <option value="Return to Supplier">Return to Supplier</option>
                <option value="Stock Count Correction">Stock Count Correction</option>
                <option value="Other">Other</option>
              </select>
              {reason === 'Other' && (
                <input
                  type="text"
                  placeholder="Specify reason"
                  value={customReason}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mt-2"
                  required
                />
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Apply Adjustment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StockAdjustment;

