import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { get, post, put, del } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { PageHeader, Modal, EmptyState, LoadingSpinner } from '../../components/ui/index';
const categorySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
});
function CategoryForm({ category, onClose }) {
    const queryClient = useQueryClient();
    const isEditing = !!category;
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(categorySchema),
        defaultValues: category || {},
    });
    const mutation = useMutation({
        mutationFn: (data) => isEditing ? put(`/categories/${category.id}`, data) : post('/categories', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success(isEditing ? 'Category updated' : 'Category created');
            onClose();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });
    return (<form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div>
        <label className="label">Category Name *</label>
        <input {...register('name')} className="input" placeholder="e.g. Electronics"/>
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <label className="label">Description</label>
        <textarea {...register('description')} className="input resize-none" rows={3} placeholder="Optional description..."/>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Category'}
        </button>
      </div>
    </form>);
}
export function CategoriesPage() {
    const [showForm, setShowForm] = useState(false);
    const [editCategory, setEditCategory] = useState(null);
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';
    const { data, isLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: () => get('/categories'),
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => del(`/categories/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category deleted');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
    });
    const categories = data?.data || [];
    return (<div className="animate-fade-in">
      <PageHeader title="Categories" subtitle={`${categories.length} categories`} actions={isAdmin ? (<button onClick={() => { setEditCategory(null); setShowForm(true); }} className="btn-primary btn-sm">
            <Plus size={13}/> New Category
          </button>) : undefined}/>

      {isLoading ? (<LoadingSpinner className="h-64"/>) : categories.length === 0 ? (<div className="card">
          <EmptyState message="No categories yet — create one to organize your products" icon="product" className="h-64" action={<button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
                <Plus size={13}/> Create first category
              </button>}/>
        </div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map((cat) => (<div key={cat.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                  <Tag size={18} className="text-brand-700"/>
                </div>
                {isAdmin && (<div className="flex gap-1">
                    <button onClick={() => { setEditCategory(cat); setShowForm(true); }} className="btn-ghost btn-sm p-1.5" title="Edit">
                      <Edit2 size={13}/>
                    </button>
                    <button onClick={() => {
                        if (confirm(`Delete "${cat.name}"? Products in this category will be uncategorized.`)) {
                            deleteMutation.mutate(cat.id);
                        }
                    }} className="btn-ghost btn-sm p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                      <Trash2 size={13}/>
                    </button>
                  </div>)}
              </div>
              <h3 className="font-semibold text-gray-900">{cat.name}</h3>
              {cat.description ? (<p className="text-sm text-gray-500 mt-1">{cat.description}</p>) : (<p className="text-sm text-gray-400 mt-1 italic">No description</p>)}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  {cat._count?.products ?? 0} product{(cat._count?.products ?? 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>))}
        </div>)}

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditCategory(null); }} title={editCategory ? 'Edit Category' : 'New Category'}>
        <CategoryForm category={editCategory} onClose={() => { setShowForm(false); setEditCategory(null); }}/>
      </Modal>
    </div>);
}
//# sourceMappingURL=CategoriesPage.js.map