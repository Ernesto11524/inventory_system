import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, AlertTriangle, Warehouse } from 'lucide-react';
import { get } from '../../utils/api';
import { LoadingSpinner, EmptyState, PageHeader, Pagination } from '../../components/ui/index';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';

function StockBar({ current, min }: { current: number; min: number }) {
  if (min === 0) return null;
  const pct = Math.min(100, (current / (min * 2)) * 100);
  const color = current <= 0 ? 'bg-red-500' : current < min ? 'bg-amber-400' : 'bg-green-500';
  return (
    <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function InventoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'low'>('all');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', page, search, tab],
    queryFn: () =>
      tab === 'low'
        ? get<any[]>('/inventory/low-stock')
        : get<any[]>('/inventory', { page, limit: 20, search }),
    refetchInterval: 60000,
  });

  const items = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Inventory" subtitle="Current stock levels across all products" />

      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
          {[
            { key: 'all', label: 'All Products' },
            { key: 'low', label: '⚠️ Low Stock' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key as any); setPage(1); }}
              className={clsx(
                'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                tab === key ? 'bg-brand-600 text-white' : 'text-gray-600 hover:text-gray-900',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'all' && (
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search products…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <LoadingSpinner className="h-64" />
        ) : items.length === 0 ? (
          <EmptyState
            message={tab === 'low' ? 'No low stock items — great!' : 'No inventory data yet'}
            icon="product"
            className="h-64"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Product</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Category</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Current Stock</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Min Level</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Level</th>
                  {isAdminOrManager && (
                    <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Stock Value</th>
                  )}
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item: any) => {
                  const current = item.currentStock ?? 0;
                  const min = item.minStockLevel ?? 0;
                  const isOut = current <= 0;
                  const isLow = !isOut && current < min;
                  const costPrice = item.costPrice ?? 0;
                  const stockValue = (current * Number(costPrice)).toFixed(2);
                  const productName = item.product?.name || item.productName || 'Unknown';
                  const productSku = item.product?.sku || item.productSku || '—';
                  const categoryName = item.product?.category?.name || item.categoryName || '—';
                  const unit = item.product?.unit || item.unit || 'pcs';
                  const productId = item.product?.id || item.productId || item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/products/${productId}`)}
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{productName}</p>
                        <p className="text-xs text-gray-400 font-mono">{productSku}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-500">{categoryName}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        <span className={isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-900'}>
                          {current}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">{unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500 font-mono text-xs">{min}</td>
                      <td className="py-3 px-4">
                        <StockBar current={current} min={min} />
                      </td>
                      {isAdminOrManager && (
                        <td className="py-3 px-4 text-right text-xs text-gray-600 font-mono">GH₵{stockValue}</td>
                      )}
                      <td className="py-3 px-4 text-right">
                        {isOut ? (
                          <span className="badge-red">Out of stock</span>
                        ) : isLow ? (
                          <span className="badge-yellow">Low stock</span>
                        ) : (
                          <span className="badge-green">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination && tab === 'all' && (
          <div className="px-4">
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
