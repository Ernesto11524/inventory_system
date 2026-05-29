import { PrismaClient, Role, StockEntryType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Users ─────────────────────────────────────────────────────────────────

  const adminPassword = await bcrypt.hash('Admin@1234', 12);
  const staffPassword = await bcrypt.hash('Staff@1234', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@inventory.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@inventory.com',
      password: adminPassword,
      role: Role.admin,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@inventory.com' },
    update: {},
    create: {
      name: 'Store Staff',
      email: 'staff@inventory.com',
      password: staffPassword,
      role: Role.staff,
    },
  });

  console.log('✅ Users created');

  // ─── Categories ────────────────────────────────────────────────────────────

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Electronics' },
      update: {},
      create: { name: 'Electronics', description: 'Electronic devices and accessories' },
    }),
    prisma.category.upsert({
      where: { name: 'Clothing' },
      update: {},
      create: { name: 'Clothing', description: 'Apparel and fashion items' },
    }),
    prisma.category.upsert({
      where: { name: 'Food & Beverage' },
      update: {},
      create: { name: 'Food & Beverage', description: 'Food products and drinks' },
    }),
    prisma.category.upsert({
      where: { name: 'Office Supplies' },
      update: {},
      create: { name: 'Office Supplies', description: 'Stationery and office equipment' },
    }),
    prisma.category.upsert({
      where: { name: 'Home & Garden' },
      update: {},
      create: { name: 'Home & Garden', description: 'Household and garden items' },
    }),
  ]);

  console.log('✅ Categories created');

  // ─── Products ──────────────────────────────────────────────────────────────

  const productData = [
    { name: 'USB-C Charging Cable 2m', sku: 'ELEC-001', barcode: '8901234567890', categoryId: categories[0].id, price: 24.99, costPrice: 8.50, unit: 'pcs', minStockLevel: 20 },
    { name: 'Wireless Bluetooth Earbuds', sku: 'ELEC-002', barcode: '8901234567891', categoryId: categories[0].id, price: 89.99, costPrice: 35.00, unit: 'pcs', minStockLevel: 15 },
    { name: 'Laptop Stand Adjustable', sku: 'ELEC-003', barcode: '8901234567892', categoryId: categories[0].id, price: 49.99, costPrice: 18.00, unit: 'pcs', minStockLevel: 10 },
    { name: 'Men\'s Cotton T-Shirt L', sku: 'CLTH-001', barcode: '8901234567893', categoryId: categories[1].id, price: 19.99, costPrice: 6.00, unit: 'pcs', minStockLevel: 30 },
    { name: 'Women\'s Running Shoes 38', sku: 'CLTH-002', barcode: '8901234567894', categoryId: categories[1].id, price: 79.99, costPrice: 28.00, unit: 'pcs', minStockLevel: 12 },
    { name: 'Organic Coffee Beans 500g', sku: 'FB-001', barcode: '8901234567895', categoryId: categories[2].id, price: 14.99, costPrice: 7.00, unit: 'bag', minStockLevel: 25 },
    { name: 'Sparkling Water 330ml', sku: 'FB-002', barcode: '8901234567896', categoryId: categories[2].id, price: 1.50, costPrice: 0.50, unit: 'can', minStockLevel: 50 },
    { name: 'A4 Paper Ream 500 Sheets', sku: 'OFF-001', barcode: '8901234567897', categoryId: categories[3].id, price: 8.99, costPrice: 4.50, unit: 'pack', minStockLevel: 20 },
    { name: 'Ballpoint Pen Blue 12-Pack', sku: 'OFF-002', barcode: '8901234567898', categoryId: categories[3].id, price: 5.99, costPrice: 2.00, unit: 'pack', minStockLevel: 25 },
    { name: 'Ceramic Plant Pot 20cm', sku: 'HG-001', barcode: '8901234567899', categoryId: categories[4].id, price: 12.99, costPrice: 4.50, unit: 'pcs', minStockLevel: 15 },
  ];

  const products = [];
  for (const data of productData) {
    const product = await prisma.product.upsert({
      where: { sku: data.sku },
      update: {},
      create: data,
    });
    products.push(product);
  }

  console.log('✅ Products created');

  // ─── Initial Stock Entries ─────────────────────────────────────────────────

  const stockAmounts = [45, 8, 23, 62, 5, 30, 120, 18, 40, 9];

  for (let i = 0; i < products.length; i++) {
    const existing = await prisma.stockEntry.findFirst({
      where: { productId: products[i].id, type: 'restock' },
    });

    if (!existing) {
      await prisma.stockEntry.create({
        data: {
          productId: products[i].id,
          quantity: stockAmounts[i],
          type: StockEntryType.restock,
          note: 'Initial stock entry',
          performedBy: admin.id,
        },
      });

      await prisma.inventory.upsert({
        where: { productId: products[i].id },
        update: { currentStock: { increment: stockAmounts[i] } },
        create: { productId: products[i].id, currentStock: stockAmounts[i] },
      });
    }
  }

  console.log('✅ Stock entries created');

  // ─── Suppliers ─────────────────────────────────────────────────────────────

  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { id: 'supplier-1' },
      update: {},
      create: {
        id: 'supplier-1',
        name: 'TechDistrib Ltd.',
        contactName: 'John Smith',
        email: 'john@techdistrib.com',
        phone: '+1-555-0101',
        address: '123 Industrial Ave, Tech Park, CA 90210',
      },
    }),
    prisma.supplier.upsert({
      where: { id: 'supplier-2' },
      update: {},
      create: {
        id: 'supplier-2',
        name: 'Fashion Forward Supply',
        contactName: 'Maria Garcia',
        email: 'maria@fashionforward.com',
        phone: '+1-555-0202',
        address: '456 Garment District, NY 10001',
      },
    }),
  ]);

  console.log('✅ Suppliers created');

  console.log('\n🎉 Seed complete!');
  console.log('─────────────────────────────────');
  console.log('Admin: admin@inventory.com / Admin@1234');
  console.log('Staff: staff@inventory.com / Staff@1234');
  console.log('─────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
