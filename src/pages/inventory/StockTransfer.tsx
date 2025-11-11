import { useState, FormEvent, ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import api from '../../services/api.js';
import { useAuthStore } from '../../store/authStore.js';

interface Store {
  _id: string;
  name: string;
  code: string;
}

interface StoresResponse {
  success: boolean;
  data: {
    stores: Store[];
  };
}

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

interface StockTransferFormProps {
  onClose: () => void;
}

const StockTransfer = ({ onClose }: StockTransferFormProps) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const storeId = typeof user?.store === 'object' ? user.store._id : user?.store || null;

  const [fromStoreId, setFromStoreId] = useState(storeId || '');
  const [toStoreId, setToStoreId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch stores (admin can see all, others only their store)
  const { data: storesData } = useQuery<StoresResponse>(
    'stores',
    async () => {
      const response = await api.get<StoresResponse>('/stores');
      return response.data;
    },
    { enabled: user?.role === 'admin' || user?.role === 'manager' }
  );

  // Fetch inventory for source store
  const { data: inventoryData } = useQuery<InventoryResponse>(
    ['inventory', fromStoreId],
    async () => {
      if (!fromStoreId) throw new Error('No store ID');
      const response = await api.get<InventoryResponse>(`/inventory/store/${fromStoreId}`);
      return response.data;
    },
    { enabled: !!fromStoreId }
  );

  const selectedProduct = inventoryData?.data?.inventory?.find(
    (inv) => (typeof inv.product === 'object' ? inv.product._id : inv.product) === productId
  );

  const availableQuantity = selectedProduct?.quantity || 0;

  const transferMutation = useMutation(
    async ({
      fromStoreId,
      toStoreId,
      productId,
      quantity,
      notes,
    }: {
      fromStoreId: string;
      toStoreId: string;
      productId: string;
      quantity: number;
      notes: string;
    }) => {
      const response = await api.post('/inventory/transfer', {
        fromStoreId,
        toStoreId,
        productId,
        quantity,
        notes,
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['inventory']);
        onClose();
      },
      onError: (err: any) => {
        setError(err.response?.data?.message || 'Failed to transfer stock');
      }
    }
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!fromStoreId || !toStoreId) {
      setError('Please select both source and destination stores');
      return;
    }

    if (fromStoreId === toStoreId) {
      setError('Source and destination stores cannot be the same');
      return;
    }

    if (!productId) {
      setError('Please select a product');
      return;
    }

    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (quantity > availableQuantity) {
      setError(`Insufficient stock. Available: ${availableQuantity}`);
      return;
    }

    setLoading(true);

    try {
      await transferMutation.mutateAsync({
        fromStoreId,
        toStoreId,
        productId,
        quantity,
        notes,
      });
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
            <h2 className="text-2xl font-mercellus">Transfer Stock Between Stores</h2>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Store <span className="text-red-500">*</span>
                </label>
                <select
                  value={fromStoreId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    setFromStoreId(e.target.value);
                    setProductId(''); // Reset product when store changes
                  }}
                  required
                  disabled={user?.role !== 'admin'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select Store</option>
                  {storesData?.data?.stores?.map((store) => (
                    <option key={store._id} value={store._id}>
                      {store.name} ({store.code})
                    </option>
                  ))}
                  {!storesData && storeId && (
                    <option value={storeId}>Current Store</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Store <span className="text-red-500">*</span>
                </label>
                <select
                  value={toStoreId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setToStoreId(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Store</option>
                  {storesData?.data?.stores
                    ?.filter((store) => store._id !== fromStoreId)
                    .map((store) => (
                      <option key={store._id} value={store._id}>
                        {store.name} ({store.code})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product <span className="text-red-500">*</span>
              </label>
              <select
                value={productId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setProductId(e.target.value)}
                required
                disabled={!fromStoreId}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select Product</option>
                {inventoryData?.data?.inventory?.map((inv) => {
                  const product = typeof inv.product === 'object' ? inv.product : null;
                  return (
                    <option key={inv._id} value={product?._id || ''}>
                      {product?.name} ({product?.sku}) - Stock: {inv.quantity}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedProduct && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-900">
                  Available Stock: <span className="font-semibold">{availableQuantity}</span>
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity to Transfer <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={quantity || ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setQuantity(Number(e.target.value))
                }
                min="1"
                max={availableQuantity}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Optional notes about the transfer"
              />
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
                {loading ? 'Transferring...' : 'Transfer Stock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StockTransfer;

