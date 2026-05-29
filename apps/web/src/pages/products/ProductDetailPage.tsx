import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft, Package, Edit2, PlusCircle, TrendingUp,
  TrendingDown, RefreshCw, RotateCcw, Wrench,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { stockEntrySchema, type StockEntryInput } from '@inventory/shared';
import { get, post } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner, Modal, StockTypeBadge } from '../../components/ui/index';

const TYPE_ICONS: Record<string, any> = {
  restock: TrendingUp,
  sale: TrendingDown,
  return: RotateCcw,
  adjustment: Wrench,
};

function StockEntryForm({ productId, onClose, isAdmin }: { productId: string; onClose: () => void; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<Omit<StockEntryInput, 'productId'>>({
    resolver: zodResolver(stockEntrySchema.omit({ productId: true })),
    defaultValues: { type: isAdmin ? 'restock' : 'sale', quantity: 1 },
  });

  const mutation = useMutation({
    mutationFn: (data: Omit<StockEntryInput, 'productId'>) =>
      post('/stock/entry', { ...data, productId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['stock-history', productId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success('Stock entry recorded');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to record entry'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div>
        <label className="label">Entry Type *</label>
        <select {...register('type')} className="input">
          {isAdmin && <option value="restock">Restock (add stock)</option>}
          <option value="sale">Sale (remove stock)</option>
          <option value="return">Return (add back)</option>
          {isAdmin && <option value="adjustment">Adjustment</option>}
        </select>
      </div>
      <div>
        <label className="label">Quantity *</label>
        <input
          {...register('quantity', { valueAsNumber: true })}
          type="number"
          min="1"
          className="input"
          placeholder="1"
        />
        {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
      </div>
      <div>
        <label className="label">Note</label>
        <textarea {...register('note')} className="input resize-none" rows={2} placeholder="Optional note…" />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Saving…' : 'Record Entry'}
        </button>
      </div>
    </form>
  );
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showStockForm, setShowStockForm] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const { data: productData, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => get<any>(`/products/${id}`),
  });

  const { data: historyData } = useQuery({
    queryKey: ['stock-history', id, historyPage],
    queryFn: () => get<any[]>(`/stock/history/${id}`, { page: historyPage, limit: 15 }),
    enabled: !!id,
  });

  if (isLoading) return <LoadingSpinner className="h-96" />;

  const product = productData?.data;
  if (!product) return <div>Product not found</div>;

  const history = historyData?.data || [];
  const currentStock = product.inventory?.currentStock ?? 0;
  const stockValue = (currentStock * Number(product.costPrice)).toFixed(2);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back + header */}
      <div>
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm mb-3 -ml-2">
          <ArrowLeft size={14} /> Back to Products
        </button>
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden shrink-0">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={28} className="text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                <p className="text-sm text-gray-500 font-mono mt-0.5">{product.sku}</p>
                {product.category && (
                  <span className="badge-blue mt-1 inline-flex">{product.category.name}</span>
                )}
              </div>
              <button
                onClick={() => setShowStockForm(true)}
                className="btn-primary btn-sm"
              >
                <PlusCircle size={14} /> {isAdmin ? 'Stock Entry' : 'Record Sale'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Current Stock', value: `${currentStock} ${product.unit}`, color: currentStock <= 0 ? 'text-red-600' : currentStock < product.minStockLevel ? 'text-amber-600' : 'text-green-600' },
          { label: 'Min Level', value: `${product.minStockLevel} ${product.unit}`, color: 'text-gray-900' },
          { label: 'Selling Price', value: `GH₵${Number(product.price).toFixed(2)}`, color: 'text-gray-900' },
          { label: 'Stock Value', value: `GH₵${stockValue}`, color: 'text-brand-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Product details */}
      {product.description && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
          <p className="text-sm text-gray-600">{product.description}</p>
        </div>
      )}

      {/* Stock history */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Stock History</h3>
        </div>
        {history.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No stock entries yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2.5 px-5 font-medium text-gray-500 text-xs uppercase">Type</th>
                <th className="text-right py-2.5 px-5 font-medium text-gray-500 text-xs uppercase">Qty</th>
                <th className="text-left py-2.5 px-5 font-medium text-gray-500 text-xs uppercase">By</th>
                <th className="text-left py-2.5 px-5 font-medium text-gray-500 text-xs uppercase">Note</th>
                <th className="text-right py-2.5 px-5 font-medium text-gray-500 text-xs uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((entry: any) => {
                const Icon = TYPE_ICONS[entry.type] || RefreshCw;
                const isOutbound = entry.type === 'sale';
                return (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className={isOutbound ? 'text-amber-500' : 'text-green-500'} />
                        <StockTypeBadge type={entry.type} />
                      </div>
                    </td>
                    <td className={`py-3 px-5 text-right font-mono font-semibold ${isOutbound ? 'text-amber-600' : 'text-green-600'}`}>
                      {isOutbound ? '-' : '+'}{entry.quantity}
                    </td>
                    <td className="py-3 px-5 text-gray-600">{entry.performer?.name || '—'}</td>
                    <td className="py-3 px-5 text-gray-400 text-xs max-w-[200px] truncate">{entry.note || '—'}</td>
                    <td className="py-3 px-5 text-right text-xs text-gray-400">
                      {format(new Date(entry.createdAt), 'MMM d, yyyy HH:mm')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showStockForm} onClose={() => setShowStockForm(false)} title="Record Stock Entry">
        <StockEntryForm productId={id!} onClose={() => setShowStockForm(false)} isAdmin={isAdmin} />
      </Modal>
    </div>
  );
}
