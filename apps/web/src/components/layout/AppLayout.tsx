import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, Warehouse, Bell, Truck,
  ShoppingCart, BarChart3, Menu, X, LogOut, Tag, TrendingUp, Monitor, UserCheck,
  Wifi, WifiOff, Settings, CalendarDays,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSocketStore } from '../../store/socketStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../utils/api';
import clsx from 'clsx';

// roles: undefined = all, 'admin' = admin only, 'manager' = admin+manager
// perm: dot-path into user.permissions — shown if permission is true (overrides role check)
const allNavItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',        roles: undefined,           perm: undefined },
  { to: '/pos',        icon: Monitor,         label: 'Point of Sale',    roles: undefined,           perm: undefined },
  { to: '/products',   icon: Package,         label: 'Products',         roles: undefined,           perm: undefined },
  { to: '/inventory',  icon: Warehouse,       label: 'Inventory',        roles: undefined,           perm: undefined },
  { to: '/alerts',     icon: Bell,            label: 'Alerts',           badge: true, roles: undefined, perm: undefined },
  { to: '/suppliers',  icon: Truck,           label: 'Suppliers',        roles: undefined,           perm: undefined },
  { to: '/day',        icon: CalendarDays,    label: 'Day Sessions',     roles: 'manager' as const,  perm: 'daySessions.viewSessions' },
  { to: '/categories', icon: Tag,             label: 'Categories',       roles: 'admin' as const,    perm: undefined },
  { to: '/orders',     icon: ShoppingCart,    label: 'Purchase Orders',  roles: 'admin' as const,    perm: undefined },
  { to: '/reports',    icon: BarChart3,       label: 'Reports',          roles: 'admin' as const,    perm: undefined },
  { to: '/sales',      icon: TrendingUp,      label: 'Sales Report',     roles: 'admin' as const,    perm: undefined },
  { to: '/workers',    icon: UserCheck,       label: 'Worker Monitor',   roles: 'admin' as const,    perm: undefined },
  { to: '/settings',   icon: Settings,        label: 'Settings',         roles: 'admin' as const,    perm: undefined },
];

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { connected } = useSocketStore();
  const { settings, setSettings } = useSettingsStore();
  const navigate = useNavigate();

  const { data: alertCount } = useQuery({
    queryKey: ['alert-count'],
    queryFn: () => get<{ count: number }>('/alerts/unresolved-count'),
    refetchInterval: 30000,
  });

  // Load app-wide settings from the server once on mount
  const { data: settingsData } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => get<any>('/settings'),
    staleTime: 1000 * 60 * 5, // cache 5 min
  });

  useEffect(() => {
    if (settingsData?.data) {
      const s = settingsData.data;
      setSettings({
        storeName: s.storeName,
        storeTagline: s.storeTagline,
        storeLogo: s.storeLogo,
        storeEmail: s.storeEmail,
        storePhone: s.storePhone,
        storeAddress: s.storeAddress,
        currency: s.currency,
        currencySymbol: s.currencySymbol,
        paystackPublicKey: s.paystackPublicKey,
        hasSecretKey: s.hasSecretKey,
      });
    }
  }, [settingsData]);

  const unresolvedCount = alertCount?.data?.count ?? 0;
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const hasPermission = (permPath: string): boolean => {
    const parts = permPath.split('.');
    let val: any = user?.permissions;
    for (const part of parts) val = val?.[part];
    return !!val;
  };

  const navItems = allNavItems.filter(item => {
    if (!item.roles) return true;
    if (item.roles === 'admin') return isAdmin;
    if (item.roles === 'manager') {
      // Show if role qualifies OR if the user has the specific permission
      return isAdmin || isManager || (item.perm ? hasPermission(item.perm) : false);
    }
    return false;
  });

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo / Store name */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
            <Package size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
              {settings.storeName}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {settings.storeTagline}
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100',
                )
              }
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {badge && unresolvedCount > 0 && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {unresolvedCount > 99 ? '99+' : unresolvedCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900/50 rounded-full flex items-center justify-center text-brand-700 dark:text-brand-300 text-sm font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
            </div>
            <div className="flex items-center gap-1">
              {connected ? (
                <span title="Real-time connected"><Wifi size={12} className="text-green-500" /></span>
              ) : (
                <span title="Disconnected"><WifiOff size={12} className="text-gray-400" /></span>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="flex items-center gap-4 px-4 h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 lg:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {settings.storeName}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto dark:bg-gray-900">
          <div className="p-4 lg:p-6 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
