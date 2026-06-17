import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSocketStore } from './store/socketStore';
import { get } from './utils/api';

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
import { WorkerSalesPage } from './pages/admin/WorkerSalesPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { DaySessionsPage } from './pages/day/DaySessionsPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, setUser } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
    // Don't disconnect on cleanup — only disconnect when logging out
  }, [isAuthenticated]);

  // Sync latest permissions from DB on load and when switching back to the tab.
  // Permissions are stored in the JWT at login time; this keeps them up to date
  // without requiring a re-login when an admin changes them.
  useEffect(() => {
    if (!isAuthenticated) return;

    const syncUser = () => {
      get<any>('/auth/me')
        .then((res) => { if (res.data) setUser(res.data); })
        .catch(() => {});
    };

    syncUser();

    const onVisible = () => { if (document.visibilityState === 'visible') syncUser(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isAuthenticated]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        <Route path="workers/:userId/sales" element={<WorkerSalesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
