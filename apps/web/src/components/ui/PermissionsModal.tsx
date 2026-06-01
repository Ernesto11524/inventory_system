import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Toggle2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { get, patch } from '../../utils/api';
import type { UserPermissions } from '@inventory/shared';

interface PermissionsModalProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PermissionsModal({ userId, userName, isOpen, onClose, onSuccess }: PermissionsModalProps) {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);

  const { data } = useQuery({
    queryKey: ['permissions', userId],
    queryFn: () => get<{ user: any; permissions: UserPermissions }>(`/permissions/${userId}`),
    enabled: isOpen,
  });

  useEffect(() => {
    if (data?.data?.permissions) {
      setPermissions(data.data.permissions);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => patch(`/permissions/${userId}`, { permissions }),
    onSuccess: () => {
      toast.success(`Permissions updated for ${userName}`);
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update permissions'),
  });

  if (!isOpen || !permissions) return null;

  const toggle = (path: string[], value: boolean) => {
    const newPerms = JSON.parse(JSON.stringify(permissions));
    let obj = newPerms;
    for (let i = 0; i < path.length - 1; i++) {
      obj = obj[path[i]];
    }
    obj[path[path.length - 1]] = value;
    setPermissions(newPerms);
  };

  const PermissionToggle = ({ label, path, checked }: { label: string; path: string[]; checked: boolean }) => (
    <div className="flex items-center justify-between py-2.5 px-3 hover:bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        onClick={() => toggle(path, !checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-brand-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{userName}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage permissions</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Permissions */}
        <div className="p-5 space-y-6">
          {/* Sales */}
          <div>
            <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-600" />
              Sales & POS
            </h3>
            <div className="space-y-1 ml-4">
              <PermissionToggle label="Make Sales" path={['sales', 'makeSales']} checked={permissions.sales.makeSales} />
              <PermissionToggle label="View Own Sales" path={['sales', 'viewOwnSales']} checked={permissions.sales.viewOwnSales} />
              <PermissionToggle label="View All Reports" path={['sales', 'viewAllReports']} checked={permissions.sales.viewAllReports} />
            </div>
          </div>

          {/* Inventory */}
          <div>
            <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              Inventory & Stock
            </h3>
            <div className="space-y-1 ml-4">
              <PermissionToggle label="Add Stock" path={['inventory', 'addStock']} checked={permissions.inventory.addStock} />
              <PermissionToggle label="Remove Stock" path={['inventory', 'removeStock']} checked={permissions.inventory.removeStock} />
              <PermissionToggle label="View Inventory" path={['inventory', 'viewInventory']} checked={permissions.inventory.viewInventory} />
            </div>
          </div>

          {/* Day Sessions */}
          <div>
            <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              Day Sessions
            </h3>
            <div className="space-y-1 ml-4">
              <PermissionToggle label="Open/Close Day" path={['daySessions', 'openClose']} checked={permissions.daySessions.openClose} />
              <PermissionToggle label="View Sessions" path={['daySessions', 'viewSessions']} checked={permissions.daySessions.viewSessions} />
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-600" />
              Products
            </h3>
            <div className="space-y-1 ml-4">
              <PermissionToggle label="Create Products" path={['products', 'create']} checked={permissions.products.create} />
              <PermissionToggle label="Edit Products" path={['products', 'edit']} checked={permissions.products.edit} />
              <PermissionToggle label="Delete Products" path={['products', 'delete']} checked={permissions.products.delete} />
              <PermissionToggle label="View Products" path={['products', 'view']} checked={permissions.products.view} />
            </div>
          </div>

          {/* Monitoring */}
          <div>
            <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Monitoring & Reports
            </h3>
            <div className="space-y-1 ml-4">
              <PermissionToggle label="View Worker Activity" path={['monitoring', 'viewWorkerActivity']} checked={permissions.monitoring.viewWorkerActivity} />
              <PermissionToggle label="View Sales Reports" path={['monitoring', 'viewSalesReports']} checked={permissions.monitoring.viewSalesReports} />
            </div>
          </div>

          {/* User Management */}
          <div>
            <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              User Management
            </h3>
            <div className="space-y-1 ml-4">
              <PermissionToggle label="Manage Other Users" path={['users', 'manageOthers']} checked={permissions.users.manageOthers} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn-primary btn-sm"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
