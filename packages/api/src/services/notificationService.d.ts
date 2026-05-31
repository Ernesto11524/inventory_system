import { Product } from '@inventory/shared';
export declare function sendLowStockEmail(product: Pick<Product, 'name' | 'sku'>, currentStock: number, minStockLevel: number, alertType: 'low_stock' | 'out_of_stock'): Promise<void>;
export declare function sendLowStockSMS(product: Pick<Product, 'name' | 'sku'>, currentStock: number, alertType: 'low_stock' | 'out_of_stock'): Promise<void>;
//# sourceMappingURL=notificationService.d.ts.map