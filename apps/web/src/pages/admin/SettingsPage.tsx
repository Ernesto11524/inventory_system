import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Store, CreditCard, Palette, Save, Eye, EyeOff,
  Sun, Moon, Building2, Phone, Mail, MapPin, Tag, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { get, patch } from '../../utils/api';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../../components/ui/index';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoreForm {
  storeName: string;
  storeTagline: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
}

interface PaymentForm {
  paystackPublicKey: string;
  paystackSecretKey: string;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon, title, subtitle, children,
}: {
  icon: React.ElementType; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
          <Icon size={18} className="text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({
  label, icon: Icon, error, children,
}: {
  label: string; icon?: React.ElementType; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label dark:text-gray-300">{label}</label>
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />}
        <div className={Icon ? '[&_input]:pl-9 [&_textarea]:pl-9' : ''}>{children}</div>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = useSettingsStore();

  return (
    <div className="flex gap-3">
      {(['light', 'dark'] as const).map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all',
            theme === t
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
              : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500',
          )}
        >
          {t === 'light' ? <Sun size={16} /> : <Moon size={16} />}
          {t.charAt(0).toUpperCase() + t.slice(1)}
          {theme === t && <Check size={14} className="ml-auto text-brand-500" />}
        </button>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user } = useAuthStore();
  const { setSettings } = useSettingsStore();
  const queryClient = useQueryClient();
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => get<any>('/settings'),
    enabled: isAdmin,
  });

  const serverSettings = data?.data;

  // ─── Store Info form ────────────────────────────────────────────────────────
  const storeForm = useForm<StoreForm>({
    defaultValues: {
      storeName: '', storeTagline: '', storeEmail: '',
      storePhone: '', storeAddress: '',
    },
  });

  // ─── Payment form ───────────────────────────────────────────────────────────
  const paymentForm = useForm<PaymentForm>({
    defaultValues: { paystackPublicKey: '', paystackSecretKey: '' },
  });

  useEffect(() => {
    if (serverSettings) {
      storeForm.reset({
        storeName: serverSettings.storeName ?? '',
        storeTagline: serverSettings.storeTagline ?? '',
        storeEmail: serverSettings.storeEmail ?? '',
        storePhone: serverSettings.storePhone ?? '',
        storeAddress: serverSettings.storeAddress ?? '',
      });
      paymentForm.reset({
        paystackPublicKey: serverSettings.paystackPublicKey ?? '',
        paystackSecretKey: '',
      });
    }
  }, [serverSettings]);

  const showSaved = (section: string) => {
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 2000);
  };

  const mutation = useMutation({
    mutationFn: (body: Record<string, any>) => patch<any>('/settings', body),
    onSuccess: (res, vars) => {
      const s = res.data;
      setSettings({
        storeName: s.storeName,
        storeTagline: s.storeTagline,
        storeLogo: s.storeLogo,
        storeEmail: s.storeEmail,
        storePhone: s.storePhone,
        storeAddress: s.storeAddress,
        currency: s.currency,
        currencySymbol: s.currencySymbol,
        paystackPublicKey: s.paystackPublicKey,
        hasSecretKey: s.hasSecretKey,
      });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    },
  });

  const saveStore = storeForm.handleSubmit((values) => {
    mutation.mutate(values, {
      onSuccess: () => { toast.success('Store info saved'); showSaved('store'); },
    });
  });

  const savePayment = paymentForm.handleSubmit((values) => {
    const body: Record<string, any> = {};
    if (values.paystackPublicKey) body.paystackPublicKey = values.paystackPublicKey;
    if (values.paystackSecretKey) body.paystackSecretKey = values.paystackSecretKey;
    mutation.mutate(body, {
      onSuccess: () => {
        toast.success('Payment settings saved');
        showSaved('payment');
        paymentForm.setValue('paystackSecretKey', '');
      },
    });
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <p>Admin access required.</p>
      </div>
    );
  }

  if (isLoading) return <LoadingSpinner className="h-64" />;

  const isSaving = mutation.isPending;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your store profile, payment integration, and appearance.
        </p>
      </div>

      {/* ── Store Information ─────────────────────────────────────────────── */}
      <Section icon={Building2} title="Store Information" subtitle="Your business name and contact details shown across the app">
        <form onSubmit={saveStore} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Store Name" icon={Store} error={storeForm.formState.errors.storeName?.message}>
              <input
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
                placeholder="e.g. Kofi's Supermarket"
                {...storeForm.register('storeName', { required: 'Store name is required' })}
              />
            </Field>
            <Field label="Tagline" icon={Tag}>
              <input
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
                placeholder="e.g. Fresh & Quality Every Day"
                {...storeForm.register('storeTagline')}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email" icon={Mail}>
              <input
                type="email"
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
                placeholder="store@example.com"
                {...storeForm.register('storeEmail')}
              />
            </Field>
            <Field label="Phone" icon={Phone}>
              <input
                className="input dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
                placeholder="+233 XX XXX XXXX"
                {...storeForm.register('storePhone')}
              />
            </Field>
          </div>
          <Field label="Address" icon={MapPin}>
            <input
              className="input dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
              placeholder="Street, City, Region"
              {...storeForm.register('storeAddress')}
            />
          </Field>
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className={clsx(
                'btn-primary btn-sm flex items-center gap-2',
                savedSection === 'store' && 'bg-green-600 hover:bg-green-700',
              )}
            >
              {savedSection === 'store' ? <Check size={14} /> : <Save size={14} />}
              {savedSection === 'store' ? 'Saved!' : isSaving ? 'Saving…' : 'Save Store Info'}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Payment Settings ──────────────────────────────────────────────── */}
      <Section icon={CreditCard} title="Payment Settings" subtitle="Paystack keys used for MoMo, card, and bank payments in POS">
        <form onSubmit={savePayment} className="space-y-4">
          <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 text-xs text-brand-700 dark:text-brand-300">
            Your <strong>public key</strong> is used in the browser to open the Paystack checkout.
            Your <strong>secret key</strong> is stored securely on the server for payment verification.
            Both keys are available in your{' '}
            <span className="font-semibold">Paystack dashboard → Settings → API Keys</span>.
          </div>

          <Field label="Paystack Public Key">
            <input
              className="input font-mono text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
              placeholder="pk_live_... or pk_test_..."
              {...paymentForm.register('paystackPublicKey')}
            />
          </Field>

          <Field label={`Paystack Secret Key${serverSettings?.hasSecretKey ? ' (already set — leave blank to keep)' : ''}`}>
            <div className="relative">
              <input
                type={showSecretKey ? 'text' : 'password'}
                className="input font-mono text-xs pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
                placeholder={serverSettings?.hasSecretKey ? '••••••••••••••••' : 'sk_live_... or sk_test_...'}
                {...paymentForm.register('paystackSecretKey')}
              />
              <button
                type="button"
                onClick={() => setShowSecretKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showSecretKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className={clsx(
                'btn-primary btn-sm flex items-center gap-2',
                savedSection === 'payment' && 'bg-green-600 hover:bg-green-700',
              )}
            >
              {savedSection === 'payment' ? <Check size={14} /> : <Save size={14} />}
              {savedSection === 'payment' ? 'Saved!' : isSaving ? 'Saving…' : 'Save Payment Keys'}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Appearance ────────────────────────────────────────────────────── */}
      <Section icon={Palette} title="Appearance" subtitle="Choose between light and dark mode for the interface">
        <ThemeToggle />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          This preference is saved locally in your browser.
        </p>
      </Section>
    </div>
  );
}
