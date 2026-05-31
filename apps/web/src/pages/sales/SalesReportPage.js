import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Download } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from 'recharts';
import { get, api } from '../../utils/api';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/ui/index';
import clsx from 'clsx';
function MetricCard({ label, value, sub, icon: Icon, color, positive }) {
    return (<div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon size={18} className="text-white"/>
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className={`text-xs mt-1 font-medium ${positive ? 'text-green-600' : 'text-gray-400'}`}>{sub}</p>}
    </div>);
}
const fmt = (v) => `GH₵${Number(v || 0).toFixed(2)}`;
export function SalesReportPage() {
    const [period, setPeriod] = useState('week');
    const [from, setFrom] = useState(format(startOfWeek(new Date()), 'yyyy-MM-dd'));
    const [to, setTo] = useState(format(endOfWeek(new Date()), 'yyyy-MM-dd'));
    const handlePeriodChange = (p) => {
        setPeriod(p);
        const now = new Date();
        if (p === 'week') {
            setFrom(format(startOfWeek(now), 'yyyy-MM-dd'));
            setTo(format(endOfWeek(now), 'yyyy-MM-dd'));
        }
        else if (p === 'month') {
            setFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
            setTo(format(endOfMonth(now), 'yyyy-MM-dd'));
        }
    };
    const fromISO = new Date(from).toISOString();
    const toISO = new Date(to + 'T23:59:59').toISOString();
    const { data, isLoading } = useQuery({
        queryKey: ['sales-report', from, to],
        queryFn: () => get('/reports/sales', { from: fromISO, to: toISO }),
        enabled: !!from && !!to,
    });
    const report = data?.data;
    const handleExport = async () => {
        const { data: blob } = await api.get('/reports/export/csv', {
            params: { type: 'sales', from: fromISO, to: toISO },
            responseType: 'blob',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report-${from}-to-${to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };
    const dailyData = (report?.dailyBreakdown || []).map((d) => ({
        date: format(new Date(d.date), 'MMM d'),
        Revenue: Number(d.revenue),
        'Cost of Goods': Number(d.cost),
        Profit: Number(d.profit),
        'Units Sold': Number(d.unitsSold),
    }));
    return (<div className="animate-fade-in">
      <PageHeader title="Sales Report" subtitle="Revenue, cost of goods sold, and profit" actions={<button onClick={handleExport} className="btn-secondary btn-sm">
            <Download size={13}/> Export CSV
          </button>}/>

      {/* Period selector */}
      <div className="card p-4 mb-6 flex flex-wrap items-end gap-4">
        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
          {[{ key: 'week', label: 'This Week' }, { key: 'month', label: 'This Month' }, { key: 'custom', label: 'Custom' }].map(({ key, label }) => (<button key={key} onClick={() => handlePeriodChange(key)} className={clsx('px-4 py-1.5 text-sm font-medium rounded-md transition-colors', period === key ? 'bg-white shadow text-brand-700' : 'text-gray-600 hover:text-gray-900')}>
              {label}
            </button>))}
        </div>
        {period === 'custom' && (<div className="flex items-end gap-3">
            <div><label className="label">From</label><input type="date" className="input w-40" value={from} onChange={(e) => setFrom(e.target.value)}/></div>
            <div><label className="label">To</label><input type="date" className="input w-40" value={to} onChange={(e) => setTo(e.target.value)}/></div>
          </div>)}
        <p className="text-sm text-gray-500 pb-1">{format(new Date(from), 'MMM d, yyyy')} — {format(new Date(to), 'MMM d, yyyy')}</p>
      </div>

      {isLoading ? <LoadingSpinner className="h-64"/> : (<>
          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Total Revenue" value={fmt(report?.totals?.revenue)} sub="From all sales" icon={DollarSign} color="bg-brand-500" positive/>
            <MetricCard label="Cost of Goods Sold" value={fmt(report?.totals?.cost)} sub="Total cost price" icon={TrendingDown} color="bg-amber-500"/>
            <MetricCard label="Gross Profit" value={fmt(report?.totals?.profit)} sub={`Margin: ${report?.totals?.margin?.toFixed(1) ?? 0}%`} icon={TrendingUp} color="bg-green-500" positive/>
            <MetricCard label="Units Sold" value={Number(report?.totals?.unitsSold || 0).toLocaleString()} sub="Total items sold" icon={ShoppingCart} color="bg-purple-500"/>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Daily Revenue vs Profit</h3>
              {dailyData.length === 0 ? <EmptyState message="No sales in this period" icon="chart" className="h-48"/> : (<ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }}/>
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `₵${(v / 1000).toFixed(0)}k`}/>
                    <Tooltip formatter={(v) => [`GH₵${Number(v).toFixed(2)}`]} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}/>
                    <Legend wrapperStyle={{ fontSize: 12 }}/>
                    <Bar dataKey="Revenue" fill="#0ea5e9" radius={[4, 4, 0, 0]}/>
                    <Bar dataKey="Cost of Goods" fill="#f59e0b" radius={[4, 4, 0, 0]}/>
                    <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]}/>
                  </BarChart>
                </ResponsiveContainer>)}
            </div>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Daily Units Sold</h3>
              {dailyData.length === 0 ? <EmptyState message="No sales in this period" icon="chart" className="h-48"/> : (<ResponsiveContainer width="100%" height={240}>
                  <LineChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }}/>
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }}/>
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}/>
                    <Line type="monotone" dataKey="Units Sold" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }}/>
                  </LineChart>
                </ResponsiveContainer>)}
            </div>
          </div>

          {/* Top products */}
          <div className="card overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Top Products by Revenue</h3>
            </div>
            {(report?.topProducts || []).length === 0 ? (<EmptyState message="No sales in this period" icon="product" className="h-48"/>) : (<table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['#', 'Product', 'Units Sold', 'Revenue', 'Cost', 'Profit', 'Margin'].map((h, i) => (<th key={h} className={`py-3 px-5 font-medium text-gray-500 text-xs uppercase ${i >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.topProducts.map((p, i) => {
                    const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0';
                    return (<tr key={p.productId} className="hover:bg-gray-50">
                        <td className="py-3 px-5 text-gray-400 text-xs">{i + 1}</td>
                        <td className="py-3 px-5"><p className="font-medium text-gray-900">{p.name}</p><p className="text-xs text-gray-400 font-mono">{p.sku}</p></td>
                        <td className="py-3 px-5 text-right font-mono">{p.unitsSold}</td>
                        <td className="py-3 px-5 text-right font-medium text-brand-700">{fmt(p.revenue)}</td>
                        <td className="py-3 px-5 text-right text-amber-600">{fmt(p.cost)}</td>
                        <td className="py-3 px-5 text-right text-green-600 font-semibold">{fmt(p.profit)}</td>
                        <td className="py-3 px-5 text-right">
                          <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', Number(margin) >= 20 ? 'bg-green-100 text-green-700' : Number(margin) >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                            {margin}%
                          </span>
                        </td>
                      </tr>);
                })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                    <td colSpan={2} className="py-3 px-5 text-gray-700">Total</td>
                    <td className="py-3 px-5 text-right font-mono">{report?.totals?.unitsSold || 0}</td>
                    <td className="py-3 px-5 text-right text-brand-700">{fmt(report?.totals?.revenue)}</td>
                    <td className="py-3 px-5 text-right text-amber-600">{fmt(report?.totals?.cost)}</td>
                    <td className="py-3 px-5 text-right text-green-600">{fmt(report?.totals?.profit)}</td>
                    <td className="py-3 px-5 text-right text-sm text-gray-600">{report?.totals?.margin?.toFixed(1) ?? 0}%</td>
                  </tr>
                </tfoot>
              </table>)}
          </div>

          {/* All transactions */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">All Transactions <span className="text-xs text-gray-400 font-normal">(sales and restocks)</span></h3>
            </div>
            {(report?.transactions || []).length === 0 ? (<EmptyState message="No transactions in this period" icon="chart" className="h-48"/>) : (<div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Date', 'Product', 'Type', 'Qty', 'Unit Price', 'Total Value', 'By'].map((h, i) => (<th key={h} className={`py-3 px-5 font-medium text-gray-500 text-xs uppercase ${[3, 4, 5].includes(i) ? 'text-right' : i === 2 ? 'text-center' : 'text-left'}`}>{h}</th>))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.transactions.map((t) => {
                    const isSale = t.type === 'sale';
                    const price = isSale ? Number(t.product?.price) : Number(t.product?.costPrice);
                    const total = t.quantity * price;
                    return (<tr key={t.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-5 text-xs text-gray-500">{format(new Date(t.createdAt), 'MMM d, yyyy HH:mm')}</td>
                          <td className="py-2.5 px-5"><p className="font-medium text-gray-900">{t.product?.name}</p><p className="text-xs text-gray-400 font-mono">{t.product?.sku}</p></td>
                          <td className="py-2.5 px-5 text-center">
                            <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', isSale ? 'bg-amber-100 text-amber-700' : t.type === 'restock' ? 'bg-green-100 text-green-700' : t.type === 'return' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700')}>
                              {t.type}
                            </span>
                          </td>
                          <td className={`py-2.5 px-5 text-right font-mono ${isSale ? 'text-amber-600' : 'text-green-600'}`}>{isSale ? '-' : '+'}{t.quantity}</td>
                          <td className="py-2.5 px-5 text-right text-gray-600">{fmt(price)}</td>
                          <td className={`py-2.5 px-5 text-right font-medium ${isSale ? 'text-brand-700' : 'text-green-600'}`}>{fmt(total)}</td>
                          <td className="py-2.5 px-5 text-gray-500 text-xs">{t.performer?.name}</td>
                        </tr>);
                })}
                  </tbody>
                </table>
              </div>)}
          </div>
        </>)}
    </div>);
}
//# sourceMappingURL=SalesReportPage.js.map