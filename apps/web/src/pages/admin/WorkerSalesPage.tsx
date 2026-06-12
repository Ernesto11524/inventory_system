import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { ArrowLeft, ShoppingCart, TrendingUp, Receipt, User } from 'lucide-react';
import { get } from '../../utils/api';
import { PageHeader, LoadingSpinner } from '../../components/ui/index';

export function WorkerSalesPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: salesRes, isLoading } = useQuery({
    queryKey: ['worker-sales', userId, from, to],
    queryFn: () => get<any>(`/sales?cashierId=${userId}&from=${from}&to=${to}&limit=100`),
    enabled: !!userId,
  });

  const { data: aggregateRes } = useQuery({
    queryKey: ['worker-sales-aggregate', userId, from, to],
    queryFn: () => get<any>(`/sales/aggregate?cashierId=${userId}&from=${from}&to=${to}`),
    enabled: !!userId,
  });

  const { data: workerRes } = useQuery({
    queryKey: ['worker-info', userId],
    queryFn: () => get<any[]>('/activity/workers', {
      from: format(new Date(), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  });

  const salesData = salesRes?.data;
  const sales: any[] = Array.isArray(salesData)
    ? salesData
    : (salesData?.items && Array.isArray(salesData.items) ? salesData.items : []);
  const workers: any[] = (workerRes?.data as any) ?? [];
  const worker = workers.find((w: any) => w.user.id === userId);
  const workerName = worker?.user?.name ?? 'Worker';

  const totalRevenue: number = aggregateRes?.data?.totalRevenue ?? 0;
  const totalTransactions: number = aggregateRes?.data?.totalTransactions ?? 0;
  const totalItems: number = aggregateRes?.data?.totalItems ?? 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`${workerName}'s Sales`}
        subtitle="All sales made by this staff member"
        actions={
          <button onClick={() => navigate('/workers')} className="btn-secondary btn-sm gap-1">
            <ArrowLeft size={13} /> Back to Workers
          </button>
        }
      />

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">From</label>
          <input type="date" className="input w-40" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input w-40" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Sales', value: totalTransactions, icon: Receipt, color: 'bg-brand-500' },
          { label: 'Total Revenue', value: `GH₵${totalRevenue.toFixed(2)}`, icon: TrendingUp, color: 'bg-green-500' },
          { label: 'Items Sold', value: totalItems, icon: ShoppingCart, color: 'bg-amber-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${color}`}>
              <Icon size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sales table */}
      {isLoading ? (
        <LoadingSpinner className="h-48" />
      ) : sales.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <ShoppingCart size={32} className="mx-auto mb-3 opacity-30" />
          <p>No sales in this period</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipt</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{sale.receiptNo}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {format(new Date(sale.createdAt), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-600">
                        {sale.items.slice(0, 2).map((item: any) => (
                          <div key={item.id}>{item.quantity}× {item.product?.name}</div>
                        ))}
                        {sale.items.length > 2 && (
                          <div className="text-gray-400">+{sale.items.length - 2} more</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      GH₵{sale.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700">Total</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-brand-700">GH₵{totalRevenue.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
