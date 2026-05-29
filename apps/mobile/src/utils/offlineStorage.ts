import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('inventory.db');

export async function initOfflineDB(): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS products_cache (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS pending_entries (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      type TEXT NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `);
}

export async function cacheProducts(products: any[]): Promise<void> {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const product of products) {
      await db.runAsync(
        'INSERT OR REPLACE INTO products_cache (id, data, cached_at) VALUES (?, ?, ?)',
        [product.id, JSON.stringify(product), now],
      );
    }
  });
}

export async function getCachedProducts(): Promise<any[]> {
  const rows = await db.getAllAsync<{ data: string }>(
    'SELECT data FROM products_cache ORDER BY cached_at DESC',
  );
  return rows.map((r) => JSON.parse(r.data));
}

export async function savePendingEntry(entry: {
  id: string;
  productId: string;
  quantity: number;
  type: string;
  note?: string;
}): Promise<void> {
  await db.runAsync(
    'INSERT INTO pending_entries (id, product_id, quantity, type, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [entry.id, entry.productId, entry.quantity, entry.type, entry.note || null, Date.now()],
  );
}

export async function getPendingEntries(): Promise<any[]> {
  return db.getAllAsync<any>(
    'SELECT * FROM pending_entries WHERE synced = 0 ORDER BY created_at ASC',
  );
}

export async function markEntrySynced(id: string): Promise<void> {
  await db.runAsync('UPDATE pending_entries SET synced = 1 WHERE id = ?', [id]);
}
