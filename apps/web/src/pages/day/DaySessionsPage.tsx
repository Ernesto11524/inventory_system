import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  Clock, CheckCircle2, PlayCircle, StopCircle,
  ChevronDown, ChevronRight, ShoppingCart, Activity,
  TrendingUp, ArrowDownCircle, ArrowUpCircle, Plus, Trash2,
  Calculator,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { get, post, patch, del } from '../../utils/api';
import { PageHeader, LoadingSpinner } from '../../components/ui/index';
import type { DaySession } from '@inventory/shared';

const ACTION_COLOR: Record<string, string> = {
  login:            'bg-green-100 text-green-700',
  logout:           'bg-gray-100 text-gray-600',
  stock_sale:       'bg-amber-100 text-amber-700',
  stock_restock:    'bg-blue-100 text-blue-700',
  stock_adjustment: 'bg-purple-100 text-purple-700',
  stock_return:     'bg-teal-100 text-teal-700',
};

const CASH_CATEGORIES = {
  cash_in: [
    { value: 'debt_collection', label: 'Debt Collection' },
    { value: 'owner_deposit',   label: 'Owner Deposit' },
    { value: 'supplier_credit', label: 'Supplier Credit' },
    { value: 'other_income',    label: 'Other Income' },
  ],
  cash_out: [
    { value: 'supplier_payment', label: 'Supplier Payment' },
    { value: 'petty_cash',       label: 'Petty Cash / Expense' },
    { value: 'owner_withdrawal', label: 'Owner Withdrawal' },
    { value: 'other_expense',    label: 'Other Expense' },
  ],
};

function SessionStatusBadge({ status }: { status: string }) {
  return status === 'open' ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      Open
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
      <CheckCircle2 size={11} />
      Closed
    </span>
  );
}

// ─── Cash Entry Modal ─────────────────────────────────────────────────────────

