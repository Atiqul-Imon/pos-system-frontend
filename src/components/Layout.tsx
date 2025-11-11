import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

interface MenuItem {
  path: string;
  label: string;
  icon: string;
  roles?: string[];
}

const Layout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string): boolean => location.pathname === path;

  const menuItems: MenuItem[] = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/stores', label: 'Stores', icon: '🏪', roles: ['admin', 'manager'] },
    { path: '/products', label: 'Products', icon: '📦' },
    { path: '/inventory', label: 'Inventory', icon: '📋' },
    { path: '/pos', label: 'POS', icon: '💰' },
    { path: '/customers', label: 'Customers', icon: '👥' },
    { path: '/transactions', label: 'Transactions', icon: '🧾' },
    { path: '/reports', label: 'Reports', icon: '📈', roles: ['admin', 'manager'] },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || '');
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-2xl font-mercellus">POS system</h1>
            <p className="text-sm text-gray-400 mt-1">Inventory Management</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {filteredMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold">{user?.name}</p>
                <p className="text-sm text-gray-400">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

