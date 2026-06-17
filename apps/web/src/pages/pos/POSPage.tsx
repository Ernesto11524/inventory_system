import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  Barcode, CheckCircle, X, ReceiptText, Tag,
  User, Phone, CreditCard, Banknote, Smartphone,
  History, ChevronRight, Printer, PauseCircle, Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { get, post } from '../../utils/api';
import { savePendingSale } from '../../utils/offlineDB';
import { useOnlineStatus } from '../../utils/offlineSync';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { LoadingSpinner } from '../../components/ui/index';
import clsx from 'clsx';

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  quantity: number;
  unit: string;
  currentStock: number;
}

interface HeldCart {
  id: string;
  label: string;
  items: CartItem[];
  discount: number;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  savedAt: string;
}

const DRAFTS_KEY = 'pos-held-carts';

function loadHeldCarts(): HeldCart[] {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]'); } catch { return []; }
}
function saveHeldCarts(drafts: HeldCart[]) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

const PAYMENT_METHODS = [
  { key: 'cash',     label: 'Cash',         icon: Banknote,   color: 'bg-green-500',  desc: 'Physical cash' },
  { key: 'momo',     label: 'Mobile Money', icon: Smartphone, color: 'bg-purple-500', desc: 'MoMo / MTN / Telecel' },
  { key: 'paystack', label: 'Card / Bank',  icon: CreditCard, color: 'bg-brand-500',  desc: 'Pay via Paystack' },
  { key: 'credit',   label: 'Credit',       icon: Tag,        color: 'bg-red-500',    desc: 'Pay later' },
];

async function initializePaystackPayment(params: {
  email: string;
  amount: number; // in pesewas (GHS * 100)
  phone?: string;
  name?: string;
  paystackKey: string;
  onSuccess: (ref: string) => void;
  onClose: () => void;
}) {
  return new Promise<void>((resolve) => {
    if (!params.paystackKey) {
      alert('Paystack public key not configured. Go to Settings → Payment to add it.');
      params.onClose();
      resolve();
      return;
    }
    // Load Paystack inline script dynamically
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => {
      const handler = (window as any).PaystackPop.setup({
        key: params.paystackKey,
        email: params.email || 'customer@pos.com',
        amount: Math.round(params.amount * 100), // convert to pesewas
        currency: 'GHS',
        channels: ['mobile_money', 'card', 'bank'],
        metadata: {
          custom_fields: [
            { display_name: 'Customer Name', variable_name: 'customer_name', value: params.name || 'Walk-in' },
            { display_name: 'Phone', variable_name: 'phone', value: params.phone || '' },
          ],
        },
        callback: (response: any) => {
          params.onSuccess(response.reference);
          resolve();
        },
        onClose: () => {
          params.onClose();
          resolve();
        },
      });
      handler.openIframe();
    };
    document.head.appendChild(script);
  });
}

function ProductCard({ product, onAdd }: {
  product: any; onAdd: (p: any) => void;
}) {
  const stock = product.inventory?.currentStock ?? 0;
  const isOut = stock <= 0;
  const disabled = isOut;

  return (
    <button
      onClick={() => !disabled && onAdd(product)}
      disabled={disabled}
      className={clsx(
        'text-left p-3 rounded-xl border-2 transition-all w-full',
        disabled
          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
          : 'border-gray-200 bg-white hover:border-brand-400 hover:shadow-md cursor-pointer active:scale-95',
      )}
    >
      <div className="w-full h-14 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
        <ShoppingCart size={18} className="text-gray-400" />
      </div>
      <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2 mb-1">{product.name}</p>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-brand-700">GH₵{Number(product.price).toFixed(2)}</p>
        <span className={clsx(
          'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
          isOut ? 'bg-red-100 text-red-600' :
          stock < product.minStockLevel ? 'bg-amber-100 text-amber-600' :
          'bg-green-100 text-green-600',
        )}>
          {isOut ? 'Out' : `${stock}`}
        </span>
      </div>
    </button>
  );
}

