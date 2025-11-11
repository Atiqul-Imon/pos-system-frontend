import { useState, ChangeEvent, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { customerService } from '../../services/customerService.js';
import type { Customer } from '../../types/index.js';
import CustomerForm from './CustomerForm';
import CustomerDetails from './CustomerDetails';

const Customers = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [filterTag, setFilterTag] = useState<string>('');

  const { data, isLoading } = useQuery(
    ['customers', searchTerm, sortBy, filterTag],
    () => customerService.getAllCustomers({
      search: searchTerm || undefined,
      sortBy,
      tag: filterTag || undefined
    }),
    { 
      enabled: true,
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const deleteCustomerMutation = useMutation(
    (id: string) => customerService.deleteCustomer(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('customers');
        setSelectedCustomer(null);
        setShowDetails(false);
      },
    }
  );

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowForm(true);
  };

  const handleView = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetails(true);
  };

  const handleDelete = (customer: Customer) => {
    if (window.confirm(`Are you sure you want to deactivate ${customer.name}?`)) {
      deleteCustomerMutation.mutate(customer._id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedCustomer(null);
  };

  const handleFormSave = () => {
    queryClient.invalidateQueries('customers');
    handleFormClose();
  };

  const handleDetailsClose = () => {
    setShowDetails(false);
    setSelectedCustomer(null);
  };

  if (isLoading) {
    return <div>Loading customers...</div>;
  }

  const customers = data?.data?.customers || [];
  
  // Memoize unique tags calculation
  const uniqueTags = useMemo(() => {
    return Array.from(new Set(customers.flatMap(c => c.tags || []))).sort();
  }, [customers]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-mercellus text-gray-800">Customer Management</h1>
        <button
          onClick={() => {
            setSelectedCustomer(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Customer
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={sortBy}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="createdAt">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="points">Sort by Points</option>
            <option value="spent">Sort by Total Spent</option>
          </select>
          <select
            value={filterTag}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterTag(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tags</option>
            {uniqueTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Loyalty Points
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Spent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Transactions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.map((customer) => (
              <tr key={customer._id} className={!customer.isActive ? 'opacity-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                  {customer.email && (
                    <div className="text-sm text-gray-500">{customer.email}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{customer.phone}</div>
                  {customer.alternatePhone && (
                    <div className="text-sm text-gray-500">{customer.alternatePhone}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-blue-600">{customer.loyaltyPoints}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">৳{customer.totalSpent.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{customer.totalTransactions}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {customer.tags?.map(tag => (
                      <span key={tag} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleView(customer)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(customer)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(customer)}
                      className="text-red-600 hover:text-red-900"
                      disabled={deleteCustomerMutation.isLoading}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {customers.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>No customers found. Create your first customer to get started.</p>
          </div>
        )}
      </div>

      {/* Customer Form Modal */}
      {showForm && (
        <CustomerForm
          customer={selectedCustomer}
          onSave={handleFormSave}
          onCancel={handleFormClose}
        />
      )}

      {/* Customer Details Modal */}
      {showDetails && selectedCustomer && (
        <CustomerDetails
          customer={selectedCustomer}
          onClose={handleDetailsClose}
          onEdit={() => {
            setShowDetails(false);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
};

export default Customers;

