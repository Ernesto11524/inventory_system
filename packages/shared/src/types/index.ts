// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'manager' | 'staff';

export type StockEntryType = 'restock' | 'sale' | 'adjustment' | 'return';

export type PurchaseOrderStatus = 'draft' | 'sent' | 'received';

export type AlertType = 'low_stock' | 'out_of_stock';

// ─── Permissions ──────────────────────────────────────────────────────────────

export interface UserPermissions {
  sales: {
    makeSales: boolean;
    viewOwnSales: boolean;
    viewAllReports: boolean;
    viewFullSalesHistory: boolean;
  };
  inventory: {
    addStock: boolean;
    removeStock: boolean;
    viewInventory: boolean;
  };
  daySessions: {
    openClose: boolean;
    viewSessions: boolean;
  };
  products: {
    create: boolean;
    edit: boolean;
    delete: boolean;
    view: boolean;
  };
  monitoring: {
    viewWorkerActivity: boolean;
    viewSalesReports: boolean;
  };
  users: {
    manageOthers: boolean;
  };
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions?: UserPermissions;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description: string | null;
  _count?: { products: number };
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  category?: Category;
  price: number;
  costPrice: number;
  unit: string;
  minStockLevel: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  inventory?: Inventory;
}

// ─── Stock ────────────────────────────────────────────────────────────────────

export interface StockEntry {
  id: string;
  productId: string;
  product?: Pick<Product, 'id' | 'name' | 'sku'>;
  quantity: number;
  type: StockEntryType;
  note: string | null;
  performedBy: string;
  performedByUser?: Pick<User, 'id' | 'name'>;
  createdAt: string;
}

export interface Inventory {
  id: string;
  productId: string;
  product?: Product;
  currentStock: number;
  lastUpdated: string;
}

// ─── Supplier ─────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

// ─── Purchase Order ───────────────────────────────────────────────────────────

export interface POItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  product?: Pick<Product, 'id' | 'name' | 'sku' | 'unit'>;
  quantity: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplier?: Supplier;
  status: PurchaseOrderStatus;
  createdAt: string;
  items: POItem[];
  totalCost?: number;
}

// ─── Alert ────────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  productId: string;
  product?: Pick<Product, 'id' | 'name' | 'sku'>;
  type: AlertType;
  message: string;
  resolved: boolean;
  createdAt: string;
}

// ─── Day Session ─────────────────────────────────────────────────────────────

export type DaySessionStatus = 'open' | 'closed';

export interface DaySession {
  id: string;
  date: string;
  openedAt: string;
  closedAt: string | null;
  openedBy: string;
  opener?: Pick<User, 'id' | 'name'>;
  closedBy: string | null;
  closer?: Pick<User, 'id' | 'name'> | null;
  notes: string | null;
  status: DaySessionStatus;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
  pagination?: PaginationMeta;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface StockMovementPoint {
  date: string;
  inbound: number;
  outbound: number;
  net: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  stockValue: number;
  currentStock: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  value: number;
}

export interface RecentActivity {
  id: string;
  type: StockEntryType;
  productName: string;
  quantity: number;
  performedBy: string;
  createdAt: string;
}

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface StockUpdatePayload {
  productId: string;
  productName: string;
  currentStock: number;
  change: number;
  type: StockEntryType;
}

export interface AlertPayload {
  alertId: string;
  productId: string;
  productName: string;
  type: AlertType;
  currentStock: number;
  minStockLevel: number;
}

export type SocketEvents = {
  'stock:updated': StockUpdatePayload;
  'alert:created': AlertPayload;
  'alert:resolved': { alertId: string };
  'inventory:refresh': void;
};
