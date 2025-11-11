import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { customerService } from '../../services/customerService.js';
import type { Customer } from '../../types/index.js';

interface CustomerFormProps {
  customer: Customer | null;
  onSave: () => void;
  onCancel: () => void;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  alternatePhone: string;
  address: {
    street: string;
    city: string;
    district: string;
    postalCode: string;
    country: string;
  };
  dateOfBirth: string;
  gender: string;
  notes: string;
  tags: string;
}

const CustomerForm = ({ customer, onSave, onCancel }: CustomerFormProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    alternatePhone: '',
    address: {
      street: '',
      city: '',
      district: '',
      postalCode: '',
      country: 'Bangladesh'
    },
    dateOfBirth: '',
    gender: '',
    notes: '',
    tags: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      const customerAddress = customer.address || {};
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        alternatePhone: customer.alternatePhone || '',
        address: {
          street: customerAddress.street || '',
          city: customerAddress.city || '',
          district: customerAddress.district || '',
          postalCode: customerAddress.postalCode || '',
          country: customerAddress.country || 'Bangladesh'
        },
        dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth).toISOString().split('T')[0] : '',
        gender: customer.gender || '',
        notes: customer.notes || '',
        tags: customer.tags?.join(', ') || ''
      });
    }
  }, [customer]);

  const createMutation = useMutation(
    (data: any) => customerService.createCustomer(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customers');
        onSave();
      },
      onError: (err: any) => {
        setError(err.response?.data?.message || 'Failed to create customer');
        setLoading(false);
      }
    }
  );

  const updateMutation = useMutation(
    (data: any) => customerService.updateCustomer(customer!._id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customers');
        onSave();
      },
      onError: (err: any) => {
        setError(err.response?.data?.message || 'Failed to update customer');
        setLoading(false);
      }
    }
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1] as keyof CustomerFormData['address'];
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
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const customerData: any = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      alternatePhone: formData.alternatePhone.trim() || undefined,
      address: formData.address.street ? {
        ...formData.address,
        street: formData.address.street.trim() || undefined,
        city: formData.address.city.trim() || undefined,
        district: formData.address.district.trim() || undefined,
        postalCode: formData.address.postalCode.trim() || undefined,
        country: formData.address.country || 'Bangladesh'
      } : undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      gender: formData.gender || undefined,
      notes: formData.notes.trim() || undefined,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
    };

    try {
      if (customer) {
        await updateMutation.mutateAsync(customerData);
      } else {
        await createMutation.mutateAsync(customerData);
      }
    } catch (err) {
      // Error handled in mutation
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-mercellus text-gray-800">
            {customer ? 'Edit Customer' : 'Add Customer'}
          </h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 text-xl">
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
                Name <span className="text-red-500">*</span>
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
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alternate Phone
              </label>
              <input
                type="tel"
                name="alternatePhone"
                value={formData.alternatePhone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Address
            </label>
            <input
              type="text"
              name="address.street"
              value={formData.address.street}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                District
              </label>
              <input
                type="text"
                name="address.district"
                value={formData.address.district}
                onChange={handleChange}
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
                value={formData.address.postalCode}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., VIP, Regular, Premium"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : customer ? 'Update Customer' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerForm;