function CashEntryModal({ daySessionId, onClose }: { daySessionId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [category, setCategory] = useState('debt_collection');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const mutation = useMutation({
    mutationFn: () => post('/cash-entries', { type, category, description, amount: Number(amount), daySessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-session-detail'] });
      toast.success(`${type === 'cash_in' ? 'Cash In' : 'Cash Out'} of GH₵${Number(amount).toFixed(2)} recorded`);
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to record entry'),
  });

  const handleTypeChange = (t: 'cash_in' | 'cash_out') => {
    setType(t);
    setCategory(CASH_CATEGORIES[t][0].value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Record Cash Movement</h2>
          <p className="text-xs text-gray-500 mt-0.5">Log money received or paid out outside of sales</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Type toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => handleTypeChange('cash_in')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all',
                type === 'cash_in' ? 'bg-green-500 text-white shadow' : 'text-gray-600 hover:text-gray-900',
              )}
            >
              <ArrowDownCircle size={16} /> Cash In
            </button>
            <button
              onClick={() => handleTypeChange('cash_out')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all',
                type === 'cash_out' ? 'bg-red-500 text-white shadow' : 'text-gray-600 hover:text-gray-900',
              )}
            >
              <ArrowUpCircle size={16} /> Cash Out
            </button>
          </div>

          {/* Category */}
          <div>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
              {CASH_CATEGORIES[type].map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <input
              className="input"
              placeholder={type === 'cash_in' ? 'e.g. Softcare debt payment' : 'e.g. Payment to Uncle Pod'}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="label">Amount (GH₵)</label>
            <input
              className="input text-lg font-semibold"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !amount || !description}
            className={clsx(
              'btn-sm font-semibold text-white rounded-lg px-4 py-2 transition-colors',
              type === 'cash_in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700',
            )}
          >
            {mutation.isPending ? 'Saving…' : `Record ${type === 'cash_in' ? 'Cash In' : 'Cash Out'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reconciliation + Close Modal ─────────────────────────────────────────────

function ReconcileCloseModal({
  session,
  summary,
  cashEntries,
  onClose,
}: {
  session: any;
  summary: any;
  cashEntries: any[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [physicalCash, setPhysicalCash] = useState('');
  const [changeGiven, setChangeGiven] = useState('');
  const [momoTotal, setMomoTotal] = useState(String(summary?.systemMomo ?? ''));
  const [notes, setNotes] = useState('');

  const systemTotal = Number(summary?.totalRevenue ?? 0);
  const cashIn  = cashEntries.filter(e => e.type === 'cash_in').reduce((s: number, e: any) => s + e.amount, 0);
  const cashOut = cashEntries.filter(e => e.type === 'cash_out').reduce((s: number, e: any) => s + e.amount, 0);

  const phys   = Number(physicalCash) || 0;
  const change = Number(changeGiven)  || 0;
  const momo   = Number(momoTotal)    || 0;
  const netCash = phys - change;
  const totalPhysical = netCash + momo + cashIn - cashOut;
  const variance = totalPhysical - systemTotal;
  const hasInput = physicalCash !== '';

  const closeMutation = useMutation({
    mutationFn: () => patch(`/day-sessions/${session.id}/close`, {
      notes,
      ...(physicalCash !== '' ? { physicalCash: phys, changeGiven: change, momoTotal: momo } : {}),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-session-today'] });
      queryClient.invalidateQueries({ queryKey: ['day-sessions-list'] });
      queryClient.invalidateQueries({ queryKey: ['day-session-detail'] });
      onClose();
      toast.success('Day closed successfully!');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to close day'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">End-of-Day Reconciliation</h2>
          <p className="text-xs text-gray-500 mt-0.5">Count your cash and enter the totals before closing</p>
        </div>

        <div className="p-6 space-y-5">
          {/* System summary */}
          <div className="bg-brand-50 rounded-xl p-4 space-y-1.5">
            <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-2">System Summary</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total sales recorded</span>
              <span className="font-semibold text-gray-900">GH₵{systemTotal.toFixed(2)}</span>
            </div>
            {cashIn > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Other cash received</span>
                <span className="font-semibold text-green-700">+GH₵{cashIn.toFixed(2)}</span>
              </div>
            )}
            {cashOut > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cash paid out</span>
                <span className="font-semibold text-red-600">−GH₵{cashOut.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Cash count inputs */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Physical Count</p>

            <div>
              <label className="label">Cash counted in till (GH₵)</label>
              <input
                className="input text-base"
                type="number" min="0" step="0.01" placeholder="0.00"
                value={physicalCash}
                onChange={e => setPhysicalCash(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Total change given out (GH₵)</label>
              <input
                className="input"
                type="number" min="0" step="0.01" placeholder="0.00"
                value={changeGiven}
                onChange={e => setChangeGiven(e.target.value)}
              />
              {change > 0 && (
                <p className="text-xs text-gray-400 mt-1">Net cash after change: GH₵{netCash.toFixed(2)}</p>
              )}
            </div>

            <div>
              <label className="label">Momo / Mobile money received (GH₵)</label>
              <input
                className="input"
                type="number" min="0" step="0.01" placeholder="0.00"
                value={momoTotal}
                onChange={e => setMomoTotal(e.target.value)}
              />
            </div>
          </div>

          {/* Live variance */}
          {hasInput && (
            <div className={clsx(
              'rounded-xl p-4 border-2',
              Math.abs(variance) < 1 ? 'border-green-200 bg-green-50' :
              variance > 0 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50',
            )}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3 text-gray-600">Reconciliation</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cash (net of change)</span>
                  <span className="font-mono">GH₵{netCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Momo received</span>
                  <span className="font-mono">GH₵{momo.toFixed(2)}</span>
                </div>
                {cashIn > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Other cash in</span>
                    <span className="font-mono text-green-700">+GH₵{cashIn.toFixed(2)}</span>
                  </div>
                )}
                {cashOut > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cash paid out</span>
                    <span className="font-mono text-red-600">−GH₵{cashOut.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-gray-200 pt-1.5 mt-1.5">
                  <span>Total physical</span>
                  <span>GH₵{totalPhysical.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>System total</span>
                  <span>GH₵{systemTotal.toFixed(2)}</span>
                </div>
                <div className={clsx(
                  'flex justify-between font-bold text-base border-t border-gray-200 pt-1.5 mt-1',
                  Math.abs(variance) < 1 ? 'text-green-700' : variance > 0 ? 'text-amber-700' : 'text-red-700',
                )}>
                  <span>{variance > 0.005 ? 'Over' : variance < -0.005 ? 'Short' : 'Balanced'}</span>
                  <span>{variance >= 0 ? '+' : ''}GH₵{variance.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Closing notes */}
          <div>
            <label className="label">Closing notes (optional)</label>
            <textarea
              className="input resize-none h-16"
              placeholder="Any notes for today?"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending}
            className="btn-sm bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg px-4 py-2"
          >
            <StopCircle size={14} />
            {closeMutation.isPending ? 'Closing…' : 'Close Day'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Today Panel ──────────────────────────────────────────────────────────────

function TodayPanel() {
  const queryClient = useQueryClient();
  const [showCashEntry, setShowCashEntry] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const { data: todayRes, isLoading } = useQuery({
    queryKey: ['day-session-today'],
    queryFn: () => get<DaySession | null>('/day-sessions/today'),
    refetchInterval: 30000,
  });

  const session = todayRes?.data ?? null;

  const { data: detailRes } = useQuery({
    queryKey: ['day-session-detail', session?.id],
    queryFn: () => get<any>(`/day-sessions/${session!.id}`),
    enabled: !!session,
    refetchInterval: 60000,
  });

  const reopenMutation = useMutation({
    mutationFn: () => patch(`/day-sessions/${session!.id}/reopen`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-session-today'] });
      queryClient.invalidateQueries({ queryKey: ['day-sessions-list'] });
      toast.success('Day reopened - continue working!');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to reopen day'),
  });

  const deleteCashEntry = useMutation({
    mutationFn: (id: string) => del(`/cash-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-session-detail'] });
      toast.success('Entry removed');
    },
  });

  const today = format(new Date(), 'EEEE, MMMM d yyyy');

  if (isLoading) return <LoadingSpinner className="h-40" />;

  if (!session) {
    return (
      <div className="card p-8 text-center border-2 border-dashed border-gray-200">
        <Clock size={32} className="text-blue-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-1">No session open today</h2>
        <p className="text-sm text-gray-500">{today}</p>
      </div>
    );
  }

  const detail = detailRes?.data;
  const summary = detail?.summary;
  const cashEntries: any[] = detail?.cashEntries ?? [];
  const activityLogs: any[] = detail?.activityLogs ?? [];
  const cashIn  = cashEntries.filter(e => e.type === 'cash_in').reduce((s, e) => s + e.amount, 0);
  const cashOut = cashEntries.filter(e => e.type === 'cash_out').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      {showCashEntry && session && (
        <CashEntryModal daySessionId={session.id} onClose={() => setShowCashEntry(false)} />
      )}
      {showCloseModal && session && detail && (
        <ReconcileCloseModal
          session={session}
          summary={summary}
          cashEntries={cashEntries}
          onClose={() => setShowCloseModal(false)}
        />
      )}

      {/* Header card */}
      <div className={clsx('card p-5 border-l-4', session.status === 'open' ? 'border-green-500' : 'border-gray-300')}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SessionStatusBadge status={session.status} />
              <span className="text-sm text-gray-500 font-medium">{today}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Opened at {format(parseISO(session.openedAt), 'hh:mm a')} by{' '}
              {session.notes?.includes('🤖') ? 'System (Auto-opened)' : (session as any).opener?.name}
              {session.closedAt && (
                <> · Closed at {format(parseISO(session.closedAt as any), 'hh:mm a')} by {(session as any).closer?.name}</>
              )}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {session.status === 'open' && (
              <>
                <button onClick={() => setShowCashEntry(true)} className="btn-secondary btn-sm">
                  <Plus size={13} /> Cash In / Out
                </button>
                <button onClick={() => setShowCloseModal(true)} className="btn-secondary btn-sm">
                  <StopCircle size={14} className="text-red-500" /> Close Day
                </button>
              </>
            )}
            {session.status === 'closed' && (
              <button onClick={() => reopenMutation.mutate()} disabled={reopenMutation.isPending} className="btn-primary btn-sm">
                <PlayCircle size={14} />
                {reopenMutation.isPending ? 'Reopening…' : 'Reopen Day'}
              </button>
            )}
          </div>
        </div>

        {/* Reconciliation result (if done) */}
        {(session as any).reconciledAt && (
          <div className={clsx(
            'mt-4 pt-4 border-t border-gray-100 rounded-lg p-3',
            Math.abs((session as any).variance ?? 0) < 1 ? 'bg-green-50' :
            (session as any).variance > 0 ? 'bg-amber-50' : 'bg-red-50',
          )}>
            <p className="text-xs font-semibold text-gray-600 mb-2">Reconciliation at close</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div>
                <p className="text-gray-400">Physical Cash</p>
                <p className="font-bold text-gray-800">GH₵{Number((session as any).physicalCash ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400">Momo</p>
                <p className="font-bold text-gray-800">GH₵{Number((session as any).momoTotal ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400">Change Given</p>
                <p className="font-bold text-gray-800">GH₵{Number((session as any).changeGiven ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400">Variance</p>
                <p className={clsx(
                  'font-bold text-base',
                  Math.abs((session as any).variance ?? 0) < 1 ? 'text-green-700' :
                  (session as any).variance > 0 ? 'text-amber-700' : 'text-red-700',
                )}>
                  {(session as any).variance >= 0 ? '+' : ''}GH₵{Number((session as any).variance ?? 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cash entries */}
      {cashEntries.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Cash Movements</h3>
            <div className="flex gap-3 text-xs">
              <span className="text-green-700 font-semibold">In: GH₵{cashIn.toFixed(2)}</span>
              <span className="text-red-600 font-semibold">Out: GH₵{cashOut.toFixed(2)}</span>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {cashEntries.map((entry: any) => (
              <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
                <div className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                  entry.type === 'cash_in' ? 'bg-green-100' : 'bg-red-100',
                )}>
                  {entry.type === 'cash_in'
                    ? <ArrowDownCircle size={14} className="text-green-600" />
                    : <ArrowUpCircle size={14} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{entry.description}</p>
                  <p className="text-xs text-gray-400">{entry.category.replace(/_/g, ' ')} · {entry.performer?.name} · {format(parseISO(entry.createdAt), 'HH:mm')}</p>
                </div>
                <span className={clsx('font-semibold text-sm', entry.type === 'cash_in' ? 'text-green-700' : 'text-red-600')}>
                  {entry.type === 'cash_in' ? '+' : '−'}GH₵{Number(entry.amount).toFixed(2)}
                </span>
                {session.status === 'open' && (
                  <button onClick={() => deleteCashEntry.mutate(entry.id)} className="text-gray-300 hover:text-red-400 transition-colors ml-1">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today summary */}
      <button className="w-full text-left" onClick={() => setShowActivity(!showActivity)}>
        <div className="card p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Activity size={15} className="text-brand-500" />
            Today's Activity
          </span>
          {showActivity ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </div>
      </button>

      {showActivity && (
        <div className="space-y-3">
          {summary && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Sales', value: summary.totalSales, icon: ShoppingCart, color: 'text-amber-600' },
                  { label: 'Revenue', value: `GH₵${Number(summary.totalRevenue).toFixed(2)}`, icon: TrendingUp, color: 'text-green-600' },
                  { label: 'Actions', value: summary.totalActions, icon: Activity, color: 'text-brand-600' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="card p-3 text-center">
                    <Icon size={18} className={clsx('mx-auto mb-1', color)} />
                    <p className="text-lg font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>

              {/* Payment method breakdown */}
              {summary.byPaymentMethod && Object.keys(summary.byPaymentMethod).length > 0 && (
                <div className="card p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sales by Payment Method</p>
                  <div className="space-y-2">
                    {[
                      { key: 'cash',     label: 'Cash',          color: 'bg-green-500',  text: 'text-green-700'  },
                      { key: 'momo',     label: 'Mobile Money',  color: 'bg-purple-500', text: 'text-purple-700' },
                      { key: 'paystack', label: 'Card / Bank',   color: 'bg-brand-500',  text: 'text-brand-700'  },
                      { key: 'credit',   label: 'Credit',        color: 'bg-red-400',    text: 'text-red-600'    },
                      { key: 'split',    label: 'Split Payment', color: 'bg-yellow-500', text: 'text-yellow-700' },
                    ].map(({ key, label, color, text }) => {
                      const row = summary.byPaymentMethod[key];
                      if (!row) return null;
                      const components = (row as any).components as Record<string, number> | undefined;
                      const componentLabels: Record<string, string> = { cash: 'Cash', momo: 'Mobile Money', paystack: 'Card / Bank', credit: 'Credit' };
                      return (
                        <div key={key}>
                          <div className="flex items-center gap-3">
                            <div className={clsx('w-2.5 h-2.5 rounded-full shrink-0', color)} />
                            <span className="text-sm text-gray-600 flex-1">{label}</span>
                            <span className="text-xs text-gray-400">{row.count} sales</span>
                            <span className={clsx('text-sm font-bold', text)}>GH₵{Number(row.total).toFixed(2)}</span>
                          </div>
                          {components && Object.entries(components).map(([m, amt]) => (
                            <div key={m} className="flex items-center gap-3 ml-5 mt-0.5">
                              <span className="text-xs text-gray-400 flex-1">↳ {componentLabels[m] ?? m}</span>
                              <span className="text-xs text-gray-500">GH₵{Number(amt).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    <div className="flex justify-between pt-2 border-t border-gray-100 text-sm font-bold">
                      <span className="text-gray-700">Total</span>
                      <span className="text-gray-900">GH₵{Number(summary.totalRevenue).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!detail ? (
            <LoadingSpinner className="h-24" />
          ) : activityLogs.length === 0 ? (
            <div className="card p-6 text-center text-gray-400 text-sm">No activity recorded yet</div>
          ) : (
            <div className="card divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {activityLogs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-600')}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{log.details || '—'}</p>
                    <p className="text-[10px] text-gray-400">{log.user?.name}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 font-mono">{format(parseISO(log.createdAt), 'HH:mm')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Session History Row ──────────────────────────────────────────────────────

function SessionHistoryRow({ session }: { session: any }) {
  const [open, setOpen] = useState(false);

  const { data: detailRes } = useQuery({
    queryKey: ['day-session-detail', session.id],
    queryFn: () => get<any>(`/day-sessions/${session.id}`),
    enabled: open,
  });

  const detail = detailRes?.data;
  const summary = detail?.summary;
  const cashEntries: any[] = detail?.cashEntries ?? [];
  const activityLogs: any[] = detail?.activityLogs ?? [];
  const cashIn  = cashEntries.filter((e: any) => e.type === 'cash_in').reduce((s: number, e: any) => s + e.amount, 0);
  const cashOut = cashEntries.filter((e: any) => e.type === 'cash_out').reduce((s: number, e: any) => s + e.amount, 0);

  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div className={clsx('w-2 h-2 rounded-full shrink-0', session.status === 'open' ? 'bg-green-500' : 'bg-gray-300')} />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {format(parseISO(session.date + 'T00:00:00'), 'EEEE, MMMM d yyyy')}
            </p>
            <p className="text-xs text-gray-400">
              {format(parseISO(session.openedAt), 'hh:mm a')} — {session.closedAt ? format(parseISO(session.closedAt), 'hh:mm a') : 'still open'}
              {' '}· by {session.opener?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {session.reconciledAt && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Calculator size={11} />
              {session.variance >= 0 ? '+' : ''}GH₵{Number(session.variance ?? 0).toFixed(2)}
            </span>
          )}
          <SessionStatusBadge status={session.status} />
          {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 pb-4 pt-3">
          {!detail ? (
            <LoadingSpinner className="h-20" />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-amber-50 rounded-lg p-2.5 text-center">
                  <p className="text-sm font-bold text-amber-700">{summary?.totalSales ?? 0}</p>
                  <p className="text-[10px] text-amber-600">Sales</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2.5 text-center">
                  <p className="text-sm font-bold text-green-700">GH₵{Number(summary?.totalRevenue ?? 0).toFixed(2)}</p>
                  <p className="text-[10px] text-green-600">Revenue</p>
                </div>
                <div className="bg-brand-50 rounded-lg p-2.5 text-center">
                  <p className="text-sm font-bold text-brand-700">{summary?.totalActions ?? 0}</p>
                  <p className="text-[10px] text-brand-600">Actions</p>
                </div>
              </div>

              {/* Payment breakdown */}
              {summary?.byPaymentMethod && Object.keys(summary.byPaymentMethod).length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Sales by Payment Method</p>
                  <div className="space-y-1.5">
                    {[
                      { key: 'cash',     label: 'Cash',          color: 'bg-green-500',  text: 'text-green-700'  },
                      { key: 'momo',     label: 'Mobile Money',  color: 'bg-purple-500', text: 'text-purple-700' },
                      { key: 'paystack', label: 'Card / Bank',   color: 'bg-brand-500',  text: 'text-brand-700'  },
                      { key: 'credit',   label: 'Credit',        color: 'bg-red-400',    text: 'text-red-600'    },
                      { key: 'split',    label: 'Split Payment', color: 'bg-yellow-500', text: 'text-yellow-700' },
                    ].map(({ key, label, color, text }) => {
                      const row = summary.byPaymentMethod[key];
                      if (!row) return null;
                      const components = (row as any).components as Record<string, number> | undefined;
                      const componentLabels: Record<string, string> = { cash: 'Cash', momo: 'Mobile Money', paystack: 'Card / Bank', credit: 'Credit' };
                      return (
                        <div key={key}>
                          <div className="flex items-center gap-2 text-xs">
                            <div className={clsx('w-2 h-2 rounded-full shrink-0', color)} />
                            <span className="text-gray-600 flex-1">{label} <span className="text-gray-400">({row.count})</span></span>
                            <span className={clsx('font-semibold', text)}>GH₵{Number(row.total).toFixed(2)}</span>
                          </div>
                          {components && Object.entries(components).map(([m, amt]) => (
                            <div key={m} className="flex items-center gap-2 text-xs ml-4 mt-0.5">
                              <span className="text-gray-400 flex-1">↳ {componentLabels[m] ?? m}</span>
                              <span className="text-gray-500">GH₵{Number(amt).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cash movements */}
              {cashEntries.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Cash Movements</p>
                  <div className="space-y-1">
                    {cashEntries.map((e: any) => (
                      <div key={e.id} className="flex items-center gap-2 text-xs">
                        <span className={e.type === 'cash_in' ? 'text-green-600' : 'text-red-500'}>
                          {e.type === 'cash_in' ? '↓' : '↑'}
                        </span>
                        <span className="flex-1 text-gray-700">{e.description}</span>
                        <span className={clsx('font-semibold', e.type === 'cash_in' ? 'text-green-700' : 'text-red-600')}>
                          {e.type === 'cash_in' ? '+' : '−'}GH₵{Number(e.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs pt-1 border-t border-gray-100">
                      <span className="text-gray-500">Net other cash</span>
                      <span className={clsx('font-semibold', cashIn - cashOut >= 0 ? 'text-green-700' : 'text-red-600')}>
                        {cashIn - cashOut >= 0 ? '+' : ''}GH₵{(cashIn - cashOut).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Reconciliation */}
              {session.reconciledAt && (
                <div className={clsx(
                  'rounded-lg p-3 mb-3 text-xs',
                  Math.abs(session.variance ?? 0) < 1 ? 'bg-green-50' :
                  session.variance > 0 ? 'bg-amber-50' : 'bg-red-50',
                )}>
                  <p className="font-semibold text-gray-600 mb-1.5">Reconciliation</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-gray-500">Physical cash</span><span className="font-mono text-right">GH₵{Number(session.physicalCash ?? 0).toFixed(2)}</span>
                    <span className="text-gray-500">Change given</span><span className="font-mono text-right">−GH₵{Number(session.changeGiven ?? 0).toFixed(2)}</span>
                    <span className="text-gray-500">Momo</span><span className="font-mono text-right">GH₵{Number(session.momoTotal ?? 0).toFixed(2)}</span>
                    <span className="text-gray-600 font-semibold border-t border-gray-200 pt-1">Variance</span>
                    <span className={clsx('font-bold text-right border-t border-gray-200 pt-1', Math.abs(session.variance ?? 0) < 1 ? 'text-green-700' : session.variance > 0 ? 'text-amber-700' : 'text-red-700')}>
                      {session.variance >= 0 ? '+' : ''}GH₵{Number(session.variance ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {session.notes && !session.notes.includes('🤖') && (
                <p className="text-xs text-gray-500 italic mb-3">"{session.notes}"</p>
              )}

              {activityLogs.length > 0 && (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {activityLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                      <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0', ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-600')}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <p className="text-xs text-gray-600 flex-1 truncate">{log.details || '—'}</p>
                      <span className="text-[10px] text-gray-400 font-mono shrink-0">{format(parseISO(log.createdAt), 'HH:mm')}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DaySessionsPage() {
  const { data: listRes, isLoading } = useQuery({
    queryKey: ['day-sessions-list'],
    queryFn: () => get<DaySession[]>('/day-sessions?limit=30'),
    refetchInterval: 60000,
  });

  const sessions: DaySession[] = (listRes?.data as any)?.items ?? listRes?.data ?? [];
  const today = format(new Date(), 'yyyy-MM-dd');
  const past = sessions.filter((s) => s.date !== today);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Day Sessions"
        subtitle="Open and close the business day — track cash movements and reconcile at end of day"
      />

      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Today · {format(new Date(), 'MMMM d, yyyy')}
        </h2>
        <TodayPanel />
      </section>

      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock size={13} /> Previous Sessions
        </h2>
        {isLoading ? (
          <LoadingSpinner className="h-32" />
        ) : past.length === 0 ? (
          <div className="card p-8 text-center text-gray-400 text-sm">No previous sessions yet</div>
        ) : (
          <div className="space-y-2">
            {past.map((s) => <SessionHistoryRow key={s.id} session={s} />)}
          </div>
        )}
      </section>
    </div>
  );
}
