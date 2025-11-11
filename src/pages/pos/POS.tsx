import { useState, ChangeEvent, useEffect, useRef, KeyboardEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api.js';
import { useAuthStore } from '../../store/authStore.js';
import { customerService } from '../../services/customerService.js';
import { loyaltyService } from '../../services/loyaltyService.js';
import type { Product, Inventory as InventoryType, Transaction, Customer } from '../../types/index.js';
import Receipt from './Receipt.js';

interface CartItem {
  product: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
}

interface ProductsResponse {
  success: boolean;
  data: {
    products: Product[];
  };
}

interface InventoryResponse {
  success: boolean;
  data: {
    inventory: Array<InventoryType & {
      product: {
        _id: string;
        name: string;
        sku: string;
      };
      quantity: number;
    }>;
  };
}

interface TransactionItem {
  product: string;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  subtotal: number;
}

interface SaleTransactionData {
  store: string;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile_payment';
  paymentDetails: {
    cashAmount: number;
    cardAmount: number;
    mobileAmount: number;
    change: number;
  };
  customer?: string;
  loyaltyPointsRedeemed?: number;
}

type SortOption = 'name' | 'price-asc' | 'price-desc' | 'stock';

const POS = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [showInStockOnly, setShowInStockOnly] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_payment'>('cash');
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const productsGridRef = useRef<HTMLDivElement>(null);
  const barcodeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);

  // Extract store ID - handle both object (populated) and string/ObjectId
  const getStoreId = (store: any): string | null => {
    if (!store) return null;
    if (typeof store === 'string') return store;
    if (typeof store === 'object' && store !== null) {
      return store._id || store.id || String(store);
    }
    return String(store);
  };

  const storeId = user?.store ? getStoreId(user.store) : null;

  // Fetch customers for search (debounced)
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchTerm]);

  const { data: customersData } = useQuery(
    ['customers-search', debouncedCustomerSearch],
    () => customerService.searchCustomers(debouncedCustomerSearch, undefined, 10),
    { enabled: debouncedCustomerSearch.length >= 2 }
  );

  // Fetch loyalty settings
  const { data: loyaltySettings } = useQuery(
    'loyalty-settings',
    () => loyaltyService.getLoyaltySettings()
  );

  // Cleanup barcode timer on unmount
  useEffect(() => {
    return () => {
      if (barcodeTimerRef.current) {
        clearTimeout(barcodeTimerRef.current);
      }
    };
  }, []);

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Fetch products with search and filters
  const { data: products } = useQuery<ProductsResponse>(
    ['products', storeId, debouncedSearchTerm, selectedCategory, selectedBrand],
    async () => {
      const params: Record<string, string | boolean> = { isActive: true };
      if (storeId) params.store = storeId;
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedBrand) params.brand = selectedBrand;
      const response = await api.get<ProductsResponse>('/products', { params });
      return response.data;
    },
    { enabled: !!storeId }
  );

  // Fetch inventory
  const { data: inventory } = useQuery<InventoryResponse>(
    ['inventory', storeId],
    async () => {
      if (!storeId) throw new Error('No store ID');
      const response = await api.get<InventoryResponse>(`/inventory/store/${storeId}`);
      return response.data;
    },
    { enabled: !!storeId }
  );

  // Get unique categories and brands for filters
  const categories = Array.from(
    new Set(products?.data?.products?.map(p => p.category).filter(Boolean) || [])
  ).sort();

  const brands = Array.from(
    new Set(products?.data?.products?.map(p => p.brand).filter(Boolean) || [])
  ).sort();

  const createSaleMutation = useMutation(
    async (transactionData: SaleTransactionData) => {
      const response = await api.post<{ 
        success: boolean; 
        data: { 
          transaction: Transaction;
          loyaltyPoints?: {
            earned: number;
            redeemed: number;
            newBalance?: number;
          };
        } 
      }>('/transactions/sale', transactionData);
      return response.data;
    },
    {
      onSuccess: (data) => {
        // Store the completed transaction
        if (data.data?.transaction) {
          // Update transaction with loyalty points info from response
          const transaction = data.data.transaction;
          if (data.data.loyaltyPoints) {
            transaction.loyaltyPointsEarned = data.data.loyaltyPoints.earned;
            transaction.loyaltyPointsRedeemed = data.data.loyaltyPoints.redeemed;
            // Update customer points if available
            if (selectedCustomer && data.data.loyaltyPoints.newBalance !== undefined) {
              selectedCustomer.loyaltyPoints = data.data.loyaltyPoints.newBalance;
            }
          }
          setCompletedTransaction(transaction);
          setShowReceipt(true);
        }
        // Clear cart and search
        setCart([]);
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setLoyaltyPointsToRedeem(0);
        // Keep customer selected for next transaction (optional - can clear if needed)
        // setSelectedCustomer(null);
        queryClient.invalidateQueries('inventory');
        queryClient.invalidateQueries('sales-report');
        queryClient.invalidateQueries(['customers-search']);
        if (selectedCustomer) {
          queryClient.invalidateQueries(['customer', selectedCustomer._id]);
        }
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || 'Failed to complete sale';
        console.error('Sale error details:', {
          message: errorMessage,
          status: error.response?.status,
          data: error.response?.data,
          storeId: storeId,
          userStore: user?.store,
          userRole: user?.role
        });
        alert(`Error: ${errorMessage}`);
      }
    }
  );

  // Filter and sort products
  const filteredProducts = products?.data?.products
    ?.filter((product) => {
      const inventoryItem = inventory?.data?.inventory?.find(
        (item) => {
          const productId = typeof item.product === 'object' ? item.product._id : item.product;
          return productId === product._id;
        }
      );

      // Filter by stock availability
      if (showInStockOnly && (!inventoryItem || inventoryItem.quantity === 0)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const inventoryA = inventory?.data?.inventory?.find(
        (item) => {
          const productId = typeof item.product === 'object' ? item.product._id : item.product;
          return productId === a._id;
        }
      );
      const inventoryB = inventory?.data?.inventory?.find(
        (item) => {
          const productId = typeof item.product === 'object' ? item.product._id : item.product;
          return productId === b._id;
        }
      );

      switch (sortOption) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'stock':
          return (inventoryB?.quantity || 0) - (inventoryA?.quantity || 0);
        default:
          return 0;
      }
    }) || [];

  // Handle barcode scanning and search input
  const handleBarcodeInput = (value: string) => {
    setSearchTerm(value);
    
    // Clear existing timer
    if (barcodeTimerRef.current) {
      clearTimeout(barcodeTimerRef.current);
    }

    // Set timer for debounced search
    barcodeTimerRef.current = setTimeout(() => {
      setDebouncedSearchTerm(value);
      
      // After debounce, check if this looks like a barcode (exact match)
      // Barcode scanners typically send the full barcode quickly
      if (value.length >= 3 && products?.data?.products) {
        // Try to find product by exact barcode or SKU match
        const product = products.data.products.find(
          (p) => p.barcode?.toLowerCase() === value.toLowerCase() || 
                 p.sku?.toLowerCase() === value.toLowerCase()
        );

        if (product && inventory?.data?.inventory) {
          const inventoryItem = inventory.data.inventory.find(
            (item) => {
              const productId = typeof item.product === 'object' ? item.product._id : item.product;
              return productId === product._id && item.quantity > 0;
            }
          );

          if (inventoryItem) {
            // Small delay to allow user to see the match, then add to cart
            setTimeout(() => {
              addToCart(product);
              setSearchTerm('');
              setDebouncedSearchTerm('');
              if (searchInputRef.current) {
                searchInputRef.current.focus();
              }
            }, 100);
          }
        }
      }
    }, 300);
  };

  const addToCart = (product: Product) => {
    const inventoryItem = inventory?.data?.inventory?.find(
      (item) => {
        const productId = typeof item.product === 'object' ? item.product._id : item.product;
        return productId === product._id;
      }
    );

    if (!inventoryItem || inventoryItem.quantity === 0) {
      alert('Product out of stock');
      return;
    }

    const existingItem = cart.find((item) => item.product === product._id);
    if (existingItem) {
      if (existingItem.quantity >= inventoryItem.quantity) {
        alert('Insufficient stock');
        return;
      }
      setCart(
        cart.map((item) =>
          item.product === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
          sku: product.sku,
        },
      ]);
    }

    // Clear search after adding to cart
    setSearchTerm('');
    setDebouncedSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const cartItem = cart.find((item) => item.product === productId);
    if (cartItem) {
      const inventoryItem = inventory?.data?.inventory?.find(
        (item) => {
          const productIdFromInv = typeof item.product === 'object' ? item.product._id : item.product;
          return productIdFromInv === productId;
        }
      );

      if (inventoryItem && quantity > inventoryItem.quantity) {
        alert('Insufficient stock');
        return;
      }
    }

    setCart(
      cart.map((item) =>
        item.product === productId ? { ...item, quantity } : item
      )
    );
  };

  const calculateTotal = (): number => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (!storeId) {
      alert('No store assigned. Please contact administrator.');
      return;
    }

    // StoreId is already extracted as string by getStoreId function
    const storeIdString = storeId;

    const items: TransactionItem[] = cart.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      price: item.price,
      discount: 0,
      tax: 0,
      subtotal: item.price * item.quantity,
    }));

    let subtotal = calculateTotal();
    let discount = 0;
    
    // Calculate points discount if applicable
    // Business rule: 100 points = 10 BDT discount, minimum 500 BDT purchase required
    if (selectedCustomer && loyaltyPointsToRedeem > 0) {
      // Check minimum purchase requirement (500 BDT)
      if (subtotal < 500) {
        alert('Minimum purchase of 500 BDT is required to redeem loyalty points');
        return;
      }

      // 100 points = 10 BDT discount (1 point = 0.1 BDT)
      // Calculate: (points / 100) * 10
      discount = Math.min((loyaltyPointsToRedeem / 100) * 10, subtotal);
    }
    
    const total = Math.max(0, subtotal - discount);

    const transactionData: SaleTransactionData = {
      store: storeIdString,
      items,
      subtotal,
      discount,
      total,
      paymentMethod,
      paymentDetails: {
        cashAmount: paymentMethod === 'cash' ? total : 0,
        cardAmount: paymentMethod === 'card' ? total : 0,
        mobileAmount: paymentMethod === 'mobile_payment' ? total : 0,
        change: 0,
      },
      customer: selectedCustomer?._id,
      loyaltyPointsRedeemed: loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem : undefined,
    };

    createSaleMutation.mutate(transactionData);
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSearchTerm('');
      setDebouncedSearchTerm('');
      setSelectedCategory('');
      setSelectedBrand('');
    } else if (e.key === 'Enter' && filteredProducts.length > 0 && selectedProductIndex >= 0) {
      const product = filteredProducts[selectedProductIndex];
      if (product) {
        addToCart(product);
        setSelectedProductIndex(-1);
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (e.key === 'ArrowDown') {
        setSelectedProductIndex((prev) => 
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
      } else {
        setSelectedProductIndex((prev) => (prev > 0 ? prev - 1 : -1));
      }
    }
  };

  // Highlight search term in text
  const highlightText = (text: string, search: string) => {
    if (!search) return text;
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200">{part}</mark>
      ) : (
        part
      )
    );
  };

  if (!storeId) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-center">
        <p className="text-gray-600">No store assigned. Please contact administrator.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Search and List */}
      <div className="lg:col-span-2">
        {/* Enhanced Search Bar */}
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name, SKU, or scan barcode... (Press Esc to clear)"
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleBarcodeInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDebouncedSearchTerm('');
                    if (searchInputRef.current) {
                      searchInputRef.current.focus();
                    }
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  setSelectedCategory(e.target.value);
                  setSearchTerm('');
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Brand:</label>
              <select
                value={selectedBrand}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  setSelectedBrand(e.target.value);
                  setSearchTerm('');
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Brands</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inStockOnly"
                checked={showInStockOnly}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setShowInStockOnly(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="inStockOnly" className="text-sm text-gray-700">
                In Stock Only
              </label>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <label className="text-sm font-medium text-gray-700">Sort:</label>
              <select
                value={sortOption}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setSortOption(e.target.value as SortOption)
                }
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="name">Name</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="stock">Stock: High to Low</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          {filteredProducts.length > 0 && (
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredProducts.length} product(s)
            </div>
          )}
        </div>

        {/* Products Grid */}
        <div ref={productsGridRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product, index) => {
            const inventoryItem = inventory?.data?.inventory?.find(
              (item) => {
                const productId = typeof item.product === 'object' ? item.product._id : item.product;
                return productId === product._id;
              }
            );
            const isSelected = index === selectedProductIndex;
            const isLowStock = (inventoryItem?.quantity || 0) <= (inventoryItem?.reorderPoint || 0);
            const isOutOfStock = (inventoryItem?.quantity || 0) === 0;

            return (
              <div
                key={product._id}
                className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-blue-500 transform scale-105'
                    : 'hover:shadow-lg'
                } ${isOutOfStock ? 'opacity-50' : ''}`}
                onClick={() => !isOutOfStock && addToCart(product)}
                onMouseEnter={() => setSelectedProductIndex(index)}
              >
                {product.image && (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                )}
                <h3 className="font-semibold mb-1 text-sm line-clamp-2">
                  {highlightText(product.name, debouncedSearchTerm)}
                </h3>
                <p className="text-xs text-gray-600 mb-1">
                  SKU: {highlightText(product.sku, debouncedSearchTerm)}
                </p>
                {product.barcode && (
                  <p className="text-xs text-gray-500 mb-1">Barcode: {product.barcode}</p>
                )}
                <p className="text-lg font-bold text-blue-600">৳{product.price.toLocaleString()}</p>
                <div className="flex items-center justify-between mt-2">
                  <p
                    className={`text-xs font-medium ${
                      isOutOfStock
                        ? 'text-red-600'
                        : isLowStock
                        ? 'text-orange-600'
                        : 'text-green-600'
                    }`}
                  >
                    Stock: {inventoryItem?.quantity || 0}
                  </p>
                  {isOutOfStock && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      Out of Stock
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-600">
              {searchTerm || selectedCategory || selectedBrand
                ? 'No products found matching your search'
                : 'No products available'}
            </p>
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="lg:col-span-1">
        {/* Customer Selection */}
        <div className="bg-white p-4 rounded-lg shadow mb-4 sticky top-4 z-10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Customer</h3>
            {selectedCustomer && (
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setLoyaltyPointsToRedeem(0);
                }}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Clear
              </button>
            )}
          </div>
          {selectedCustomer ? (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{selectedCustomer.name}</p>
                  <p className="text-xs text-gray-600">{selectedCustomer.phone}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Points: {selectedCustomer.loyaltyPoints}
                  </p>
                </div>
              </div>
              {selectedCustomer.loyaltyPoints > 0 && (
                <div className="mt-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Redeem Points (100 points = 10 BDT)
                    {calculateTotal() < 500 && (
                      <span className="block text-red-600 text-xs mt-1">
                        Minimum 500 BDT purchase required
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedCustomer.loyaltyPoints}
                    step="100"
                    value={loyaltyPointsToRedeem}
                    onChange={(e) => {
                      const points = Math.min(Number(e.target.value), selectedCustomer!.loyaltyPoints);
                      setLoyaltyPointsToRedeem(points);
                    }}
                    disabled={calculateTotal() < 500}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="0"
                  />
                  {loyaltyPointsToRedeem > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Discount: ৳{((loyaltyPointsToRedeem / 100) * 10).toFixed(2)} ({loyaltyPointsToRedeem} points)
                    </p>
                  )}
                  {calculateTotal() < 500 && calculateTotal() > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      Add ৳{(500 - calculateTotal()).toFixed(2)} more to redeem points
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <input
                ref={customerSearchRef}
                type="text"
                placeholder="Search customer by name or phone..."
                value={customerSearchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setCustomerSearchTerm(e.target.value);
                  setShowCustomerSearch(true);
                }}
                onFocus={() => setShowCustomerSearch(true)}
                onBlur={() => {
                  // Delay to allow click on dropdown
                  setTimeout(() => setShowCustomerSearch(false), 200);
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {showCustomerSearch && customerSearchTerm.length >= 2 && customersData?.data?.customers && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {customersData.data.customers.length > 0 ? (
                    customersData.data.customers.map((customer) => (
                      <button
                        key={customer._id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedCustomer(customer);
                          setCustomerSearchTerm('');
                          setShowCustomerSearch(false);
                          // Refresh customer data to get latest points
                          queryClient.invalidateQueries(['customer', customer._id]);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-200"
                      >
                        <p className="font-medium text-sm">{customer.name}</p>
                        <p className="text-xs text-gray-600">{customer.phone}</p>
                        <p className="text-xs text-blue-600">Points: {customer.loyaltyPoints}</p>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      No customers found.{' '}
                      <a
                        href="/customers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Add Customer
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow sticky top-24">
          <h2 className="text-2xl font-mercellus mb-4">Cart ({cart.length})</h2>

          <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
            {cart.map((item) => {
              const inventoryItem = inventory?.data?.inventory?.find(
                (invItem) => {
                  const productId = typeof invItem.product === 'object' ? invItem.product._id : invItem.product;
                  return productId === item.product;
                }
              );
              const maxQuantity = inventoryItem?.quantity || 0;

              return (
                <div key={item.product} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-600">৳{item.price.toLocaleString()} x {item.quantity}</p>
                    <p className="text-xs text-gray-500">Subtotal: ৳{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity(item.product, item.quantity - 1);
                      }}
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const qty = parseInt(e.target.value) || 0;
                        updateQuantity(item.product, qty);
                      }}
                      min="1"
                      max={maxQuantity}
                      className="w-12 text-center border border-gray-300 rounded px-1 py-1 text-sm"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity(item.product, item.quantity + 1);
                      }}
                      disabled={item.quantity >= maxQuantity}
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCart(item.product);
                      }}
                      className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {cart.length === 0 && (
            <p className="text-gray-500 text-center py-8">Cart is empty</p>
          )}

          <div className="border-t pt-4 mt-4">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="font-medium">Subtotal:</span>
                <span className="font-medium">৳{calculateTotal().toLocaleString()}</span>
              </div>
              {selectedCustomer && loyaltyPointsToRedeem > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Points Discount ({loyaltyPointsToRedeem} pts):</span>
                  <span>-৳{((loyaltyPointsToRedeem / 100) * 10).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span className="text-2xl text-blue-600">
                  ৳{Math.max(0, calculateTotal() - ((loyaltyPointsToRedeem / 100) * 10 || 0)).toLocaleString()}
                </span>
              </div>
              {selectedCustomer && loyaltySettings?.data?.settings && (
                <div className="pt-2 border-t text-xs text-gray-500">
                  <p>
                    Points to earn: {Math.floor((Math.max(0, calculateTotal() - ((loyaltyPointsToRedeem / 100) * 10 || 0)) / 500) * 100)} (100 points per 500 BDT)
                  </p>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setPaymentMethod(e.target.value as 'cash' | 'card' | 'mobile_payment')
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile_payment">Mobile Payment</option>
              </select>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || createSaleMutation.isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
            >
              {createSaleMutation.isLoading ? 'Processing...' : 'Checkout'}
            </button>

            {/* Keyboard Shortcuts Help */}
            <div className="mt-4 pt-4 border-t text-xs text-gray-500">
              <p className="font-semibold mb-1">Keyboard Shortcuts:</p>
              <ul className="space-y-1">
                <li>• Type to search</li>
                <li>• Enter: Add selected product</li>
                <li>• Esc: Clear search</li>
                <li>• ↑↓: Navigate products</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && completedTransaction && (
        <Receipt
          transaction={completedTransaction}
          storeName={typeof user?.store === 'object' ? user.store.name : undefined}
          storeCode={typeof user?.store === 'object' ? user.store.code : undefined}
          onClose={() => {
            setShowReceipt(false);
            setCompletedTransaction(null);
          }}
          onPrint={() => {
            window.print();
          }}
        />
      )}
    </div>
  );
};

export default POS;
