import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Upload, Edit2, Trash2, Package, ChevronRight, Loader2, ScanLine, } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { get, post, put, del } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { productSchema } from '@inventory/shared';
import { Modal, PageHeader, Pagination, LoadingSpinner, EmptyState } from '../../components/ui/index';
function StockBadge({ stock, min }) {
    if (stock === undefined)
        return <span className="badge-gray">No data</span>;
    if (stock <= 0)
        return <span className="badge-red">Out of stock</span>;
    if (stock < min)
        return <span className="badge-yellow">{stock} (low)</span>;
    return <span className="badge-green">{stock}</span>;
}
function ProductForm({ product, categories, onClose, }) {
    const queryClient = useQueryClient();
    const isEditing = !!product;
    const [lookingUp, setLookingUp] = useState(false);
    const { register, handleSubmit, formState: { errors }, setValue } = useForm({
        resolver: zodResolver(productSchema),
        defaultValues: product ? {
            name: product.name,
            sku: product.sku,
            barcode: product.barcode || '',
            description: product.description || '',
            categoryId: product.categoryId || '',
            price: product.price,
            costPrice: product.costPrice,
            unit: product.unit,
            minStockLevel: product.minStockLevel,
        } : { unit: 'pcs', minStockLevel: 10 },
    });
    const mutation = useMutation({
        mutationFn: async (data) => {
            if (isEditing) {
                return put(`/products/${product.id}`, data);
            }
            return post('/products', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success(isEditing ? 'Product updated' : 'Product created');
            onClose();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to save product'),
    });
    return (<form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Product Name *</label>
          <input {...register('name')} className="input" placeholder="e.g. USB-C Cable 2m"/>
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="label">SKU *</label>
          <input {...register('sku')} className="input font-mono" placeholder="ELEC-011"/>
          {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku.message}</p>}
        </div>

        <div>
          <label className="label">Barcode</label>
          <div className="relative">
            <input {...register('barcode')} className="input font-mono pr-10" placeholder="Scan or type barcode…" onKeyDown={async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const barcode = e.target.value.trim();
                if (!barcode)
                    return;
                setLookingUp(true);
                try {
                    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
                    const data = await res.json();
                    if (data.status === 1 && data.product) {
                        const p = data.product;
                        const name = p.product_name || p.product_name_en || p.abbreviated_product_name || '';
                        if (name) {
                            setValue('name', name);
                            toast.success(`Found: ${name}`);
                        }
                        else {
                            toast('Product found but no name available', { icon: '⚠️' });
                        }
                    }
                    else {
                        toast('Product not found in database — please type name manually', { icon: 'ℹ️' });
                    }
                }
                catch {
                    toast.error('Could not look up barcode');
                }
                finally {
                    setLookingUp(false);
                }
            }
        }}/>
            {lookingUp ? (<Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-500 animate-spin"/>) : (<ScanLine size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>)}
          </div>
          <p className="text-xs text-gray-400 mt-1">Scan barcode and press Enter to auto-fill product name</p>
        </div>

        <div>
          <label className="label">Selling Price *</label>
          <input {...register('price', { valueAsNumber: true })} type="number" step="0.01" className="input" placeholder="0.00"/>
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
        </div>

        <div>
          <label className="label">Cost Price <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
          <input {...register('costPrice', { valueAsNumber: true })} type="number" step="0.01" className="input" placeholder="0.00 (leave blank if unknown)"/>
          <p className="text-xs text-gray-400 mt-1">If left blank, profit calculations will show GH₵0 for this product</p>
        </div>

        <div>
          <label className="label">Unit</label>
          <select {...register('unit')} className="input">
            {['pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'bag', 'can', 'bottle', 'roll', 'pair', 'set'].map(u => (<option key={u} value={u}>{u}</option>))}
          </select>
        </div>

        <div>
          <label className="label">Min Stock Level</label>
          <input {...register('minStockLevel', { valueAsNumber: true })} type="number" min="0" className="input"/>
        </div>

        <div className="col-span-2">
          <label className="label">Category</label>
          <select {...register('categoryId')} className="input">
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label className="label">Description</label>
          <textarea {...register('description')} className="input resize-none" rows={3} placeholder="Optional product description..."/>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Product'}
        </button>
      </div>
    </form>);
}
export function ProductsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'admin';
    const { data, isLoading } = useQuery({
        queryKey: ['products', page, search, categoryId],
        queryFn: () => get('/products', { page, limit: 20, search, categoryId }),
    });
    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => get('/categories'),
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => del(`/products/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Product deleted');
        },
    });
    const products = data?.data || [];
    const pagination = data?.pagination;
    const cats = categories?.data || [];
    return (<div className="animate-fade-in">
      <PageHeader title="Products" subtitle={`${pagination?.total ?? '—'} total products`} actions={isAdmin ? (<div className="flex gap-2">
            <label className="btn-secondary btn-sm cursor-pointer">
              <Upload size={13}/> Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file)
                    return;
                const fd = new FormData();
                fd.append('file', file);
                try {
                    const { default: axios } = await import('axios');
                    const token = (await import('../../store/authStore')).useAuthStore.getState().accessToken;
                    const res = await axios.post('http://localhost:4000/api/products/bulk-import', fd, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    toast.success(res.data.message);
                    queryClient.invalidateQueries({ queryKey: ['products'] });
                }
                catch (err) {
                    toast.error(err.response?.data?.message || 'Import failed');
                }
            }}/>
            </label>
            <button onClick={() => { setEditProduct(null); setShowForm(true); }} className="btn-primary btn-sm">
              <Plus size={13}/> New Product
            </button>
          </div>) : undefined}/>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9" placeholder="Search name, SKU, barcode…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}/>
        </div>
        <select className="input sm:w-48" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (<LoadingSpinner className="h-64"/>) : products.length === 0 ? (<EmptyState message="No products found" icon="product" className="h-64" action={isAdmin ? (<button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
                <Plus size={13}/> Add first product
              </button>) : undefined}/>) : (<div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Product</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">SKU</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Category</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Price</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Stock</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (<tr key={product.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/products/${product.id}`)}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <Package size={16} className="text-gray-400"/>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 leading-tight">{product.name}</p>
                          {product.barcode && <p className="text-xs text-gray-400 font-mono">{product.barcode}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-600">{product.sku}</td>
                    <td className="py-3 px-4">
                      {product.category ? (<span className="badge-blue">{product.category.name}</span>) : (<span className="text-gray-400 text-xs">—</span>)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-medium text-gray-900">GH₵{Number(product.price).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">Cost: GH₵{Number(product.costPrice).toFixed(2)}</p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StockBadge stock={product.inventory?.currentStock} min={product.minStockLevel}/>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && (<>
                            <button onClick={() => { setEditProduct(product); setShowForm(true); }} className="btn-ghost btn-sm p-1.5">
                              <Edit2 size={14}/>
                            </button>
                            <button onClick={() => {
                        if (confirm(`Delete "${product.name}"?`))
                            deleteMutation.mutate(product.id);
                    }} className="btn-ghost btn-sm p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 size={14}/>
                            </button>
                          </>)}
                        <ChevronRight size={14} className="text-gray-400 ml-1"/>
                      </div>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>)}
        {pagination && (<div className="px-4">
            <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={setPage}/>
          </div>)}
      </div>

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditProduct(null); }} title={editProduct ? 'Edit Product' : 'New Product'} size="lg">
        <ProductForm product={editProduct || undefined} categories={cats} onClose={() => { setShowForm(false); setEditProduct(null); }}/>
      </Modal>
    </div>);
}
//# sourceMappingURL=ProductsPage.js.map