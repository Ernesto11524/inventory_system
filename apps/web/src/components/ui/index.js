import { Loader2, BarChart2, Activity, Package, AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';
// ─── LoadingSpinner ───────────────────────────────────────────────────────────
export function LoadingSpinner({ className }) {
    return (<div className={clsx('flex items-center justify-center', className)}>
      <Loader2 size={28} className="animate-spin text-brand-500"/>
    </div>);
}
// ─── EmptyState ───────────────────────────────────────────────────────────────
const ICONS = {
    chart: BarChart2,
    activity: Activity,
    product: Package,
    alert: AlertTriangle,
};
export function EmptyState({ message = 'No data found', icon = 'product', className, action, }) {
    const Icon = ICONS[icon] || Package;
    return (<div className={clsx('flex flex-col items-center justify-center gap-3 text-center', className)}>
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
        <Icon size={20} className="text-gray-400"/>
      </div>
      <p className="text-sm text-gray-500">{message}</p>
      {action}
    </div>);
}
// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, size = 'md', }) {
    if (!isOpen)
        return null;
    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className={clsx('relative w-full bg-white rounded-2xl shadow-2xl animate-slide-up max-h-[90vh] flex flex-col', sizeClasses[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18}/>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {children}
        </div>
      </div>
    </div>);
}
// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions, }) {
    return (<div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>);
}
// ─── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, onPageChange, total, limit, }) {
    if (totalPages <= 1)
        return null;
    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);
    return (<div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium">{from}–{to}</span> of <span className="font-medium">{total}</span>
      </p>
      <div className="flex gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="btn-secondary btn-sm px-3">
          ← Prev
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
            return (<button key={p} onClick={() => onPageChange(p)} className={clsx('btn btn-sm px-3 min-w-[36px]', p === page ? 'bg-brand-600 text-white hover:bg-brand-700' : 'btn-secondary')}>
              {p}
            </button>);
        })}
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="btn-secondary btn-sm px-3">
          Next →
        </button>
      </div>
    </div>);
}
// ─── StockTypeBadge ───────────────────────────────────────────────────────────
export function StockTypeBadge({ type }) {
    const map = {
        restock: 'badge-green',
        return: 'badge-blue',
        sale: 'badge-yellow',
        adjustment: 'badge-gray',
    };
    return <span className={map[type] || 'badge-gray'}>{type}</span>;
}
//# sourceMappingURL=index.js.map