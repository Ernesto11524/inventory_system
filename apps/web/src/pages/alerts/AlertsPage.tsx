import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, AlertTriangle, XCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { get, patch } from '../../utils/api';
import { PageHeader, Pagination, LoadingSpinner, EmptyState } from '../../components/ui/index';
import { useSocketStore } from '../../store/socketStore';
import { SOCKET_EVENTS } from '@inventory/shared';
import clsx from 'clsx';

export function AlertsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { socket } = useSocketStore();

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', page, filter],
    queryFn: () => get<any[]>('/alerts', {
      page,
      limit: 20,
      ...(filter === 'unresolved' ? { resolved: false } : filter === 'resolved' ? { resolved: true } : {}),
    }),
  });

  // Real-time new alerts
  useEffect(() => {
    if (!socket) return;
    const handler = () => queryClient.invalidateQueries({ queryKey: ['alerts'] });
    socket.on(SOCKET_EVENTS.ALERT_CREATED, handler);
    socket.on(SOCKET_EVENTS.ALERT_RESOLVED, handler);
    return () => {
      socket.off(SOCKET_EVENTS.ALERT_CREATED, handler);
      socket.off(SOCKET_EVENTS.ALERT_RESOLVED, handler);
    };
  }, [socket, queryClient]);

  const resolveMutation = useMutation({
    mutationFn: (id: string) => patch(`/alerts/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-count'] });
      toast.success('Alert resolved');
    },
  });

  const alerts = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Alerts"
        subtitle="Stock alerts and notifications"
        actions={
          <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
            {[
              { key: 'unresolved', label: 'Unresolved' },
              { key: 'resolved', label: 'Resolved' },
              { key: 'all', label: 'All' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setFilter(key as any); setPage(1); }}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  filter === key ? 'bg-brand-600 text-white' : 'text-gray-600 hover:text-gray-900',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      <div className="card overflow-hidden">
        {isLoading ? (
          <LoadingSpinner className="h-64" />
        ) : alerts.length === 0 ? (
          <EmptyState
            message={filter === 'unresolved' ? 'No unresolved alerts — all clear! ✅' : 'No alerts found'}
            icon="alert"
            className="h-64"
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {alerts.map((alert: any) => (
              <div
                key={alert.id}
                className={clsx(
                  'flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors',
                  !alert.resolved && 'bg-amber-50/50',
                )}
              >
                <div className={clsx(
                  'mt-0.5 p-2 rounded-lg shrink-0',
                  alert.type === 'out_of_stock' ? 'bg-red-100' : 'bg-amber-100',
                )}>
                  {alert.type === 'out_of_stock'
                    ? <XCircle size={16} className="text-red-600" />
                    : <AlertTriangle size={16} className="text-amber-600" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={clsx(
                      'text-xs font-medium rounded-full px-2 py-0.5',
                      alert.type === 'out_of_stock' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
                    )}>
                      {alert.type === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
                    </span>
                    {alert.resolved && <span className="badge-green">Resolved</span>}
                  </div>
                  <p className="text-sm font-medium text-gray-900">{alert.product?.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(alert.createdAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/products/${alert.productId}`)}
                    className="btn-ghost btn-sm p-1.5"
                    title="View product"
                  >
                    <ExternalLink size={14} />
                  </button>
                  {!alert.resolved && (
                    <button
                      onClick={() => resolveMutation.mutate(alert.id)}
                      disabled={resolveMutation.isPending}
                      className="btn-secondary btn-sm gap-1"
                    >
                      <CheckCircle size={13} /> Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {pagination && (
          <div className="px-5">
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
