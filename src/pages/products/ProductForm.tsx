import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useQuery } from 'react-query';
import { useAuthStore } from '../../store/authStore.js';
import api from '../../services/api.js';
import type { Product, Store } from '../../types/index.js';

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

interface ProductFormProps {
  product: Product | null;
  onSave: (data: ProductFormData) => void;
  onCancel: () => void;
}

interface StoresResponse {
  success: boolean;
  data: {
    stores: Store[];
  };
}

interface CategoriesResponse {
  success: boolean;
  data: {
    categories: string[];
  };
}

interface BrandsResponse {
  success: boolean;
  data: {
    brands: string[];
  };
}

const ProductForm = ({ product, onSave, onCancel }: ProductFormProps) => {
  const [formData, setFormData] = useState<Omit<ProductFormData, 'price' | 'cost' | 'taxRate'> & { price: string; cost: string; taxRate: string }>({
    store: '',
    name: '',
    sku: '',
    barcode: '',
    category: '',
    brand: '',
    description: '',
    price: '',
    cost: '',
    unit: 'pcs',
    taxRate: '0',
    image: '',
    isActive: true
  });

  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const storeId = typeof user?.store === 'object' ? user.store._id : user?.store || null;

  const { data: storesData } = useQuery<StoresResponse>(
    'stores',
    async () => {
      const response = await api.get<StoresResponse>('/stores');
      return response.data;
    },
    { enabled: isAdmin }
  );

  const { data: categoriesData } = useQuery<CategoriesResponse>(
    ['categories', storeId],
    async () => {
      const params: Record<string, string> = {};
      if (storeId && user?.role !== 'admin') params.store = storeId;
      const response = await api.get<CategoriesResponse>('/products/categories', { params });
      return response.data;
    }
  );

  const { data: brandsData } = useQuery<BrandsResponse>(
    ['brands', storeId],
    async () => {
      const params: Record<string, string> = {};
      if (storeId && user?.role !== 'admin') params.store = storeId;
      const response = await api.get<BrandsResponse>('/products/brands', { params });
      return response.data;
    }
  );

  useEffect(() => {
    if (product) {
      const storeValue = typeof product.store === 'object' ? product.store._id : product.store || '';
      setFormData({
        store: storeValue,
        name: product.name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category: product.category || '',
        brand: product.brand || '',
        description: product.description || '',
        price: String(product.price || ''),
        cost: String(product.cost || ''),
        unit: product.unit || 'pcs',
        taxRate: String(product.taxRate || 0),
        image: product.image || '',
        isActive: product.isActive !== undefined ? product.isActive : true
      });
    }
  }, [product]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : type === 'number' ? value : value
    } as typeof formData);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitData: ProductFormData = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      cost: parseFloat(formData.cost) || 0,
      taxRate: parseFloat(formData.taxRate) || 0
    };
    onSave(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isAdmin && !product && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Store <span className="text-red-500">*</span>
          </label>
          <select
            name="store"
            value={formData.store || ''}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a store</option>
            {storesData?.data?.stores?.map((store) => (
              <option key={store._id} value={store._id}>
                {store.name} ({store.code})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter product name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SKU <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
            placeholder="e.g., PROD001"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Barcode
          </label>
          <input
            type="text"
            name="barcode"
            value={formData.barcode}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Optional barcode"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brand
          </label>
          <input
            type="text"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Product brand"
            list="brands-list"
          />
          <datalist id="brands-list">
            {brandsData?.data?.brands?.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Skincare, Makeup, Hair Care"
          list="categories-list"
        />
        <datalist id="categories-list">
          {categoriesData?.data?.categories?.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Product description"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selling Price (৳) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cost Price (৳) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="cost"
            value={formData.cost}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tax Rate (%)
          </label>
          <input
            type="number"
            name="taxRate"
            value={formData.taxRate}
            onChange={handleChange}
            min="0"
            max="100"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unit <span className="text-red-500">*</span>
          </label>
          <select
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="pcs">Pieces (pcs)</option>
            <option value="kg">Kilogram (kg)</option>
            <option value="gm">Gram (gm)</option>
            <option value="L">Liter (L)</option>
            <option value="mL">Milliliter (mL)</option>
            <option value="box">Box</option>
            <option value="pack">Pack</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image URL
          </label>
          <input
            type="url"
            name="image"
            value={formData.image}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/image.jpg"
          />
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          name="isActive"
          id="isActive"
          checked={formData.isActive}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
          Product is active
        </label>
      </div>

      <div className="flex items-center space-x-4 pt-4">
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {product ? 'Update Product' : 'Create Product'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ProductForm;

