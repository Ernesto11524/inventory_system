import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, CheckSquare, Package } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { get, patch } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/index';
const STATUS_COLORS = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    received: 'bg-green-100 text-green-700',
};
export function PurchaseOrderDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ['purchase-order', id],
        queryFn: () => get(`/purchase-orders/${id}`),
    });
    const statusMutation = useMutation({
        mutationFn: (status) => patch(`/purchase-orders/${id}/status`, { status }),
        onSuccess: (_, status) => {
            queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            toast.success(`Order marked as ${status}`);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
    if (isLoading)
        return <LoadingSpinner className="h-96"/>;
    const order = data?.data;
    if (!order)
        return <div>Order not found</div>;
    const totalCost = order.items?.reduce((sum, i) => sum + (i.quantity * Number(i.unitCost)), 0) ?? 0;
    return (<div className="animate-fade-in space-y-6">
      <div>
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm mb-3 -ml-2">
          <ArrowLeft size={14}/> Back to Orders
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              PO #{id?.slice(-8).toUpperCase()}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {format(new Date(order.createdAt), 'MMMM d, yyyy')} · {order.supplier?.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[order.status]}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
            {order.status === 'draft' && (<button onClick={() => statusMutation.mutate('sent')} disabled={statusMutation.isPending} className="btn-primary btn-sm">
                <Send size={13}/> Mark as Sent
              </button>)}
            {order.status === 'sent' && (<button onClick={() => {
                if (confirm('Mark as received? This will automatically update stock levels.')) {
                    statusMutation.mutate('received');
                }
            }} disabled={statusMutation.isPending} className="btn-primary btn-sm bg-green-600 hover:bg-green-700">
                <CheckSquare size={13}/> Mark as Received
              </button>)}
          </div>
        </div>
      </div>

      {/* Supplier info */}
      <div className="card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Supplier</p>
          <p className="font-medium">{order.supplier?.name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Contact</p>
          <p className="font-medium">{order.supplier?.contactName || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Email</p>
          <p className="font-medium">{order.supplier?.email || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Total Cost</p>
          <p className="font-bold text-brand-700 text-lg">GH₵{totalCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Line items */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Line Items ({order.items?.length})</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-5 font-medium text-gray-500 text-xs uppercase">Product</th>
              <th className="text-right py-3 px-5 font-medium text-gray-500 text-xs uppercase">Qty</th>
              <th className="text-right py-3 px-5 font-medium text-gray-500 text-xs uppercase">Unit Cost</th>
              <th className="text-right py-3 px-5 font-medium text-gray-500 text-xs uppercase">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items?.map((item) => (<tr key={item.id} className="hover:bg-gray-50">
                <td className="py-3 px-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Package size={14} className="text-gray-400"/>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.product?.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{item.product?.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-5 text-right font-mono">
                  {item.quantity} {item.product?.unit}
                </td>
                <td className="py-3 px-5 text-right">GH₵{Number(item.unitCost).toFixed(2)}</td>
                <td className="py-3 px-5 text-right font-semibold">
                  GH₵{(item.quantity * Number(item.unitCost)).toFixed(2)}
                </td>
              </tr>))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td colSpan={3} className="py-3 px-5 text-right font-semibold text-gray-700">Total</td>
              <td className="py-3 px-5 text-right font-bold text-lg text-brand-700">
                GH₵{totalCost.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {order.note && (<div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Note</h3>
          <p className="text-sm text-gray-600">{order.note}</p>
        </div>)}
    </div>);
}
//# sourceMappingURL=PurchaseOrderDetailPage.js.map