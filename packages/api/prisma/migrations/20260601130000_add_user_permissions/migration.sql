-- AlterTable: add permissions JSON field to users
ALTER TABLE "users" ADD COLUMN "permissions" JSONB NOT NULL DEFAULT '{"sales":{"makeSales":true,"viewOwnSales":true,"viewAllReports":false},"inventory":{"addStock":false,"removeStock":false,"viewInventory":true},"daySessions":{"openClose":false,"viewSessions":true},"products":{"create":false,"edit":false,"delete":false,"view":true},"monitoring":{"viewWorkerActivity":false,"viewSalesReports":false},"users":{"manageOthers":false}}';

-- Record in prisma migrations table
INSERT INTO "_prisma_migrations" (id, checksum, started_at, finished_at, migration_name, applied_steps_count)
VALUES (
  gen_random_uuid()::text,
  'manual',
  NOW(), NOW(),
  '20260601130000_add_user_permissions',
  1
) ON CONFLICT DO NOTHING;
