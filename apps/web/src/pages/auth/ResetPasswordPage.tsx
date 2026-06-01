import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Package, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { post } from '../../utils/api';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await post('/auth/reset-password', { token, newPassword });
      setDone(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded-2xl mb-4">
            <Package size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">StockFlow</h1>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} className="text-green-400" />
              </div>
              <p className="text-white font-semibold">Password reset successfully!</p>
              <p className="text-brand-300 text-sm">All sessions have been signed out.</p>
              <button onClick={() => navigate('/login')} className="w-full btn-primary btn-lg rounded-xl">
                Sign in with new password
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-1">Set new password</h2>
              <p className="text-brand-300 text-sm mb-6">Choose a strong password for your account.</p>
              {!token && <p className="text-red-400 text-sm mb-4">Invalid or missing reset token.</p>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-200 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={show ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 pr-10 text-white placeholder:text-white/40 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 text-sm"
                    />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-200 mb-1.5">Confirm Password</label>
                  <input
                    type={show ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full btn-primary btn-lg mt-2 rounded-xl"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
