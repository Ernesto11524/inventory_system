export type UserRole = 'admin' | 'staff';
export type StockEntryType = 'restock' | 'sale' | 'adjustment' | 'return';
export type PurchaseOrderStatus = 'draft' | 'sent' | 'received';
export type AlertType = 'low_stock' | 'out_of_stock';
export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
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
export interface Category {
    id: string;
    name: string;
    description: string | null;
    _count?: {
        products: number;
    };
}
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
export interface Supplier {
    id: string;
    name: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
}
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
export interface Alert {
    id: string;
    productId: string;
    product?: Pick<Product, 'id' | 'name' | 'sku'>;
    type: AlertType;
    message: string;
    resolved: boolean;
    createdAt: string;
}
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
    'alert:resolved': {
        alertId: string;
    };
    'inventory:refresh': void;
};
//# sourceMappingURL=index.d.ts.map