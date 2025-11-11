import { useState, ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api.js';
import { useAuthStore } from '../../store/authStore.js';
import ProductForm from './ProductForm';
import type { Product } from '../../types/index.js';

interface ProductsResponse {
  success: boolean;
  data: {
    products: Product[];
  };
}

interface ProductFormData {
  store?: string;
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
}

const Products = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const storeId = typeof user?.store === 'object' ? user.store._id : user?.store || null;

  const { data, isLoading } = useQuery<ProductsResponse>(
    ['products', storeId],
    async () => {
      const params: Record<string, string | boolean> = { isActive: true };
      if (user?.role === 'admin' && storeId) {
        params.store = storeId;
      }
      const response = await api.get<ProductsResponse>('/products', { params });
      return response.data;
    }
  );

  const createProductMutation = useMutation(
    async (productData: ProductFormData) => {
      const response = await api.post('/products', productData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        queryClient.invalidateQueries('categories');
        queryClient.invalidateQueries('brands');
        setShowForm(false);
        setEditingProduct(null);
      },
    }
  );

  const updateProductMutation = useMutation(
    async ({ id, data }: { id: string; data: ProductFormData }) => {
      const response = await api.put(`/products/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        setShowForm(false);
        setEditingProduct(null);
      },
    }
  );

  const handleSave = (formData: ProductFormData) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct._id, data: formData });
    } else {
      createProductMutation.mutate(formData);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const canManageProducts = user?.role === 'admin' || user?.role === 'manager';

  const filteredProducts = data?.data?.products?.filter((product) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(search) ||
      product.sku.toLowerCase().includes(search) ||
      product.category.toLowerCase().includes(search) ||
      (product.barcode && product.barcode.toLowerCase().includes(search))
    );
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-mercellus">Products</h1>
        {canManageProducts && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : '+ Add Product'}
          </button>
        )}
      </div>

      {showForm && canManageProducts && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-mercellus mb-4">
            {editingProduct ? 'Edit Product' : 'Create New Product'}
          </h2>
          <ProductForm
            product={editingProduct}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search products by name, SKU, category, or barcode..."
          value={searchTerm}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Brand
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {canManageProducts && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts?.map((product) => (
              <tr key={product._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  {product.description && (
                    <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                      {product.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{product.sku}</div>
                  {product.barcode && (
                    <div className="text-xs text-gray-400">{product.barcode}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{product.category}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{product.brand || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">৳{product.price.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">{product.unit}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">৳{product.cost.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {canManageProducts && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredProducts?.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow text-center mt-6">
          <p className="text-gray-600">
            {searchTerm ? 'No products found matching your search' : 'No products found'}
          </p>
        </div>
      )}

      {filteredProducts && filteredProducts.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredProducts.length} of {data?.data?.products?.length || 0} products
        </div>
      )}
    </div>
  );
};

export default Products;

