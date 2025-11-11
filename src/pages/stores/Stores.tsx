import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api.js';
import { useAuthStore } from '../../store/authStore.js';
import StoreForm from './StoreForm';
import type { StoreWithManager } from '../../types/index.js';

interface StoresResponse {
  success: boolean;
  data: {
    stores: StoreWithManager[];
  };
}

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

const Stores = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreWithManager | null>(null);

  const { data, isLoading } = useQuery<StoresResponse>('stores', async () => {
    const response = await api.get<StoresResponse>('/stores');
    return response.data;
  });

  const createStoreMutation = useMutation(
    async (storeData: StoreFormData) => {
      const response = await api.post('/stores', storeData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('stores');
        setShowForm(false);
        setEditingStore(null);
      },
    }
  );

  const updateStoreMutation = useMutation(
    async ({ id, data }: { id: string; data: StoreFormData }) => {
      const response = await api.put(`/stores/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('stores');
        setShowForm(false);
        setEditingStore(null);
      },
    }
  );

  const handleSave = (formData: StoreFormData) => {
    if (editingStore) {
      updateStoreMutation.mutate({ id: editingStore._id, data: formData });
    } else {
      createStoreMutation.mutate(formData);
    }
  };

  const handleEdit = (store: StoreWithManager) => {
    setEditingStore(store);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingStore(null);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const canManageStores = user?.role === 'admin';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-mercellus">Stores</h1>
        {canManageStores && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : '+ Add Store'}
          </button>
        )}
      </div>

      {showForm && canManageStores && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-mercellus mb-4">
            {editingStore ? 'Edit Store' : 'Create New Store'}
          </h2>
          <StoreForm
            store={editingStore}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.data?.stores?.map((store) => (
          <div key={store._id} className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-2">{store.name}</h3>
            <p className="text-gray-600 text-sm mb-2">Code: {store.code}</p>
            <p className="text-gray-600 text-sm mb-2">{store.address?.city}, {store.address?.district}</p>
            <p className="text-gray-600 text-sm mb-2">{store.phone}</p>
            {store.manager && typeof store.manager === 'object' && (
              <p className="text-gray-600 text-sm mb-2">
                Manager: {store.manager.name}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs ${
                store.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {store.isActive ? 'Active' : 'Inactive'}
              </span>
              {canManageStores && (
                <button
                  onClick={() => handleEdit(store)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {data?.data?.stores?.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-600">No stores found</p>
        </div>
      )}
    </div>
  );
};

export default Stores;

