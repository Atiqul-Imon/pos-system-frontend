import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useQuery } from 'react-query';
import api from '../../services/api.js';
import type { StoreWithManager } from '../../types/index.js';

interface StoreFormData {
  name: string;
  code: string;
  address: {
    street: string;
    city: string;
    district: string;
    postalCode?: string;
    country: string;
  };
  phone: string;
  email?: string;
  manager?: string;
  isActive: boolean;
}

// Type for form state (allows empty strings for input fields)
interface StoreFormState {
  name: string;
  code: string;
  address: {
    street: string;
    city: string;
    district: string;
    postalCode: string;
    country: string;
  };
  phone: string;
  email: string;
  manager: string;
  isActive: boolean;
}

interface StoreFormProps {
  store: StoreWithManager | null;
  onSave: (data: StoreFormData) => void;
  onCancel: () => void;
}

const StoreForm = ({ store, onSave, onCancel }: StoreFormProps) => {
  const [formData, setFormData] = useState<StoreFormState>({
    name: '',
    code: '',
    address: {
      street: '',
      city: '',
      district: '',
      postalCode: '',
      country: 'Bangladesh'
    },
    phone: '',
    email: '',
    manager: '',
    isActive: true
  });

  useQuery('managers', async () => {
    const response = await api.get('/auth/users?role=manager');
    return response.data;
  }, {
    enabled: false // This endpoint needs to be created
  });

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        code: store.code || '',
        address: {
          street: store.address?.street || '',
          city: store.address?.city || '',
          district: store.address?.district || '',
          postalCode: store.address?.postalCode || '',
          country: store.address?.country || 'Bangladesh'
        },
        phone: store.phone || '',
        email: store.email || '',
        manager: typeof store.manager === 'object' ? store.manager._id || '' : store.manager || '',
        isActive: store.isActive !== undefined ? store.isActive : true
      });
    }
  }, [store]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1] as keyof StoreFormState['address'];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: name === 'isActive' ? (e.target as HTMLInputElement).checked : value
      } as StoreFormState);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Clean up form data: remove empty strings for optional fields
    const cleanedData: StoreFormData = {
      ...formData,
      email: formData.email && formData.email.trim() !== '' ? formData.email : undefined,
      manager: formData.manager && formData.manager.trim() !== '' ? formData.manager : undefined,
      address: {
        ...formData.address,
        postalCode: formData.address.postalCode && formData.address.postalCode.trim() !== '' 
          ? formData.address.postalCode 
          : undefined
      }
    };
    onSave(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Store Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Store Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="code"
            value={formData.code}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
            placeholder="e.g., BC001"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Street Address <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="address.street"
          value={formData.address.street}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="address.city"
            value={formData.address.city}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            District <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="address.district"
            value={formData.address.district}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Postal Code
          </label>
          <input
            type="text"
            name="address.postalCode"
            value={formData.address.postalCode || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="+880 1234 567890"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {store ? 'Update Store' : 'Create Store'}
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

export default StoreForm;