function ReceiptModal({ sale, onClose }: { sale: any; onClose: () => void }) {
  const { settings } = useSettingsStore();
  const storeName = settings.storeName;

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt ${sale.receiptNo}</title>
        <style>
          * { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; color: #000; }
          body { font-family: monospace; font-size: 13px; width: 80mm; color: #000; font-weight: bold; }
          .receipt { padding: 16px; }
          .header { text-align: center; margin-bottom: 14px; }
          .company-name { font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #000; margin-bottom: 4px; line-height: 1.2; }
          .company-address { font-size: 12px; font-weight: bold; color: #000; margin-bottom: 10px; line-height: 1.5; }
          .header-divider { border-top: 2px solid #000; margin: 8px 0; }
          .receipt-no { font-weight: bold; font-size: 13px; margin: 5px 0; color: #000; }
          .date { font-size: 12px; font-weight: bold; color: #000; }
          .customer { margin: 12px 0; padding: 8px; border: 1px dashed #444; color: #000; font-size: 12px; }
          .items { margin: 12px 0; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; }
          .item { display: flex; justify-content: space-between; align-items: flex-start; margin: 8px 0; font-size: 12px; }
          .item-name { font-weight: bold; color: #000; font-size: 13px; }
          .item-qty { color: #000; font-size: 12px; font-weight: bold; margin-top: 2px; }
          .item-amount { font-weight: bold; color: #000; font-size: 13px; }
          .totals { margin-top: 12px; }
          .total-row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 13px; font-weight: bold; color: #000; }
          .total-amount { font-weight: 900; font-size: 16px; color: #000; margin: 4px 0; }
          .divider { border-top: 1px dashed #444; margin: 8px 0; }
          .footer { text-align: center; margin-top: 18px; border-top: 2px solid #000; padding-top: 10px; }
          .footer p { font-size: 13px; font-weight: bold; color: #000; margin: 4px 0; line-height: 1.6; }
          .footer .tagline { font-size: 12px; font-weight: bold; color: #000; margin-top: 6px; }
          @media print { * { color: #000 !important; font-weight: bold; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="company-name">Banksplus Mart</div>
            <div class="company-address">Cindy, Kumasi, Ashanti Region<br/>W463, Ghana</div>
            <div class="header-divider"></div>
            <div class="receipt-no">Receipt: ${sale.receiptNo}</div>
            <div class="date">${format(new Date(sale.createdAt), 'MMM d, yyyy  HH:mm')}</div>
          </div>

          ${sale.customerName ? `
            <div class="customer">
              <strong>${sale.customerName}</strong>
              ${sale.customerPhone ? `<br/>${sale.customerPhone}` : ''}
            </div>
          ` : ''}

          <div class="items">
            ${sale.items.map((item: any) => `
              <div class="item">
                <div>
                  <div class="item-name">${item.product?.name}</div>
                  <div class="item-qty">${item.quantity} x GH&#8373;${Number(item.unitPrice).toFixed(2)}</div>
                </div>
                <div class="item-amount">GH&#8373;${Number(item.subtotal).toFixed(2)}</div>
              </div>
            `).join('')}
          </div>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal</span>
              <span>GH&#8373;${Number(sale.subtotal).toFixed(2)}</span>
            </div>
            ${sale.discount > 0 ? `
              <div class="total-row">
                <span>Discount</span>
                <span>-GH&#8373;${Number(sale.discount).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="divider"></div>
            <div class="total-row total-amount">
              <span>TOTAL</span>
              <span>GH&#8373;${Number(sale.total).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Payment (${sale.paymentMethod === 'paystack' ? 'Card/Bank' : sale.paymentMethod === 'momo' ? 'Mobile Money' : sale.paymentMethod})</span>
              <span>GH&#8373;${Number(sale.amountPaid).toFixed(2)}</span>
            </div>
            ${sale.change > 0 ? `
              <div class="total-row">
                <span>Change</span>
                <span>GH&#8373;${Number(sale.change).toFixed(2)}</span>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Served by: ${sale.cashier?.name || 'Cashier'}</p>
            <p class="tagline">** Banksplus Mart **</p>
          </div>
        </div>
        <script>
          window.print();
          window.addEventListener('afterprint', () => window.close());
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-6">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Sale Complete!</h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{sale.receiptNo}</p>
            <p className="text-xs text-gray-400">{format(new Date(sale.createdAt), 'MMM d, yyyy HH:mm')}</p>
          </div>

          {sale.customerName && (
            <div className="bg-gray-50 rounded-lg p-2.5 mb-3 text-xs">
              <p className="font-medium text-gray-700">{sale.customerName}</p>
              {sale.customerPhone && <p className="text-gray-500">{sale.customerPhone}</p>}
            </div>
          )}

          <div className="border-t border-dashed border-gray-300 pt-3 mb-3 space-y-2 max-h-40 overflow-y-auto">
            {sale.items.map((item: any) => (
              <div key={item.id} className="flex justify-between text-xs">
                <div>
                  <p className="font-medium text-gray-900">{item.product?.name}</p>
                  <p className="text-gray-400">{item.quantity} × GH₵{Number(item.unitPrice).toFixed(2)}</p>
                </div>
                <p className="font-semibold">GH₵{Number(item.subtotal).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-300 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>GH₵{Number(sale.subtotal).toFixed(2)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-GH₵{Number(sale.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span>
              <span className="text-brand-700">GH₵{Number(sale.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Payment ({sale.paymentMethod === "paystack" ? "MoMo/Card/Bank" : sale.paymentMethod})</span>
              <span>GH₵{Number(sale.amountPaid).toFixed(2)}</span>
            </div>
            {sale.change > 0 && (
              <div className="flex justify-between text-xs font-medium text-green-600">
                <span>Change</span>
                <span>GH₵{Number(sale.change).toFixed(2)}</span>
              </div>
            )}
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">Thank you for your purchase!</p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button onClick={handlePrint} className="flex-1 btn-secondary">🖨️ Print</button>
          <button onClick={onClose} className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-semibold hover:bg-brand-700">
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}

function SaleHistoryPanel({ onClose }: { onClose: () => void }) {
  const [from, setFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selected, setSelected] = useState<any>(null);
  const [reprinting, setReprinting] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pos-sales-history', from, to],
    queryFn: () => get<any[]>('/sales', { from, to, limit: 50 }),
  });

  const { data: aggregateData } = useQuery({
    queryKey: ['pos-sales-aggregate', from, to],
    queryFn: () => get<any>('/sales/aggregate', { from, to }),
  });

  const sales = data?.data || [];
  const aggregate = aggregateData?.data;
  const totalRevenue = sales.reduce((s: number, sale: any) => s + Number(sale.total), 0);

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <History size={18} className="text-brand-600" /> Sale History
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="px-4 py-3 border-b border-gray-200 flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">From</label>
            <input type="date" className="input text-sm py-1.5" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">To</label>
            <input type="date" className="input text-sm py-1.5" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
        <div className="px-4 py-3 bg-brand-50 border-b border-brand-100 flex justify-between text-sm">
          <span className="text-brand-700 font-medium">{aggregate?.totalTransactions ?? sales.length} transactions · {aggregate?.totalItems ?? 0} items</span>
          <span className="text-brand-700 font-bold">GH₵{Number(aggregate?.totalRevenue ?? totalRevenue).toFixed(2)}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? <LoadingSpinner className="h-32" /> : sales.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ReceiptText size={32} className="mx-auto mb-2 opacity-50" />
              <p>No sales found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sales.map((sale: any) => (
                <div key={sale.id}>
                  <button onClick={() => setSelected(selected?.id === sale.id ? null : sale)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                      <CheckCircle size={16} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 font-mono">{sale.receiptNo}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(sale.createdAt), 'MMM d, HH:mm')} · {sale.cashier?.name}
                        {sale.customerName && ` · ${sale.customerName}`}
                      </p>
                      <div className="flex gap-2 mt-0.5">
                        <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                          sale.paymentMethod === 'cash' ? 'bg-green-100 text-green-700' :
                          sale.paymentMethod === 'momo' ? 'bg-purple-100 text-purple-700' :
                          sale.paymentMethod === 'paystack' ? 'bg-brand-100 text-brand-700' :
                          'bg-red-100 text-red-700')}>
                          {sale.paymentMethod}
                        </span>
                        <span className="text-[10px] text-gray-400">{sale.items.length} items</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">GH₵{Number(sale.total).toFixed(2)}</p>
                      <ChevronRight size={14} className={clsx('text-gray-400 ml-auto transition-transform', selected?.id === sale.id && 'rotate-90')} />
                    </div>
                  </button>
                  {selected?.id === sale.id && (
                    <div className="px-4 pb-3 bg-gray-50 border-t border-gray-100">
                      <div className="space-y-1.5 mt-2">
                        {sale.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-xs">
                            <span className="text-gray-700">{item.product?.name} × {item.quantity}</span>
                            <span className="font-medium">GH₵{Number(item.subtotal).toFixed(2)}</span>
                          </div>
                        ))}
                        {sale.discount > 0 && (
                          <div className="flex justify-between text-xs text-green-600">
                            <span>Discount</span><span>-GH₵{Number(sale.discount).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1">
                          <span>Total</span><span>GH₵{Number(sale.total).toFixed(2)}</span>
                        </div>
                        {sale.note && <p className="text-xs text-gray-400 italic mt-1">{sale.note}</p>}
                        <button
                          onClick={() => setReprinting(sale)}
                          className="mt-3 w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-brand-700 transition-colors"
                        >
                          <Printer size={12} /> Reprint Receipt
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reprint Receipt Modal */}
      {reprinting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setReprinting(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Printer size={22} className="text-brand-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Receipt</h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{reprinting.receiptNo}</p>
                <p className="text-xs text-gray-400">{format(new Date(reprinting.createdAt), 'MMM d, yyyy HH:mm')}</p>
              </div>

              {reprinting.customerName && (
                <div className="bg-gray-50 rounded-lg p-2.5 mb-3 text-xs">
                  <p className="font-medium text-gray-700">{reprinting.customerName}</p>
                  {reprinting.customerPhone && <p className="text-gray-500">{reprinting.customerPhone}</p>}
                </div>
              )}

              <div className="border-t border-dashed border-gray-300 pt-3 mb-3 space-y-2 max-h-48 overflow-y-auto">
                {reprinting.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <div>
                      <p className="font-medium text-gray-900">{item.product?.name}</p>
                      <p className="text-gray-400">{item.quantity} × GH₵{Number(item.unitPrice).toFixed(2)}</p>
                    </div>
                    <p className="font-semibold">GH₵{Number(item.subtotal).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-300 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>GH₵{Number(reprinting.subtotal).toFixed(2)}</span>
                </div>
                {reprinting.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-GH₵{Number(reprinting.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total</span>
                  <span className="text-brand-700">GH₵{Number(reprinting.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Payment ({reprinting.paymentMethod === 'paystack' ? 'Card/Bank' : reprinting.paymentMethod === 'momo' ? 'Mobile Money' : reprinting.paymentMethod})</span>
                  <span>GH₵{Number(reprinting.amountPaid).toFixed(2)}</span>
                </div>
                {reprinting.change > 0 && (
                  <div className="flex justify-between text-xs font-medium text-green-600">
                    <span>Change</span>
                    <span>GH₵{Number(reprinting.change).toFixed(2)}</span>
                  </div>
                )}
              </div>
              <p className="text-center text-xs text-gray-400 mt-3">Thank you for your purchase!</p>
              <p className="text-center text-xs text-gray-400">Served by: {reprinting.cashier?.name}</p>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button onClick={() => setReprinting(null)} className="flex-1 btn-secondary">Close</button>
              <button
                onClick={() => {
                  const printWindow = window.open('', '', 'width=400,height=600');
                  if (!printWindow) return;
                  const receiptHTML = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="UTF-8">
                      <title>Receipt ${reprinting.receiptNo}</title>
                      <style>
                        * { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; color: #000; }
                        body { font-family: monospace; font-size: 13px; width: 80mm; color: #000; font-weight: bold; }
                        .receipt { padding: 16px; }
                        .header { text-align: center; margin-bottom: 14px; }
                        .company-name { font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #000; margin-bottom: 4px; line-height: 1.2; }
                        .company-address { font-size: 12px; font-weight: bold; color: #000; margin-bottom: 10px; line-height: 1.5; }
                        .header-divider { border-top: 2px solid #000; margin: 8px 0; }
                        .receipt-no { font-weight: bold; font-size: 13px; margin: 5px 0; color: #000; }
                        .date { font-size: 12px; font-weight: bold; color: #000; }
                        .customer { margin: 12px 0; padding: 8px; border: 1px dashed #444; color: #000; font-size: 12px; }
                        .items { margin: 12px 0; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; }
                        .item { display: flex; justify-content: space-between; align-items: flex-start; margin: 8px 0; font-size: 12px; }
                        .item-name { font-weight: bold; color: #000; font-size: 13px; }
                        .item-qty { color: #000; font-size: 12px; font-weight: bold; margin-top: 2px; }
                        .item-amount { font-weight: bold; color: #000; font-size: 13px; }
                        .totals { margin-top: 12px; }
                        .total-row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 13px; font-weight: bold; color: #000; }
                        .total-amount { font-weight: 900; font-size: 16px; color: #000; margin: 4px 0; }
                        .divider { border-top: 1px dashed #444; margin: 8px 0; }
                        .footer { text-align: center; margin-top: 18px; border-top: 2px solid #000; padding-top: 10px; }
                        .footer p { font-size: 13px; font-weight: bold; color: #000; margin: 4px 0; line-height: 1.6; }
                        .footer .tagline { font-size: 12px; font-weight: bold; color: #000; margin-top: 6px; }
                        @media print { * { color: #000 !important; font-weight: bold; } }
                      </style>
                    </head>
                    <body>
                      <div class="receipt">
                        <div class="header">
                          <div class="company-name">Banksplus Mart</div>
                          <div class="company-address">Cindy, Kumasi, Ashanti Region<br/>W463, Ghana</div>
                          <div class="header-divider"></div>
                          <div class="receipt-no">Receipt: ${reprinting.receiptNo}</div>
                          <div class="date">${format(new Date(reprinting.createdAt), 'MMM d, yyyy  HH:mm')}</div>
                        </div>
                        ${reprinting.customerName ? `
                          <div class="customer">
                            <strong>${reprinting.customerName}</strong>
                            ${reprinting.customerPhone ? `<br/>${reprinting.customerPhone}` : ''}
                          </div>
                        ` : ''}
                        <div class="items">
                          ${reprinting.items.map((item: any) => `
                            <div class="item">
                              <div>
                                <div class="item-name">${item.product?.name}</div>
                                <div class="item-qty">${item.quantity} x GH&#8373;${Number(item.unitPrice).toFixed(2)}</div>
                              </div>
                              <div class="item-amount">GH&#8373;${Number(item.subtotal).toFixed(2)}</div>
                            </div>
                          `).join('')}
                        </div>
                        <div class="totals">
                          <div class="total-row">
                            <span>Subtotal</span>
                            <span>GH&#8373;${Number(reprinting.subtotal).toFixed(2)}</span>
                          </div>
                          ${reprinting.discount > 0 ? `
                            <div class="total-row">
                              <span>Discount</span>
                              <span>-GH&#8373;${Number(reprinting.discount).toFixed(2)}</span>
                            </div>
                          ` : ''}
                          <div class="divider"></div>
                          <div class="total-row total-amount">
                            <span>TOTAL</span>
                            <span>GH&#8373;${Number(reprinting.total).toFixed(2)}</span>
                          </div>
                          <div class="total-row">
                            <span>Payment (${reprinting.paymentMethod === 'paystack' ? 'Card/Bank' : reprinting.paymentMethod === 'momo' ? 'Mobile Money' : reprinting.paymentMethod})</span>
                            <span>GH&#8373;${Number(reprinting.amountPaid).toFixed(2)}</span>
                          </div>
                          ${reprinting.change > 0 ? `
                            <div class="total-row">
                              <span>Change</span>
                              <span>GH&#8373;${Number(reprinting.change).toFixed(2)}</span>
                            </div>
                          ` : ''}
                        </div>
                        <div class="footer">
                          <p>Thank you for your purchase!</p>
                          <p>Served by: ${reprinting.cashier?.name}</p>
                          <p class="tagline">** Banksplus Mart **</p>
                        </div>
                      </div>
                      <script>
                        window.print();
                        window.addEventListener('afterprint', () => window.close());
                      </script>
                    </body>
                    </html>
                  `;
                  printWindow.document.write(receiptHTML);
                  printWindow.document.close();
                }}
                className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-semibold hover:bg-brand-700 flex items-center justify-center gap-2">
                <Printer size={14} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function POSPage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [addItemSearch, setAddItemSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(loadHeldCarts);
  const [showDrafts, setShowDrafts] = useState(false);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const isOnline = useOnlineStatus();

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['pos-products', search, categoryId],
    queryFn: () => get<any[]>('/products', { limit: 100, search: search || undefined, categoryId: categoryId || undefined }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => get<any[]>('/categories'),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['pos-today-summary'],
    queryFn: () => get<any>('/sales/summary/today'),
    refetchInterval: 30000,
  });

  const products = productsData?.data || [];
  const categories = categoriesData?.data || [];
  const summary = summaryData?.data;

  const addToCart = (product: any) => {
    const stock = product.inventory?.currentStock ?? 0;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= stock) { toast.error(`Only ${stock} in stock`); return prev; }
        return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (stock <= 0) { toast.error('Out of stock'); return prev; }
      return [...prev, {
        productId: product.id, name: product.name, sku: product.sku,
        price: Number(product.price), costPrice: Number(product.costPrice || 0),
        quantity: 1, unit: product.unit, currentStock: stock,
      }];
    });
    toast.success(`${product.name} added`, { duration: 600, position: 'bottom-right' });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => {
      if (i.productId !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return i;
      if (newQty > i.currentStock) { toast.error(`Only ${i.currentStock} in stock`); return i; }
      return { ...i, quantity: newQty };
    }));
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((i) => i.productId !== productId));

  const holdCart = () => {
    if (cart.length === 0) return;
    const label = customerName.trim() || `Customer ${heldCarts.length + 1}`;
    const draft: HeldCart = {
      id: Date.now().toString(),
      label,
      items: cart,
      discount,
      customerName,
      customerPhone,
      paymentMethod,
      savedAt: new Date().toISOString(),
    };
    const updated = [...heldCarts, draft];
    setHeldCarts(updated);
    saveHeldCarts(updated);
    setCart([]); setDiscount(0); setCustomerName(''); setCustomerPhone(''); setPaymentMethod('cash'); setAmountPaid('');
    toast.success(`Cart held for ${label}`, { icon: '⏸️' });
  };

  const resumeDraft = (draft: HeldCart) => {
    if (cart.length > 0 && !window.confirm('You have items in the current cart. Hold the current cart first or clear it. Resume anyway and lose current cart?')) return;
    setCart(draft.items);
    setDiscount(draft.discount);
    setCustomerName(draft.customerName);
    setCustomerPhone(draft.customerPhone);
    setPaymentMethod(draft.paymentMethod);
    setAmountPaid('');
    const updated = heldCarts.filter((d) => d.id !== draft.id);
    setHeldCarts(updated);
    saveHeldCarts(updated);
    setShowDrafts(false);
    toast.success(`Resumed cart for ${draft.label}`, { icon: '▶️' });
  };

  const deleteDraft = (id: string) => {
    const updated = heldCarts.filter((d) => d.id !== id);
    setHeldCarts(updated);
    saveHeldCarts(updated);
  };

  const handleBarcodeScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const barcode = barcodeInput.trim();
    if (!barcode) return;
    setBarcodeInput('');
    try {
      const res = await get<any>(`/products/barcode/${barcode}`);
      if (res.data) addToCart(res.data);
    } catch {
      toast.error(`No product found for barcode: ${barcode}`);
    }
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  const change = amountPaid !== '' ? Math.max(0, Number(amountPaid) - total) : 0;
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  const saleMutation = useMutation({
    mutationFn: async () => {
      const saleData = {
        items: cart, customerName: customerName || undefined,
        customerPhone: customerPhone || undefined, paymentMethod,
        subtotal, discount, total, amountPaid: amountPaid || total, change,
      };

      // If offline, save to IndexedDB
      if (!isOnline) {
        await savePendingSale(saleData);
        return { offline: true, receiptNo: `OFFLINE-${Date.now().toString(36).toUpperCase()}`, items: cart, subtotal, discount, total, amountPaid: amountPaid || total, change, paymentMethod, customerName, customerPhone, createdAt: new Date().toISOString() };
      }

      // If Paystack selected, process payment first
      if (paymentMethod === 'paystack') {
        let paystackRef = '';
        await initializePaystackPayment({
          email: customerPhone ? `${customerPhone}@paystack.pos` : 'walkin@pos.com',
          amount: total,
          phone: customerPhone,
          name: customerName,
          paystackKey: settings.paystackPublicKey || '',
          onSuccess: (ref) => { paystackRef = ref; },
          onClose: () => { throw new Error('Payment cancelled'); },
        });
        if (!paystackRef) throw new Error('Payment was not completed');
      }

      try {
        return await post<any>('/sales', {
          items: cart, customerName: customerName || undefined,
          customerPhone: customerPhone || undefined, paymentMethod,
          subtotal, discount, total, amountPaid: amountPaid || total, change,
        });
      } catch (err: any) {
        // Network failure (no response) — save offline so the sale is not lost
        if (!err.response) {
          await savePendingSale(saleData);
          return { offline: true, receiptNo: `OFFLINE-${Date.now().toString(36).toUpperCase()}`, items: cart, subtotal, discount, total, amountPaid: amountPaid || total, change, paymentMethod, customerName, customerPhone, createdAt: new Date().toISOString() };
        }
        // Business logic error (day session closed, validation, etc.) — re-throw
        throw err;
      }
    },
    onSuccess: (res: any) => {
      setCompletedSale(res?.data ?? res);
      setCart([]); setDiscount(0); setCustomerName(''); setCustomerPhone('');
      setAmountPaid(''); setPaymentMethod('cash');
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      queryClient.invalidateQueries({ queryKey: ['pos-today-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Sale failed — please re-enter this sale', { duration: 8000 }),
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 lg:-m-6 overflow-hidden">
      {/* Left — Products */}
      <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden border-r border-gray-200">
        <div className="p-3 bg-white border-b border-gray-200 space-y-2 shrink-0">
          {summary && (
            <div className="flex gap-3 text-xs bg-brand-50 rounded-lg px-3 py-2 items-center flex-wrap">
              <span className="text-brand-700 font-semibold">📅 Today:</span>
              <span className="text-brand-600">{summary.totalTransactions} sales · {summary.totalItems} items</span>
              <span className="text-brand-700 font-bold">GH₵{Number(summary.totalRevenue).toFixed(2)}</span>
              <button onClick={() => setShowHistory(true)} className="ml-auto text-brand-600 font-medium flex items-center gap-1 hover:text-brand-700">
                <History size={11} /> View History
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Barcode size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input ref={barcodeRef} value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeScan} className="input pl-8 text-sm font-mono" placeholder="Scan barcode…" autoFocus />
            </div>
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-8 text-sm" placeholder="Search products…" />
            </div>
            <button
              onClick={() => setShowAddItem(true)}
              className="shrink-0 bg-brand-600 text-white px-4 rounded-xl font-semibold text-sm hover:bg-brand-700 flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            <button onClick={() => setCategoryId('')} className={clsx('shrink-0 px-3 py-1 rounded-full text-xs font-medium', categoryId === '' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600')}>All</button>
            {categories.map((c: any) => (
              <button key={c.id} onClick={() => setCategoryId(c.id)} className={clsx('shrink-0 px-3 py-1 rounded-full text-xs font-medium', categoryId === c.id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600')}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? <LoadingSpinner className="h-64" /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} onAdd={addToCart} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — Cart */}
      <div className="w-80 xl:w-96 flex flex-col bg-white shrink-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ShoppingCart size={16} className="text-brand-600 shrink-0" />
            <span className="font-bold text-gray-900 text-sm">Current Sale</span>
            {totalItems > 0 && <span className="bg-brand-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">{totalItems}</span>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {heldCarts.length > 0 && (
              <button onClick={() => setShowDrafts(true)}
                className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg hover:bg-amber-100 transition-colors">
                <Clock size={11} />
                {heldCarts.length} held
              </button>
            )}
            {cart.length > 0 && (
              <button onClick={holdCart}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 px-2 py-1 rounded-lg hover:bg-brand-100 transition-colors">
                <PauseCircle size={11} /> Hold
              </button>
            )}
            {cart.length > 0 && (
              <button onClick={() => { setCart([]); setDiscount(0); setCustomerName(''); setCustomerPhone(''); setAmountPaid(''); }}
                className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                <X size={11} /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <ReceiptText size={28} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Click a product or scan a barcode to add</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {cart.map((item) => (
                <div key={item.productId} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium text-gray-900 truncate flex-1">{item.name}</p>
                    <button onClick={() => removeFromCart(item.productId)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={13} /></button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.productId, -1)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><Minus size={10} /></button>
                      <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, 1)} className="w-6 h-6 rounded-full bg-brand-100 hover:bg-brand-200 text-brand-700 flex items-center justify-center"><Plus size={10} /></button>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">GH₵{item.price.toFixed(2)} × {item.quantity}</p>
                      <p className="text-sm font-bold text-gray-900">GH₵{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Customer info */}
          <div className="border-t border-gray-200 px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer (optional)</p>
            <div className="relative">
              <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-8 text-sm py-2" placeholder="Customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div className="relative">
              <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-8 text-sm py-2" placeholder="Phone number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
            </div>
          </div>

          {/* Payment method */}
          <div className="border-t border-gray-200 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment Method</p>
            <div className="flex flex-col gap-1.5">
              {PAYMENT_METHODS.map(({ key, label, icon: Icon, color, desc }) => (
                <button key={key} onClick={() => setPaymentMethod(key)}
                  className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all w-full',
                    paymentMethod === key ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                  <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', color)}><Icon size={14} className="text-white" /></div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  {paymentMethod === key && <CheckCircle size={16} className="text-brand-500 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Totals & checkout */}
        <div className="border-t border-gray-200 px-4 py-3 shrink-0 space-y-2">
          <div className="flex items-center gap-2">
            <Tag size={12} className="text-gray-400" />
            <span className="text-xs text-gray-600 shrink-0">Discount</span>
            <input type="number" min="0" value={discount || ''} onChange={e => setDiscount(Math.max(0, Number(e.target.value)))} className="input text-right text-sm py-1.5 flex-1" placeholder="0.00" />
          </div>
          {(paymentMethod === 'cash') && (
            <div className="flex items-center gap-2">
              <Banknote size={12} className="text-gray-400" />
              <span className="text-xs text-gray-600 shrink-0">Amount paid</span>
              <input type="number" min="0" value={amountPaid} onChange={e => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))} className="input text-right text-sm py-1.5 flex-1" placeholder={total.toFixed(2)} />
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>GH₵{subtotal.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>-GH₵{discount.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold border-t border-gray-200 pt-1.5"><span>Total</span><span className="text-brand-700">GH₵{total.toFixed(2)}</span></div>
            {paymentMethod === 'cash' && amountPaid !== '' && Number(amountPaid) >= total && (
              <div className="flex justify-between text-sm font-semibold text-green-600"><span>Change</span><span>GH₵{change.toFixed(2)}</span></div>
            )}
          </div>
          <button onClick={() => saleMutation.mutate()} disabled={cart.length === 0 || saleMutation.isPending}
            className={clsx('w-full py-3 rounded-xl font-bold text-sm transition-all',
              cart.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-95 shadow-lg')}>
            {saleMutation.isPending ? 'Processing…' : !isOnline ? `💾 Save Offline · GH₵${total.toFixed(2)}` : `Complete Sale · GH₵${total.toFixed(2)}`}
          </button>
        </div>
      </div>

      {completedSale && <ReceiptModal sale={completedSale} onClose={() => setCompletedSale(null)} />}
      {showHistory && <SaleHistoryPanel onClose={() => setShowHistory(false)} />}

      {/* Held Carts Panel */}
      {showDrafts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDrafts(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <PauseCircle size={18} className="text-amber-500" />
                <h2 className="font-bold text-gray-900">Held Carts</h2>
                <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{heldCarts.length}</span>
              </div>
              <button onClick={() => setShowDrafts(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {heldCarts.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">No held carts</p>
              ) : heldCarts.map((draft) => {
                const draftTotal = draft.items.reduce((s, i) => s + i.price * i.quantity, 0) - draft.discount;
                const draftItems = draft.items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <div key={draft.id} className="border border-gray-200 rounded-xl p-4 hover:border-brand-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-gray-900">{draft.label}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> Held at {format(new Date(draft.savedAt), 'HH:mm')}
                        </p>
                      </div>
                      <button onClick={() => deleteDraft(draft.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                    <div className="text-xs text-gray-500 mb-3 space-y-0.5">
                      {draft.items.slice(0, 3).map((item) => (
                        <p key={item.productId} className="truncate">• {item.name} × {item.quantity}</p>
                      ))}
                      {draft.items.length > 3 && <p className="text-gray-400">+{draft.items.length - 3} more items</p>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">{draftItems} items</p>
                        <p className="font-bold text-brand-700">GH₵{draftTotal.toFixed(2)}</p>
                      </div>
                      <button onClick={() => resumeDraft(draft)}
                        className="flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors">
                        <ChevronRight size={14} /> Resume
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowAddItem(false); setAddItemSearch(''); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Plus size={16} className="text-brand-600" /> Add Item to Sale
              </h2>
              <button onClick={() => { setShowAddItem(false); setAddItemSearch(''); }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  className="input pl-9"
                  placeholder="Search by name, SKU or barcode…"
                  value={addItemSearch}
                  onChange={e => setAddItemSearch(e.target.value)}
                />
              </div>
              <div className="max-h-80 overflow-y-auto space-y-1">
                {products
                  .filter((p: any) => !addItemSearch || p.name.toLowerCase().includes(addItemSearch.toLowerCase()) || p.sku.toLowerCase().includes(addItemSearch.toLowerCase()))
                  .map((product: any) => {
                    const stock = product.inventory?.currentStock ?? 0;
                    const isOut = stock <= 0;
                    return (
                      <button
                        key={product.id}
                        disabled={isOut}
                        onClick={() => { addToCart(product); setShowAddItem(false); setAddItemSearch(''); }}
                        className={clsx(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left',
                          isOut ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' : 'border-gray-200 hover:border-brand-400 hover:bg-brand-50 cursor-pointer'
                        )}
                      >
                        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                          <ShoppingCart size={14} className="text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{product.sku}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-brand-700 text-sm">GH₵{Number(product.price).toFixed(2)}</p>
                          <p className={clsx('text-xs font-medium', isOut ? 'text-red-500' : stock < product.minStockLevel ? 'text-amber-500' : 'text-green-600')}>
                            {isOut ? 'Out of stock' : `${stock} ${product.unit}`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
