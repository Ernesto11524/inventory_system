import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  Clock, CheckCircle2, PlayCircle,
  StopCircle, ChevronDown, ChevronRight, ShoppingCart,
  Activity, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { get, post, patch } from '../../utils/api';
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

function TodayPanel() {
  const queryClient = useQueryClient();
  const [closeNotes, setCloseNotes] = useState('');
  const [showCloseForm, setShowCloseForm] = useState(false);
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
    enabled: !!session && showActivity,
  });

  const openMutation = useMutation({
    mutationFn: () => post('/day-sessions', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-session-today'] });
      queryClient.invalidateQueries({ queryKey: ['day-sessions-list'] });
      toast.success('Day opened — start recording!');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to open day'),
  });

  const closeMutation = useMutation({
    mutationFn: () => patch(`/day-sessions/${session!.id}/close`, { notes: closeNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-session-today'] });
      queryClient.invalidateQueries({ queryKey: ['day-sessions-list'] });
      setShowCloseForm(false);
      toast.success('Day closed. Great work today!');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to close day'),
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

  const today = format(new Date(), 'EEEE, MMMM d yyyy');

  if (isLoading) return <LoadingSpinner className="h-40" />;

  if (!session) {
    return (
      <div className="card p-8 text-center border-2 border-dashed border-gray-200">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Clock size={32} className="text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Loading today's session...</h2>
        <p className="text-sm text-gray-500 mb-6">{today}</p>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          The day session will open automatically at midnight. Please refresh if needed.
        </p>
      </div>
    );
  }

  const detail = detailRes?.data;
  const summary = detail?.summary;
  const activityLogs: any[] = detail?.activityLogs ?? [];

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className={clsx(
        'card p-5 border-l-4',
        session.status === 'open' ? 'border-green-500' : 'border-gray-300',
      )}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SessionStatusBadge status={session.status} />
              <span className="text-sm text-gray-500 font-medium">{today}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Opened at {format(parseISO(session.openedAt), 'hh:mm a')} by {session.notes?.includes('🤖') ? 'System (Auto-opened)' : session.opener?.name}
              {session.closedAt && (
                <> · Closed at {format(parseISO(session.closedAt), 'hh:mm a')} by {session.closer?.name}</>
              )}
            </p>
            {session.notes && !session.notes.includes('🤖') && (
              <p className="text-sm text-gray-600 mt-2 italic">"{session.notes}"</p>
            )}
          </div>

          <div className="flex gap-2">
            {session.status === 'open' && (
              <button
                onClick={() => setShowCloseForm(!showCloseForm)}
                className="btn-secondary btn-sm shrink-0"
              >
                <StopCircle size={14} className="text-red-500" />
                Close Day
              </button>
            )}
            {session.status === 'closed' && (
              <button
                onClick={() => reopenMutation.mutate()}
                disabled={reopenMutation.isPending}
                className="btn-primary btn-sm shrink-0"
              >
                <PlayCircle size={14} />
                {reopenMutation.isPending ? 'Reopening…' : 'Reopen Day'}
              </button>
            )}
          </div>
        </div>

        {/* Close form */}
        {showCloseForm && session.status === 'open' && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="label">Closing notes (optional)</label>
            <textarea
              className="input resize-none h-20 mb-3"
              placeholder="Any notes for today?"
              value={closeNotes}
              onChange={e => setCloseNotes(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCloseForm(false)} className="btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending}
                className="btn-primary btn-sm bg-red-600 hover:bg-red-700"
              >
                {closeMutation.isPending ? 'Closing…' : 'Confirm Close'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live summary */}
      <button
        className="w-full text-left"
        onClick={() => setShowActivity(!showActivity)}
      >
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
          {/* Stats row */}
          {summary && (
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
          )}

          {/* Activity feed */}
          {!detail ? (
            <LoadingSpinner className="h-24" />
          ) : activityLogs.length === 0 ? (
            <div className="card p-6 text-center text-gray-400 text-sm">No activity recorded yet</div>
          ) : (
            <div className="card divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {activityLogs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={clsx(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap',
                    ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-600',
                  )}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{log.details || '—'}</p>
                    <p className="text-[10px] text-gray-400">{log.user?.name}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                    {format(parseISO(log.createdAt), 'HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SessionHistoryRow({ session }: { session: any }) {
  const [open, setOpen] = useState(false);

  const { data: detailRes } = useQuery({
    queryKey: ['day-session-detail', session.id],
    queryFn: () => get<any>(`/day-sessions/${session.id}`),
    enabled: open,
  });

  const detail = detailRes?.data;
  const summary = detail?.summary;
  const activityLogs: any[] = detail?.activityLogs ?? [];

  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-2 h-2 rounded-full shrink-0',
            session.status === 'open' ? 'bg-green-500' : 'bg-gray-300',
          )} />
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
              {summary && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-amber-50 rounded-lg p-2.5 text-center">
                    <p className="text-sm font-bold text-amber-700">{summary.totalSales}</p>
                    <p className="text-[10px] text-amber-600">Sales</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2.5 text-center">
                    <p className="text-sm font-bold text-green-700">GH₵{Number(summary.totalRevenue).toFixed(2)}</p>
                    <p className="text-[10px] text-green-600">Revenue</p>
                  </div>
                  <div className="bg-brand-50 rounded-lg p-2.5 text-center">
                    <p className="text-sm font-bold text-brand-700">{summary.totalActions}</p>
                    <p className="text-[10px] text-brand-600">Actions</p>
                  </div>
                </div>
              )}

              {session.notes && (
                <p className="text-xs text-gray-500 italic mb-3">"{session.notes}"</p>
              )}

              {activityLogs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">No activity recorded</p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {activityLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                      <span className={clsx(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0',
                        ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-600',
                      )}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <p className="text-xs text-gray-600 flex-1 truncate">{log.details || '—'}</p>
                      <span className="text-[10px] text-gray-400 font-mono shrink-0">
                        {format(parseISO(log.createdAt), 'HH:mm')}
                      </span>
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
        subtitle="Open and close the business day — all activity is recorded automatically"
      />

      {/* Today */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Today · {format(new Date(), 'MMMM d, yyyy')}
        </h2>
        <TodayPanel />
      </section>

      {/* Past sessions */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock size={13} />
          Previous Sessions
        </h2>
        {isLoading ? (
          <LoadingSpinner className="h-32" />
        ) : past.length === 0 ? (
          <div className="card p-8 text-center text-gray-400 text-sm">
            No previous sessions yet
          </div>
        ) : (
          <div className="space-y-2">
            {past.map((s) => (
              <SessionHistoryRow key={s.id} session={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
