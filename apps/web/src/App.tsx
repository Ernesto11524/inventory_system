import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSocketStore } from './store/socketStore';

import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { ProductDetailPage } from './pages/products/ProductDetailPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { AlertsPage } from './pages/alerts/AlertsPage';
import { SuppliersPage } from './pages/suppliers/SuppliersPage';
import { PurchaseOrdersPage } from './pages/orders/PurchaseOrdersPage';
import { PurchaseOrderDetailPage } from './pages/orders/PurchaseOrderDetailPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { SalesReportPage } from './pages/sales/SalesReportPage';
import { POSPage } from './pages/pos/POSPage';
import { WorkerMonitorPage } from './pages/admin/WorkerMonitorPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { DaySessionsPage } from './pages/day/DaySessionsPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
    // Don't disconnect on cleanup — only disconnect when logging out
  }, [isAuthenticated]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="orders" element={<PurchaseOrdersPage />} />
        <Route path="orders/:id" element={<PurchaseOrderDetailPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="sales" element={<SalesReportPage />} />
        <Route path="pos" element={<POSPage />} />
        <Route path="day" element={<DaySessionsPage />} />
        <Route path="workers" element={<WorkerMonitorPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
