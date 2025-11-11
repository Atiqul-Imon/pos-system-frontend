import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, ReactNode } from 'react';
import { useAuthStore } from './store/authStore.js';
import Layout from './components/Layout';
import OfflineIndicator from './components/OfflineIndicator';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Lazy load components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Stores = lazy(() => import('./pages/stores/Stores'));
const Products = lazy(() => import('./pages/products/Products'));
const Inventory = lazy(() => import('./pages/inventory/Inventory'));
const POS = lazy(() => import('./pages/pos/POS'));
const Transactions = lazy(() => import('./pages/transactions/Transactions'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const Customers = lazy(() => import('./pages/customers/Customers'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

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
          <Route 
            index 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Dashboard />
              </Suspense>
            } 
          />
          <Route 
            path="stores" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Stores />
              </Suspense>
            } 
          />
          <Route 
            path="products" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Products />
              </Suspense>
            } 
          />
          <Route 
            path="inventory" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Inventory />
              </Suspense>
            } 
          />
          <Route 
            path="pos" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <POS />
              </Suspense>
            } 
          />
          <Route 
            path="transactions" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Transactions />
              </Suspense>
            } 
          />
          <Route 
            path="reports" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Reports />
              </Suspense>
            } 
          />
          <Route 
            path="customers" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <Customers />
              </Suspense>
            } 
          />
        </Route>
      </Routes>
      <OfflineIndicator />
    </>
  );
}

export default App;

