import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  Package, TrendingDown, AlertTriangle, DollarSign, Tag,
  ArrowUpRight, ArrowDownRight, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { get } from '../../utils/api';
import { useSocketStore } from '../../store/socketStore';
import { useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS } from '@inventory/shared';
import type { DashboardMetrics } from '@inventory/shared';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

const PIE_COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function MetricCard({
  label, value, icon: Icon, color, subtext, delta,
}: {
  label: string; value: string; icon: any; color: string; subtext?: string; delta?: number;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
      </div>
      {delta !== undefined && (
        <div className={`flex items-center gap-0.5 text-xs font-medium ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(delta)}%
        </div>
      )}
    </div>
  );
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'GHS', maximumFractionDigits: 0 }).format(v);
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { socket } = useSocketStore();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => get<DashboardMetrics>('/inventory/summary'),
  });

  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: () => get<any>('/reports/dashboard'),
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => get<any[]>('/stock/recent'),
    refetchInterval: 30000,
  });

  // Real-time stock update invalidation
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
    };
    socket.on(SOCKET_EVENTS.STOCK_UPDATED, handler);
    return () => { socket.off(SOCKET_EVENTS.STOCK_UPDATED, handler); };
  }, [socket, queryClient]);

  const m = metrics?.data;
  const d = dashData?.data;
  const activity = recentActivity?.data || [];

  if (metricsLoading || dashLoading) return <LoadingSpinner className="h-96" />;

  const movementData = (d?.movementByDay || []).map((row: any) => ({
    date: format(new Date(row.date), 'MMM d'),
    Inbound: Number(row.inbound),
    Outbound: Number(row.outbound),
    Net: Number(row.inbound) - Number(row.outbound),
  }));

  const topProducts = (d?.topByValue || []).map((p: any) => ({
    name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name,
    value: Number(p.stockValue),
  }));

  const categoryData = (d?.categoryBreakdown || []).map((c: any) => ({
    name: c.category,
    value: Number(c.value),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time inventory overview</p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })}
          className="btn-secondary btn-sm gap-1.5"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard
          label="Total Products"
          value={m?.totalProducts?.toLocaleString() ?? '—'}
          icon={Package}
          color="bg-brand-500"
          subtext="Active SKUs"
        />
        <MetricCard
          label="Stock Value"
          value={m ? formatCurrency(m.totalStockValue) : '—'}
          icon={DollarSign}
          color="bg-emerald-500"
          subtext="At cost price"
        />
        <MetricCard
          label="Retail Value"
          value={m ? formatCurrency(m.totalRetailValue) : '—'}
          icon={Tag}
          color="bg-indigo-500"
          subtext="At selling price"
        />
        <MetricCard
          label="Low Stock"
          value={m?.lowStockCount?.toString() ?? '—'}
          icon={TrendingDown}
          color="bg-amber-500"
          subtext="Below minimum"
        />
        <MetricCard
          label="Out of Stock"
          value={m?.outOfStockCount?.toString() ?? '—'}
          icon={AlertTriangle}
          color="bg-red-500"
          subtext="Zero inventory"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* 30-day movement line chart */}
        <div className="card p-5 xl:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">30-Day Stock Movement</h3>
          {movementData.length === 0 ? (
            <EmptyState message="No movement data yet" icon="chart" className="h-48" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={movementData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Inbound" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Outbound" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Net" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category pie chart */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">By Category</h3>
          {categoryData.length === 0 ? (
            <EmptyState message="No categories yet" icon="chart" className="h-48" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => formatCurrency(Number(v))}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Legend
                  formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Top 10 products bar chart */}
        <div className="card p-5 xl:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top 10 Products by Value</h3>
          {topProducts.length === 0 ? (
            <EmptyState message="No products yet" icon="chart" className="h-48" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topProducts} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(v) => `GH₵${(v / 1000).toFixed(0)}k`}
                />
                <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip
                  formatter={(v: any) => [formatCurrency(Number(v)), 'Stock Value']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent activity */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {activity.length === 0 ? (
            <EmptyState message="No activity yet" icon="activity" className="h-48" />
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-56">
              {activity.slice(0, 10).map((entry: any) => (
                <div key={entry.id} className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    entry.type === 'restock' || entry.type === 'return' ? 'bg-green-400' :
                    entry.type === 'sale' ? 'bg-amber-400' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-900 font-medium truncate">{entry.product?.name}</p>
                    <p className="text-xs text-gray-500">
                      {entry.type === 'sale' ? '-' : '+'}{entry.quantity} {entry.type} · {entry.performer?.name}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {format(new Date(entry.createdAt), 'HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
