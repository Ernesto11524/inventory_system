import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, ChevronRight, Trash2, PlusCircle, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { purchaseOrderSchema } from '@inventory/shared';
import { get, post } from '../../utils/api';
import { PageHeader, Modal, EmptyState, LoadingSpinner, Pagination } from '../../components/ui/index';
import clsx from 'clsx';
const STATUS_COLORS = {
    draft: 'badge-gray',
    sent: 'badge-blue',
    received: 'badge-green',
};
function POForm({ onClose }) {
    const queryClient = useQueryClient();
    const { data: suppliersData } = useQuery({
        queryKey: ['suppliers-all'],
        queryFn: () => get('/suppliers', { limit: 100 }),
    });
    const { data: productsData } = useQuery({
        queryKey: ['products-all'],
        queryFn: () => get('/products', { limit: 200 }),
    });
    const { register, handleSubmit, control, formState: { errors } } = useForm({
        resolver: zodResolver(purchaseOrderSchema),
        defaultValues: { items: [{ productId: '', quantity: 1, unitCost: 0 }] },
    });
    const { fields, append, remove } = useFieldArray({ control, name: 'items' });
    const mutation = useMutation({
        mutationFn: (data) => post('/purchase-orders', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            toast.success('Purchase order created');
            onClose();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
    const suppliers = suppliersData?.data || [];
    const products = productsData?.data || [];
    return (<form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div>
        <label className="label">Supplier *</label>
        <select {...register('supplierId')} className="input">
          <option value="">Select supplier…</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {errors.supplierId && <p className="text-red-500 text-xs mt-1">{errors.supplierId.message}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Line Items *</label>
          <button type="button" onClick={() => append({ productId: '', quantity: 1, unitCost: 0 })} className="btn-ghost btn-sm gap-1">
            <PlusCircle size={13}/> Add item
          </button>
        </div>
        <div className="space-y-2">
          {fields.map((field, idx) => (<div key={field.id} className="flex gap-2 items-center">
              <select {...register(`items.${idx}.productId`)} className="input flex-1">
                <option value="">Select product…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
              <input {...register(`items.${idx}.quantity`, { valueAsNumber: true })} type="number" min="1" placeholder="Qty" className="input w-20"/>
              <input {...register(`items.${idx}.unitCost`, { valueAsNumber: true })} type="number" step="0.01" min="0" placeholder="Cost" className="input w-24"/>
              {fields.length > 1 && (<button type="button" onClick={() => remove(idx)} className="btn-ghost btn-sm p-1.5 text-red-400 hover:text-red-600">
                  <Trash2 size={13}/>
                </button>)}
            </div>))}
        </div>
      </div>

      <div>
        <label className="label">Note</label>
        <textarea {...register('note')} className="input resize-none" rows={2}/>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Creating…' : 'Create Order'}
        </button>
      </div>
    </form>);
}
export function PurchaseOrdersPage() {
    const [page, setPage] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';
    const { data, isLoading } = useQuery({
        queryKey: ['purchase-orders', page, statusFilter],
        queryFn: () => get('/purchase-orders', { page, limit: 20, ...(statusFilter ? { status: statusFilter } : {}) }),
    });
    const orders = data?.data || [];
    const pagination = data?.pagination;
    return (<div className="animate-fade-in">
      <PageHeader title="Purchase Orders" subtitle={`${pagination?.total ?? '—'} orders`} actions={isAdmin ? (<button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
            <Plus size={13}/> New Order
          </button>) : undefined}/>

      {/* Status filter */}
      <div className="flex gap-2 mb-4">
        {[
            { value: '', label: 'All' },
            { value: 'draft', label: 'Draft' },
            { value: 'sent', label: 'Sent' },
            { value: 'received', label: 'Received' },
        ].map(({ value, label }) => (<button key={value} onClick={() => { setStatusFilter(value); setPage(1); }} className={clsx('btn btn-sm px-3', statusFilter === value ? 'bg-brand-600 text-white' : 'btn-secondary')}>
            {label}
          </button>))}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (<LoadingSpinner className="h-64"/>) : orders.length === 0 ? (<EmptyState message="No purchase orders yet" icon="product" className="h-64" action={<button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
                <Plus size={13}/> Create first order
              </button>}/>) : (<table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Order ID</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Supplier</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500 text-xs uppercase">Items</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Total Cost</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500 text-xs uppercase">Status</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Date</th>
                <th className="w-10"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => {
                const totalCost = order.items?.reduce((sum, i) => sum + (i.quantity * Number(i.unitCost)), 0) ?? 0;
                return (<tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                    <td className="py-3 px-4 font-mono text-xs text-gray-600">
                      #{order.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <ShoppingCart size={14} className="text-gray-400"/>
                        <span className="font-medium text-gray-900">{order.supplier?.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-gray-600">{order.items?.length ?? 0}</td>
                    <td className="py-3 px-4 text-right font-medium">GH₵totalCost.toFixed(2)</td>
                    <td className="py-3 px-4 text-center">
                      <span className={STATUS_COLORS[order.status] || 'badge-gray'}>{order.status}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-gray-400">
                      {format(new Date(order.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 px-4">
                      <ChevronRight size={14} className="text-gray-400"/>
                    </td>
                  </tr>);
            })}
            </tbody>
          </table>)}
        {pagination && (<div className="px-4">
            <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={setPage}/>
          </div>)}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New Purchase Order" size="lg">
        <POForm onClose={() => setShowForm(false)}/>
      </Modal>
    </div>);
}
//# sourceMappingURL=PurchaseOrdersPage.js.map