import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Edit2, Trash2, Truck, Phone, Mail, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { supplierSchema, type SupplierInput } from '@inventory/shared';
import { get, post, put, del } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { PageHeader, Modal, EmptyState, LoadingSpinner, Pagination } from '../../components/ui/index';

function SupplierForm({ supplier, onClose }: { supplier?: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEditing = !!supplier;

  const { register, handleSubmit, formState: { errors } } = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier || {},
  });

  const mutation = useMutation({
    mutationFn: (data: SupplierInput) =>
      isEditing ? put(`/suppliers/${supplier.id}`, data) : post('/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(isEditing ? 'Supplier updated' : 'Supplier created');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div>
        <label className="label">Company Name *</label>
        <input {...register('name')} className="input" placeholder="Acme Supplies Ltd." />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Contact Name</label>
          <input {...register('contactName')} className="input" placeholder="John Smith" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input {...register('phone')} className="input" placeholder="+1-555-0100" />
        </div>
        <div className="col-span-2">
          <label className="label">Email</label>
          <input {...register('email')} type="email" className="input" placeholder="contact@supplier.com" />
        </div>
        <div className="col-span-2">
          <label className="label">Address</label>
          <textarea {...register('address')} className="input resize-none" rows={2} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Supplier'}
        </button>
      </div>
    </form>
  );
}

export function SuppliersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<any>(null);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page],
    queryFn: () => get<any[]>('/suppliers', { page, limit: 20 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier deleted');
    },
  });

  const suppliers = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Suppliers"
        actions={isAdmin ? (
          <button onClick={() => { setEditSupplier(null); setShowForm(true); }} className="btn-primary btn-sm">
            <Plus size={13} /> New Supplier
          </button>
        ) : undefined}
      />

      {isLoading ? (
        <LoadingSpinner className="h-64" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.length === 0 ? (
            <div className="col-span-3">
              <EmptyState message="No suppliers yet" icon="product" className="h-64" />
            </div>
          ) : (
            suppliers.map((s: any) => (
              <div key={s.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                    <Truck size={18} className="text-brand-700" />
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditSupplier(s); setShowForm(true); }}
                        className="btn-ghost btn-sm p-1.5"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${s.name}"?`)) deleteMutation.mutate(s.id); }}
                        className="btn-ghost btn-sm p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                {s.contactName && <p className="text-sm text-gray-500 mt-0.5">{s.contactName}</p>}
                <div className="mt-3 space-y-1.5">
                  {s.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mail size={11} /> {s.email}
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone size={11} /> {s.phone}
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-start gap-2 text-xs text-gray-500">
                      <MapPin size={11} className="mt-0.5 shrink-0" /> {s.address}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditSupplier(null); }}
        title={editSupplier ? 'Edit Supplier' : 'New Supplier'}
      >
        <SupplierForm supplier={editSupplier} onClose={() => { setShowForm(false); setEditSupplier(null); }} />
      </Modal>
    </div>
  );
}
