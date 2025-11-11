import { useState, ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api.js';
import { useAuthStore } from '../../store/authStore.js';
import type { Inventory as InventoryType } from '../../types/index.js';
import StockEntry from './StockEntry.js';
import StockAdjustment from './StockAdjustment.js';
import StockTransfer from './StockTransfer.js';

interface InventoryResponse {
  success: boolean;
  data: {
    inventory: Array<InventoryType & {
      product: {
        _id: string;
        name: string;
        sku: string;
      };
    }>;
  };
}

interface LowStockResponse {
  success: boolean;
  data: {
    lowStockItems: Array<InventoryType & {
      product: {
        _id: string;
        name: string;
        sku: string;
      };
    }>;
  };
}

interface UpdateInventoryData {
  quantity?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  location?: string;
}

const Inventory = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const storeId = typeof user?.store === 'object' ? user.store._id : user?.store || null;
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateInventoryData>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showStockEntry, setShowStockEntry] = useState(false);
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
  const [showStockTransfer, setShowStockTransfer] = useState(false);
  
  const canManageInventory = user?.role === 'admin' || user?.role === 'manager';
  
  const { data, isLoading } = useQuery<InventoryResponse>(
    ['inventory', storeId, showLowStockOnly],
    async () => {
      if (!storeId) throw new Error('No store ID');
      const url = showLowStockOnly 
        ? `/inventory/store/${storeId}/low-stock`
        : `/inventory/store/${storeId}`;
      const response = await api.get<InventoryResponse>(url);
      return response.data;
    },
    { enabled: !!storeId }
  );

  const { data: lowStockData } = useQuery<LowStockResponse>(
    ['inventory', storeId, 'low-stock-count'],
    async () => {
      if (!storeId) throw new Error('No store ID');
      const response = await api.get<LowStockResponse>(`/inventory/store/${storeId}/low-stock`);
      return response.data;
    },
    { enabled: !!storeId }
  );

  const updateInventoryMutation = useMutation(
    async ({ productId, data }: { productId: string; data: UpdateInventoryData }) => {
      if (!storeId) throw new Error('No store ID');
      const response = await api.put(`/inventory/store/${storeId}/product/${productId}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['inventory', storeId]);
        setEditingItem(null);
        setEditForm({});
      },
    }
  );

  const adjustInventoryMutation = useMutation(
    async ({ productId, adjustment, reason }: { productId: string; adjustment: number; reason?: string }) => {
      if (!storeId) throw new Error('No store ID');
      const response = await api.patch(`/inventory/store/${storeId}/product/${productId}/adjust`, {
        adjustment,
        reason
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['inventory', storeId]);
      },
    }
  );

  const handleEdit = (item: InventoryType & { product: { _id: string; name: string; sku: string } }) => {
    setEditingItem(item._id);
    setEditForm({
      quantity: item.quantity,
      reorderPoint: item.reorderPoint,
      reorderQuantity: item.reorderQuantity,
      location: item.location || ''
    });
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditForm({});
  };

  const handleSave = (productId: string) => {
    updateInventoryMutation.mutate({ productId, data: editForm });
  };

  const handleQuickAdd = (productId: string, currentQuantity: number) => {
    const addAmount = prompt(`Enter quantity to add to current stock (${currentQuantity}):`);
    if (addAmount && !isNaN(Number(addAmount)) && Number(addAmount) > 0) {
      adjustInventoryMutation.mutate({
        productId,
        adjustment: Number(addAmount),
        reason: 'Stock added'
      });
    }
  };

  const handleQuickRemove = (productId: string, currentQuantity: number) => {
    const removeAmount = prompt(`Enter quantity to remove from current stock (${currentQuantity}):`);
    if (removeAmount && !isNaN(Number(removeAmount)) && Number(removeAmount) > 0) {
      if (Number(removeAmount) > currentQuantity) {
        alert('Cannot remove more than current stock');
        return;
      }
      adjustInventoryMutation.mutate({
        productId,
        adjustment: -Number(removeAmount),
        reason: 'Stock removed'
      });
    }
  };

  // Filter inventory by search term
  const filteredInventory = data?.data?.inventory?.filter((item) => {
    if (!searchTerm) return true;
    const product = typeof item.product === 'object' ? item.product : null;
    const searchLower = searchTerm.toLowerCase();
    return (
      product?.name.toLowerCase().includes(searchLower) ||
      product?.sku.toLowerCase().includes(searchLower)
    );
  }) || [];

  const lowStockCount = lowStockData?.data?.lowStockItems?.length || 0;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!storeId) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-center">
        <p className="text-gray-600">No store assigned. Please contact administrator.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-mercellus">Inventory Management</h1>
        {canManageInventory && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowStockEntry(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              + Stock Entry
            </button>
            <button
              onClick={() => setShowStockAdjustment(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Adjust Stock
            </button>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <button
                onClick={() => setShowStockTransfer(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Transfer Stock
              </button>
            )}
          </div>
        )}
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <strong>{lowStockCount} item(s)</strong> are running low on stock. 
                <button
                  onClick={() => setShowLowStockOnly(true)}
                  className="ml-2 underline font-semibold"
                >
                  View Low Stock Items
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="mb-6 flex gap-4 items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="lowStockOnly"
            checked={showLowStockOnly}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setShowLowStockOnly(e.target.checked)}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
          />
          <label htmlFor="lowStockOnly" className="ml-2 text-sm text-gray-700">
            Low Stock Only
          </label>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reorder Point
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {canManageInventory && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInventory.map((item) => {
              const isLowStock = item.quantity <= item.reorderPoint;
              const product = typeof item.product === 'object' ? item.product : null;
              const isEditing = editingItem === item._id;
              
              return (
                <tr key={item._id} className={isLowStock ? 'bg-red-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product?.name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{product?.sku || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.quantity ?? item.quantity}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => 
                          setEditForm({ ...editForm, quantity: Number(e.target.value) })
                        }
                        min="0"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <div className={`text-sm font-medium ${
                        isLowStock ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {item.quantity}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.reorderPoint ?? item.reorderPoint}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => 
                          setEditForm({ ...editForm, reorderPoint: Number(e.target.value) })
                        }
                        min="0"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <div className="text-sm text-gray-500">{item.reorderPoint}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isLowStock ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        In Stock
                      </span>
                    )}
                  </td>
                  {canManageInventory && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleSave(product?._id || '')}
                            className="text-green-600 hover:text-green-900"
                            disabled={updateInventoryMutation.isLoading}
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-red-600 hover:text-red-900"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleQuickAdd(product?._id || '', item.quantity)}
                            className="text-green-600 hover:text-green-900"
                            title="Add Stock"
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleQuickRemove(product?._id || '', item.quantity)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Remove Stock"
                          >
                            −
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredInventory.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow text-center mt-6">
          <p className="text-gray-600">
            {searchTerm || showLowStockOnly
              ? 'No inventory found matching your criteria'
              : 'No inventory found. Products will automatically get inventory entries when created.'}
          </p>
        </div>
      )}

      {/* Stock Management Modals */}
      {showStockEntry && (
        <StockEntry onClose={() => setShowStockEntry(false)} />
      )}
      {showStockAdjustment && (
        <StockAdjustment onClose={() => setShowStockAdjustment(false)} />
      )}
      {showStockTransfer && (
        <StockTransfer onClose={() => setShowStockTransfer(false)} />
      )}

      {/* Help Section */}
      {canManageInventory && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Stock Management Guide:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Stock Entry:</strong> Receive new stock from suppliers</li>
            <li>• <strong>Adjust Stock:</strong> Correct inventory (damage, loss, etc.)</li>
            <li>• <strong>Transfer Stock:</strong> Move stock between stores (Admin/Manager only)</li>
            <li>• <strong>Quick Actions:</strong> Use + and - buttons for quick adjustments</li>
            <li>• <strong>Edit:</strong> Click ✏️ to edit quantity and reorder point</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Inventory;
