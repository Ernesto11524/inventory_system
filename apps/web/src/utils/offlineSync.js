import { useState, useEffect, useCallback } from 'react';
import { post } from './api';
import { getUnsyncedSales, markSaleSynced, markSaleFailed, countUnsyncedSales, cleanupSyncedSales, } from './offlineDB';
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    return isOnline;
}
export function useOfflineSync() {
    const isOnline = useOnlineStatus();
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    // Check pending count
    const refreshPendingCount = useCallback(async () => {
        const count = await countUnsyncedSales();
        setPendingCount(count);
    }, []);
    // Sync all pending sales
    const syncPendingSales = useCallback(async () => {
        if (!isOnline || isSyncing)
            return;
        const pending = await getUnsyncedSales();
        if (pending.length === 0)
            return;
        setIsSyncing(true);
        let syncedCount = 0;
        for (const sale of pending) {
            try {
                await post('/sales', sale.data);
                await markSaleSynced(sale.id);
                syncedCount++;
            }
            catch (err) {
                const errorMsg = err.response?.data?.message || err.message || 'Sync failed';
                await markSaleFailed(sale.id, errorMsg);
                console.error(`Failed to sync sale ${sale.id}:`, errorMsg);
            }
        }
        await refreshPendingCount();
        await cleanupSyncedSales();
        setIsSyncing(false);
        if (syncedCount > 0) {
            setLastSyncTime(new Date());
        }
        return syncedCount;
    }, [isOnline, isSyncing, refreshPendingCount]);
    // Auto-sync when coming back online
    useEffect(() => {
        if (isOnline) {
            syncPendingSales();
        }
    }, [isOnline]);
    // Check pending count on mount and periodically
    useEffect(() => {
        refreshPendingCount();
        const interval = setInterval(refreshPendingCount, 30000);
        return () => clearInterval(interval);
    }, [refreshPendingCount]);
    return {
        isOnline,
        pendingCount,
        isSyncing,
        lastSyncTime,
        syncNow: syncPendingSales,
        refreshPendingCount,
    };
}
//# sourceMappingURL=offlineSync.js.map