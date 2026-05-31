import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, BarChart3, TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { get } from '../../utils/api';
import { api } from '../../utils/api';
import { PageHeader, LoadingSpinner, EmptyState, StockTypeBadge, Pagination } from '../../components/ui/index';
import clsx from 'clsx';
export function ReportsPage() {
    const [tab, setTab] = useState('stock-value');
    const [page, setPage] = useState(1);
    const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
    const { data: stockValueData, isLoading: svLoading } = useQuery({
        queryKey: ['report-stock-value'],
        queryFn: () => get('/reports/stock-value'),
        enabled: tab === 'stock-value',
    });
    const { data: movementData, isLoading: mvLoading } = useQuery({
        queryKey: ['report-movement', page, from, to],
        queryFn: () => get('/reports/movement', {
            page, limit: 20,
            from: from ? new Date(from).toISOString() : undefined,
            to: to ? new Date(to + 'T23:59:59').toISOString() : undefined,
        }),
        enabled: tab === 'movement',
    });
    const handleExport = async (type) => {
        const params = new URLSearchParams({ type });
        if (type === 'movement') {
            if (from)
                params.set('from', new Date(from).toISOString());
            if (to)
                params.set('to', new Date(to + 'T23:59:59').toISOString());
        }
        const url = `/api/reports/export/csv?${params}`;
        const { data } = await api.get(url, { responseType: 'blob' });
        const blobUrl = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${type}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        URL.revokeObjectURL(blobUrl);
    };
    const svReport = stockValueData?.data;
    const movements = movementData?.data || [];
    const mvPagination = movementData?.pagination;
    return (<div className="animate-fade-in">
      <PageHeader title="Reports" subtitle="Export and analyze inventory data" actions={<button onClick={() => handleExport(tab === 'stock-value' ? 'inventory' : 'movement')} className="btn-secondary btn-sm">
            <Download size={13}/> Export CSV
          </button>}/>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('stock-value')} className={clsx('btn btn-sm gap-1.5', tab === 'stock-value' ? 'btn-primary' : 'btn-secondary')}>
          <BarChart3 size={13}/> Stock Value
        </button>
        <button onClick={() => setTab('movement')} className={clsx('btn btn-sm gap-1.5', tab === 'movement' ? 'btn-primary' : 'btn-secondary')}>
          <TrendingUp size={13}/> Stock Movement
        </button>
      </div>

      {tab === 'stock-value' && (<>
          {svLoading ? <LoadingSpinner className="h-64"/> : (<>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                    { label: 'Total Cost Value', value: `GH₵${Number(svReport?.totals?.totalCostValue ?? 0).toFixed(2)}` },
                    { label: 'Total Retail Value', value: `GH₵${Number(svReport?.totals?.totalRetailValue ?? 0).toFixed(2)}` },
                    { label: 'Total Items', value: Number(svReport?.totals?.totalItems ?? 0).toLocaleString() },
                ].map(({ label, value }) => (<div key={label} className="card p-4">
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-xl font-bold text-gray-900">{value}</p>
                  </div>))}
              </div>

              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Product</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Category</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Stock</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Cost Price</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Retail Price</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Stock Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(svReport?.products || []).map((p) => (<tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-4">
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-gray-500">{p.categoryName || '—'}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{p.currentStock}</td>
                        <td className="py-2.5 px-4 text-right">GH₵{Number(p.costPrice).toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right">GH₵{Number(p.price).toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-brand-700">GH₵{Number(p.stockValue).toFixed(2)}</td>
                      </tr>))}
                  </tbody>
                </table>
              </div>
            </>)}
        </>)}

      {tab === 'movement' && (<>
          {/* Date filters */}
          <div className="card p-4 mb-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="label">From</label>
              <input type="date" className="input w-44" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}/>
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" className="input w-44" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}/>
            </div>
            <p className="text-sm text-gray-500 pb-2">
              {mvPagination ? `${mvPagination.total} entries found` : ''}
            </p>
          </div>

          {mvLoading ? <LoadingSpinner className="h-64"/> : (<div className="card overflow-hidden">
              {movements.length === 0 ? (<EmptyState message="No stock movements in this date range" icon="chart" className="h-64"/>) : (<>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Product</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-500 text-xs uppercase">Type</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Quantity</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">By</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Note</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {movements.map((e) => (<tr key={e.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-4">
                            <p className="font-medium text-gray-900">{e.product?.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{e.product?.sku}</p>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <StockTypeBadge type={e.type}/>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono">
                            <span className={e.type === 'sale' ? 'text-amber-600' : 'text-green-600'}>
                              {e.type === 'sale' ? '-' : '+'}{e.quantity}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-gray-600">{e.performer?.name}</td>
                          <td className="py-2.5 px-4 text-gray-400 text-xs truncate max-w-[150px]">{e.note || '—'}</td>
                          <td className="py-2.5 px-4 text-right text-xs text-gray-400">
                            {format(new Date(e.createdAt), 'MMM d, yyyy HH:mm')}
                          </td>
                        </tr>))}
                    </tbody>
                  </table>
                  {mvPagination && (<div className="px-4">
                      <Pagination page={page} totalPages={mvPagination.totalPages} total={mvPagination.total} limit={mvPagination.limit} onPageChange={setPage}/>
                    </div>)}
                </>)}
            </div>)}
        </>)}
    </div>);
}
//# sourceMappingURL=ReportsPage.js.map