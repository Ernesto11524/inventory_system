import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import {
  Users, Clock, LogIn, ShoppingCart,
  Activity, UserPlus, Eye, EyeOff, Trash2, KeyRound, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { get, patch, post, del } from '../../utils/api';
import { PageHeader, LoadingSpinner, Modal } from '../../components/ui/index';
import clsx from 'clsx';

function StatBadge({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      <span className="font-bold">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function WorkerCard({ worker, onViewActivity, onDelete, onChangePassword }: {
  worker: any;
  onViewActivity: (w: any) => void;
  onDelete: (w: any) => void;
  onChangePassword: (w: any) => void;
}) {
  const navigate = useNavigate();
  const isOnline = worker.lastSeen && new Date(worker.lastSeen) > new Date(Date.now() - 30 * 60 * 1000);
  const roleBadge =
    worker.user.role === 'admin'   ? 'bg-purple-100 text-purple-700' :
    worker.user.role === 'manager' ? 'bg-orange-100 text-orange-700' :
                                     'bg-blue-100 text-blue-700';

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-sm">
              {worker.user.name.charAt(0).toUpperCase()}
            </div>
            <div className={clsx(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
              isOnline ? 'bg-green-500' : 'bg-gray-300',
            )} />
          </div>
          <div>
            <p className="font-semibold text-gray-900 leading-tight">{worker.user.name}</p>
            <p className="text-xs text-gray-500">{worker.user.email}</p>
            <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize', roleBadge)}>
              {worker.user.role}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isOnline && <span className="text-xs text-green-600 font-medium">● Online</span>}
          {worker.lastSeen && (
            <p className="text-xs text-gray-400">
              {format(new Date(worker.lastSeen), 'HH:mm')}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <StatBadge value={worker.logins.length}   label="logins"        color="bg-green-100 text-green-700" />
        <StatBadge value={worker.salesCount}       label="sales"         color="bg-amber-100 text-amber-700" />
        <StatBadge value={worker.stockActions}     label="stock actions" color="bg-blue-100 text-blue-700" />
      </div>

      {worker.logins.length > 0 && (
        <div className="mb-3 p-2.5 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 mb-1">Logins today</p>
          <div className="flex flex-wrap gap-1.5">
            {worker.logins.slice(0, 5).map((t: string, i: number) => (
              <span key={i} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 font-mono">
                {format(new Date(t), 'HH:mm')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-1.5 mt-1">
        <button onClick={() => onViewActivity(worker)} className="btn-secondary btn-sm gap-1 text-xs">
          <Activity size={11} /> Activity
        </button>
        <button
          onClick={() => navigate(`/workers/${worker.user.id}/sales`)}
          className="btn-secondary btn-sm gap-1 text-xs"
        >
          <TrendingUp size={11} /> Sales
        </button>
        <button onClick={() => onChangePassword(worker)} className="btn-secondary btn-sm gap-1 text-xs">
          <KeyRound size={11} /> Set Password
        </button>
        <button
          onClick={() => onDelete(worker)}
          className="btn-secondary btn-sm gap-1 text-xs text-red-600 hover:bg-red-50"
        >
          <Trash2 size={11} /> Delete
        </button>
      </div>
    </div>
  );
}

function AddUserModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [showPass, setShowPass] = useState(false);

  const mutation = useMutation({
    mutationFn: () => post('/users', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toast.success('User created successfully');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create user'),
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Full Name *</label>
        <input className="input" placeholder="e.g. Abena Mensah" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
      </div>
      <div>
        <label className="label">Email *</label>
        <input className="input" type="email" placeholder="abena@shop.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
      </div>
      <div>
        <label className="label">Password *</label>
        <div className="relative">
          <input
            className="input pr-10"
            type={showPass ? 'text' : 'password'}
            placeholder="Min 6 characters"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
          />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>
      <div>
        <label className="label">Role *</label>
        <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">Manager: can add/remove stock and open day sessions</p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.name || !form.email || !form.password}
          className="btn-primary"
        >
          {mutation.isPending ? 'Creating…' : 'Create User'}
        </button>
      </div>
    </div>
  );
}

function ChangePasswordModal({ worker, onClose }: { worker: any; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const mutation = useMutation({
    mutationFn: () => patch(`/users/${worker.user.id}/password`, { newPassword }),
    onSuccess: () => {
      toast.success(`Password updated for ${worker.user.name}`);
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update password'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold">
          {worker.user.name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{worker.user.name}</p>
          <p className="text-xs text-gray-500">{worker.user.email}</p>
        </div>
      </div>
      <div>
        <label className="label">New Password *</label>
        <div className="relative">
          <input
            className="input pr-10"
            type={showPass ? 'text' : 'password'}
            placeholder="Min 6 characters"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || newPassword.length < 6}
          className="btn-primary"
        >
          {mutation.isPending ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </div>
  );
}

function DeleteUserModal({ worker, onClose }: { worker: any; onClose: () => void }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => del(`/users/${worker.user.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toast.success(`${worker.user.name} deleted`);
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete user'),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Are you sure you want to delete <strong>{worker.user.name}</strong>? This cannot be undone.
      </p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="btn-primary bg-red-600 hover:bg-red-700"
        >
          {mutation.isPending ? 'Deleting…' : 'Delete User'}
        </button>
      </div>
    </div>
  );
}

function ActivityModal({ worker, onClose }: { worker: any; onClose: () => void }) {
  const navigate = useNavigate();
  const [from, setFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, isLoading } = useQuery({
    queryKey: ['worker-activity', worker.user.id, from, to],
    queryFn: () => get<any[]>(`/activity/users/${worker.user.id}`, { from, to, limit: 100 }),
  });

  const logs = (data?.data as any) || [];

  const actionColor: Record<string, string> = {
    login:            'bg-green-100 text-green-700',
    logout:           'bg-gray-100 text-gray-600',
    stock_sale:       'bg-amber-100 text-amber-700',
    stock_restock:    'bg-blue-100 text-blue-700',
    stock_adjustment: 'bg-purple-100 text-purple-700',
    stock_return:     'bg-teal-100 text-teal-700',
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold">
          {worker.user.name.charAt(0)}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{worker.user.name}</p>
          <p className="text-xs text-gray-500 capitalize">{worker.user.role}</p>
        </div>
        <button
          onClick={() => { onClose(); navigate(`/workers/${worker.user.id}/sales`); }}
          className="btn-secondary btn-sm gap-1 text-xs"
        >
          <TrendingUp size={11} /> View All Sales
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="label">From</label>
          <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="label">To</label>
          <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="h-32" />
      ) : !logs.length ? (
        <p className="text-center text-gray-400 py-8">No activity in this period</p>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {logs.map((log: any) => (
            <div key={log.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
              <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', actionColor[log.action] || 'bg-gray-100 text-gray-600')}>
                {log.action.replace(/_/g, ' ')}
              </span>
              <p className="text-xs text-gray-600 flex-1 truncate">{log.details || '—'}</p>
              <span className="text-xs text-gray-400 shrink-0 font-mono">
                {format(new Date(log.createdAt), 'MMM d HH:mm')}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="btn-secondary">Close</button>
      </div>
    </div>
  );
}

export function WorkerMonitorPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [workerToDelete, setWorkerToDelete] = useState<any>(null);
  const [workerToChangePass, setWorkerToChangePass] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['workers', date],
    queryFn: () => get<any[]>('/activity/workers', { from: date, to: date }),
    refetchInterval: 60000,
  });

  const workers = (data?.data as any) || [];
  const activeWorkers = workers.filter((w: any) => w.logins.length > 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Worker Monitor"
        subtitle="Track staff activity, logins, and sales"
        actions={
          <div className="flex gap-2">
            <input
              type="date"
              className="input w-40"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            <button onClick={() => setShowAddUser(true)} className="btn-primary btn-sm">
              <UserPlus size={13} /> Add User
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Staff', value: workers.length, icon: Users, color: 'bg-brand-500' },
          { label: 'Active Today', value: activeWorkers.length, icon: Activity, color: 'bg-green-500' },
          { label: 'Total Sales Today', value: workers.reduce((s: number, w: any) => s + w.salesCount, 0), icon: ShoppingCart, color: 'bg-amber-500' },
          { label: 'Total Logins', value: workers.reduce((s: number, w: any) => s + w.logins.length, 0), icon: LogIn, color: 'bg-purple-500' },
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

      {isLoading ? (
        <LoadingSpinner className="h-64" />
      ) : workers.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">No workers found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workers.map((worker: any) => (
            <WorkerCard
              key={worker.user.id}
              worker={worker}
              onViewActivity={setSelectedWorker}
              onDelete={setWorkerToDelete}
              onChangePassword={setWorkerToChangePass}
            />
          ))}
        </div>
      )}

      <Modal isOpen={showAddUser} onClose={() => setShowAddUser(false)} title="Add New User">
        <AddUserModal onClose={() => setShowAddUser(false)} />
      </Modal>

      <Modal isOpen={!!selectedWorker} onClose={() => setSelectedWorker(null)} title="Worker Activity" size="lg">
        {selectedWorker && <ActivityModal worker={selectedWorker} onClose={() => setSelectedWorker(null)} />}
      </Modal>

      <Modal isOpen={!!workerToChangePass} onClose={() => setWorkerToChangePass(null)} title="Set New Password">
        {workerToChangePass && <ChangePasswordModal worker={workerToChangePass} onClose={() => setWorkerToChangePass(null)} />}
      </Modal>

      <Modal isOpen={!!workerToDelete} onClose={() => setWorkerToDelete(null)} title="Delete User">
        {workerToDelete && <DeleteUserModal worker={workerToDelete} onClose={() => setWorkerToDelete(null)} />}
      </Modal>
    </div>
  );
}
