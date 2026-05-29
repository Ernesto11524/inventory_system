-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "storeName" TEXT NOT NULL DEFAULT 'StockFlow',
    "storeTagline" TEXT NOT NULL DEFAULT 'Inventory System',
    "storeLogo" TEXT,
    "storeEmail" TEXT,
    "storePhone" TEXT,
    "storeAddress" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "currencySymbol" TEXT NOT NULL DEFAULT 'GH₵',
    "paystackPublicKey" TEXT,
    "paystackSecretKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);
