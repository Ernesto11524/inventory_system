import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Package, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { loginSchema, type LoginInput } from '@inventory/shared';
import { useAuthStore } from '../../store/authStore';
import { post } from '../../utils/api';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    setIsLoading(true);
    try {
      const res = await post<{ user: any; tokens: any }>('/auth/login', values);
      login(res.data.user, res.data.tokens.accessToken, res.data.tokens.refreshToken);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate('/dashboard');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded-2xl mb-4 shadow-lg shadow-brand-500/30">
            <Package size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">StockFlow</h1>
          <p className="text-brand-300 mt-1 text-sm">Retail Inventory Management</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-1">Sign in</h2>
          <p className="text-brand-300 text-sm mb-6">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-200 mb-1.5">
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@inventory.com"
                autoComplete="email"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 text-sm"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-200 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 pr-10 text-white placeholder:text-white/40 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary btn-lg mt-2 rounded-xl"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
