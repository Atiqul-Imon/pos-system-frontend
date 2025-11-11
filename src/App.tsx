import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import Layout from './components/Layout';
import OfflineIndicator from './components/OfflineIndicator';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import Stores from './pages/stores/Stores';
import Products from './pages/products/Products';
import Inventory from './pages/inventory/Inventory';
import POS from './pages/pos/POS';
import Transactions from './pages/transactions/Transactions';
import Reports from './pages/reports/Reports';
import Customers from './pages/customers/Customers';
import { ReactNode } from 'react';

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { user, token } = useAuthStore();
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="stores" element={<Stores />} />
          <Route path="products" element={<Products />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="pos" element={<POS />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="reports" element={<Reports />} />
          <Route path="customers" element={<Customers />} />
        </Route>
      </Routes>
      <OfflineIndicator />
    </>
  );
}

export default App;

