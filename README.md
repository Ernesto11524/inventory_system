# StockFlow — Cross-Platform Inventory Management System

A full-stack, production-ready inventory management system built as a Turborepo monorepo.

## Architecture

```
inventory-system/
├── apps/
│   ├── web/          # React + Vite + TypeScript + Tailwind (Vercel)
│   └── mobile/       # Expo SDK 51 + React Native + NativeWind
├── packages/
│   ├── api/          # Node.js + Express + TypeScript (Railway)
│   └── shared/       # Shared types, Zod schemas, constants
├── docker-compose.yml
└── turbo.json
```

## Tech Stack

### Backend (`packages/api`)
- **Runtime**: Node.js 20 + Express 4 + TypeScript
- **Database**: PostgreSQL 16 via Prisma ORM
- **Cache**: Upstash Redis (sessions + hot data)
- **Auth**: JWT (access + refresh tokens), bcryptjs
- **Real-time**: Socket.IO
- **Notifications**: Nodemailer (email) + Twilio (SMS)
- **Jobs**: node-cron (hourly low-stock check)
- **Uploads**: Cloudinary
- **Docs**: Swagger/OpenAPI 3.0
- **Hosting**: Railway

### Web Frontend (`apps/web`)
- **Framework**: React 18 + Vite 5 + TypeScript
- **Styling**: Tailwind CSS 3
- **State**: Zustand (auth + socket) + TanStack Query v5
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Router**: React Router v6
- **Icons**: Lucide React
- **Hosting**: Vercel

### Mobile (`apps/mobile`)
- **Framework**: Expo SDK 51 + React Native
- **Navigation**: Expo Router v3
- **Styling**: NativeWind
- **Barcode**: expo-camera (barcode scanning)
- **Offline**: Expo SQLite + React Query cache
- **Push**: Expo Notifications

### Shared (`packages/shared`)
- TypeScript interfaces and enums
- Zod validation schemas
- Constants (cache keys, rate limits, cron schedules)

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### 1. Clone and install
```bash
git clone https://github.com/yourorg/inventory-system.git
cd inventory-system
pnpm install
```

### 2. Start infrastructure
```bash
pnpm docker:up
# PostgreSQL on :5432, Redis on :6379
```

### 3. Configure environment
```bash
cp packages/api/.env.example packages/api/.env
cp apps/web/.env.example apps/web/.env
# Edit packages/api/.env with your credentials
```

### 4. Initialize database
```bash
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations
pnpm db:seed        # Seed demo data
```

### 5. Start development servers
```bash
pnpm dev
# API:  http://localhost:4000
# Web:  http://localhost:3000
# Docs: http://localhost:4000/api/docs
```

### 6. Mobile (separate terminal)
```bash
cd apps/mobile
pnpm start
# Scan QR with Expo Go app
```

---

## Demo Credentials
| Role  | Email                   | Password    |
|-------|-------------------------|-------------|
| Admin | admin@inventory.com     | Admin@1234  |
| Staff | staff@inventory.com     | Staff@1234  |

---

## Features

### 1. JWT Authentication + RBAC
- Access token (15min) + refresh token (7 days) with rotation
- Admin: full access — create/edit/delete products, manage users
- Staff: view + stock entries only, cannot delete products

### 2. Product Management
- Full CRUD with soft deletes (deletedAt)
- Cloudinary image upload + optimization
- Category assignment, barcode, SKU, min stock threshold
- Bulk CSV import with header mapping

### 3. Immutable Stock Ledger
- Every change = new StockEntry record (never edited)
- Types: `restock` | `sale` | `adjustment` | `return`
- Inventory table materialized from SUM of entries
- Socket.IO pushes real-time updates to all clients

### 4. Mobile Barcode Scanner
- expo-camera with multi-format barcode support (EAN-13, QR, Code128, etc.)
- Scan → lookup product → quick stock-in or stock-out
- Works offline: saves pending entries to SQLite, syncs on reconnect

### 5. Automated Alerts
- Hourly cron job checks all inventory
- Creates Alert record for low/out-of-stock
- Sends email via Nodemailer + SMS via Twilio
- Mobile push via Expo Notifications
- Socket.IO real-time broadcast to web clients

### 6. Supplier + Purchase Order Management
- Full supplier CRUD with contact info
- PO lifecycle: `draft` → `sent` → `received`
- On "received": auto-generates restock StockEntry for each line item
- Auto-resolves related low-stock alerts

### 7. Dashboard + Charts (Recharts)
- Metric cards: total products, stock value, low stock count, out-of-stock
- 30-day stock movement line chart (inbound/outbound/net)
- Top 10 products by value bar chart (horizontal)
- Category breakdown donut chart
- Recent activity feed (live via Socket.IO)

### 8. Reports + Export
- Stock value report (cost vs retail)
- Stock movement history with date-range filtering
- CSV export for both report types

---

## API Reference

Full documentation at `/api/docs` (Swagger UI).

### Base URL: `/api`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login → access + refresh tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate refresh token |
| GET | `/products` | List products (paginated, filterable) |
| GET | `/products/barcode/:barcode` | Lookup by barcode |
| POST | `/products` | Create product (admin) |
| PUT | `/products/:id` | Update product (admin) |
| DELETE | `/products/:id` | Soft-delete (admin) |
| POST | `/products/bulk-import` | CSV import (admin) |
| GET/POST | `/categories` | Categories |
| POST | `/stock/entry` | Record stock entry |
| GET | `/stock/history/:productId` | Entry history |
| GET | `/inventory` | All stock levels |
| GET | `/inventory/low-stock` | Below minimum |
| GET | `/alerts` | List alerts |
| PATCH | `/alerts/:id/resolve` | Resolve alert |
| GET/POST | `/suppliers` | Suppliers |
| GET/POST | `/purchase-orders` | Purchase orders |
| PATCH | `/purchase-orders/:id/status` | Advance PO status |
| GET | `/reports/stock-value` | Stock value report |
| GET | `/reports/movement` | Movement history |
| GET | `/reports/export/csv` | CSV export |

---

## Deployment

### Backend → Railway
1. Connect Railway to your GitHub repo
2. Set environment variables from `.env.example`
3. Railway auto-detects `Dockerfile` and deploys

### Web → Vercel
1. Import project in Vercel dashboard
2. Set `VITE_API_URL` and `VITE_WS_URL` env vars
3. Deploy automatically on push to main

### Mobile → EAS Build
```bash
cd apps/mobile
eas build --platform all
```

---

## Non-Functional Guarantees
- **Soft deletes**: products use `deletedAt`, never hard-deleted
- **Immutable ledger**: stock entries only have `INSERT`, never `UPDATE` or `DELETE`
- **Pagination**: all list endpoints default 20/page, max 100
- **Rate limiting**: auth endpoints: 10 requests per 15 minutes
- **Input sanitization**: Zod validation on all POST/PUT endpoints
- **Offline support**: mobile app caches products in SQLite, queues entries
