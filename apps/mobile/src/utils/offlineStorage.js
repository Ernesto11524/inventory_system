"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initOfflineDB = initOfflineDB;
exports.cacheProducts = cacheProducts;
exports.getCachedProducts = getCachedProducts;
exports.savePendingEntry = savePendingEntry;
exports.getPendingEntries = getPendingEntries;
exports.markEntrySynced = markEntrySynced;
const SQLite = __importStar(require("expo-sqlite"));
const db = SQLite.openDatabaseSync('inventory.db');
async function initOfflineDB() {
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
async function cacheProducts(products) {
    const now = Date.now();
    await db.withTransactionAsync(async () => {
        for (const product of products) {
            await db.runAsync('INSERT OR REPLACE INTO products_cache (id, data, cached_at) VALUES (?, ?, ?)', [product.id, JSON.stringify(product), now]);
        }
    });
}
async function getCachedProducts() {
    const rows = await db.getAllAsync('SELECT data FROM products_cache ORDER BY cached_at DESC');
    return rows.map((r) => JSON.parse(r.data));
}
async function savePendingEntry(entry) {
    await db.runAsync('INSERT INTO pending_entries (id, product_id, quantity, type, note, created_at) VALUES (?, ?, ?, ?, ?, ?)', [entry.id, entry.productId, entry.quantity, entry.type, entry.note || null, Date.now()]);
}
async function getPendingEntries() {
    return db.getAllAsync('SELECT * FROM pending_entries WHERE synced = 0 ORDER BY created_at ASC');
}
async function markEntrySynced(id) {
    await db.runAsync('UPDATE pending_entries SET synced = 1 WHERE id = ?', [id]);
}
//# sourceMappingURL=offlineStorage.js.map