export declare function useOnlineStatus(): any;
export declare function useOfflineSync(): {
    isOnline: any;
    pendingCount: number;
    isSyncing: boolean;
    lastSyncTime: Date | null;
    syncNow: () => Promise<number | undefined>;
    refreshPendingCount: () => Promise<void>;
};
//# sourceMappingURL=offlineSync.d.ts.map