export declare function initOfflineDB(): Promise<void>;
export declare function cacheProducts(products: any[]): Promise<void>;
export declare function getCachedProducts(): Promise<any[]>;
export declare function savePendingEntry(entry: {
    id: string;
    productId: string;
    quantity: number;
    type: string;
    note?: string;
}): Promise<void>;
export declare function getPendingEntries(): Promise<any[]>;
export declare function markEntrySynced(id: string): Promise<void>;
//# sourceMappingURL=offlineStorage.d.ts.map