// Offline storage using IndexedDB
// Data survives browser close, computer restart, and power cuts

const DB_NAME = 'stockflow-offline';
const DB_VERSION = 1;

interface PendingSale {
  id: string;
  data: any;
  createdAt: string;
  synced: boolean;
  syncError?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Pending sales store
      if (!db.objectStoreNames.contains('pending_sales')) {
        const store = db.createObjectStore('pending_sales', { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save a sale to IndexedDB when offline
export async function savePendingSale(saleData: any): Promise<string> {
  const db = await openDB();
  const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const pending: PendingSale = {
    id,
    data: saleData,
    createdAt: new Date().toISOString(),
    synced: false,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_sales', 'readwrite');
    const store = tx.objectStore('pending_sales');
    const request = store.add(pending);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

// Get all unsynced sales
export async function getUnsyncedSales(): Promise<PendingSale[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_sales', 'readonly');
    const store = tx.objectStore('pending_sales');
    const index = store.index('synced');
    const request = index.getAll(false as unknown as IDBValidKey); // false = not synced
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Mark a sale as synced
export async function markSaleSynced(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_sales', 'readwrite');
    const store = tx.objectStore('pending_sales');
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record = getReq.result;
      if (record) {
        record.synced = true;
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// Mark a sale as failed with error
export async function markSaleFailed(id: string, error: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_sales', 'readwrite');
    const store = tx.objectStore('pending_sales');
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record = getReq.result;
      if (record) {
        record.syncError = error;
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// Count unsynced sales
export async function countUnsyncedSales(): Promise<number> {
  const sales = await getUnsyncedSales();
  return sales.length;
}

// Delete old synced sales (cleanup)
export async function cleanupSyncedSales(): Promise<void> {
  const db = await openDB();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_sales', 'readwrite');
    const store = tx.objectStore('pending_sales');
    const request = store.getAll();

    request.onsuccess = () => {
      const records: PendingSale[] = request.result || [];
      const toDelete = records.filter(r => r.synced && r.createdAt < cutoff);
      toDelete.forEach(r => store.delete(r.id));
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}
