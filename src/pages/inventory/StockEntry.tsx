import { useState, FormEvent, ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import api from '../../services/api.js';
import { useAuthStore } from '../../store/authStore.js';

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface ProductsResponse {
  success: boolean;
  data: {
    products: Product[];
  };
}

interface StockEntryItem {
  product: string;
  quantity: number;
  cost?: number;
  notes?: string;
}

interface StockEntryFormProps {
  onClose: () => void;
}

const StockEntry = ({ onClose }: StockEntryFormProps) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const storeId = typeof user?.store === 'object' ? user.store._id : user?.store || null;

  const [items, setItems] = useState<StockEntryItem[]>([{ product: '', quantity: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch products for the store
  const { data: productsData } = useQuery<ProductsResponse>(
    ['products', storeId],
    async () => {
      if (!storeId) throw new Error('No store ID');
      const response = await api.get<ProductsResponse>(`/products?store=${storeId}`);
      return response.data;
    },
    { enabled: !!storeId }
  );

  const stockEntryMutation = useMutation(
    async (entryItems: StockEntryItem[]) => {
      if (!storeId) throw new Error('No store ID');
      
      // Get current inventory first
      const inventoryResponse = await api.get(`/inventory/store/${storeId}`);
      const currentInventory = inventoryResponse.data.data.inventory;

      // Process each item
      await Promise.all(
        entryItems.map(async (item) => {
          const existingInv = currentInventory.find(
            (inv: any) => 
              (typeof inv.product === 'object' ? inv.product._id : inv.product) === item.product
          );
          
          if (existingInv) {
            // Calculate adjustment needed (add the received quantity)
            const adjustment = item.quantity;
            if (adjustment > 0) {
              await api.patch(
                `/inventory/store/${storeId}/product/${item.product}/adjust`,
                {
                  adjustment,
                  reason: `Stock received${item.notes ? ': ' + item.notes : ''}`
                }
              );
            }
          } else {
            // Create new inventory with the received quantity
            await api.put(
              `/inventory/store/${storeId}/product/${item.product}`,
              {
                quantity: item.quantity,
                reorderPoint: 10,
                reorderQuantity: 50
              }
            );
          }
        })
      );

      return { success: true };
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['inventory', storeId]);
        onClose();
      },
      onError: (err: any) => {
        setError(err.response?.data?.message || 'Failed to add stock');
      }
    }
  );

  const handleAddItem = () => {
    setItems([...items, { product: '', quantity: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof StockEntryItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate items
    const validItems = items.filter(item => item.product && item.quantity > 0);
    if (validItems.length === 0) {
      setError('Please add at least one item with quantity');
      setLoading(false);
      return;
    }

    try {
      await stockEntryMutation.mutateAsync(validItems);
    } catch (err) {
      // Error handled in mutation
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-mercellus">Stock Entry / Receiving</h2>
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
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-end border-b pb-4">
                  <div className="col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={item.product}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        handleItemChange(index, 'product', e.target.value)
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Product</option>
                      {productsData?.data?.products?.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={item.quantity || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleItemChange(index, 'quantity', Number(e.target.value))
                      }
                      min="1"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleItemChange(index, 'notes', e.target.value)
                      }
                      placeholder="Optional notes"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2 flex gap-2">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                + Add Item
              </button>

              <div className="flex gap-4">
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
                  {loading ? 'Processing...' : 'Receive Stock'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StockEntry;

