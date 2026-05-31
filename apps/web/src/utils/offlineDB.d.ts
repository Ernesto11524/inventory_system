interface PendingSale {
    id: string;
    data: any;
    createdAt: string;
    synced: boolean;
    syncError?: string;
}
export declare function savePendingSale(saleData: any): Promise<string>;
export declare function getUnsyncedSales(): Promise<PendingSale[]>;
export declare function markSaleSynced(id: string): Promise<void>;
export declare function markSaleFailed(id: string, error: string): Promise<void>;
export declare function countUnsyncedSales(): Promise<number>;
export declare function cleanupSyncedSales(): Promise<void>;
export {};
//# sourceMappingURL=offlineDB.d.ts.map