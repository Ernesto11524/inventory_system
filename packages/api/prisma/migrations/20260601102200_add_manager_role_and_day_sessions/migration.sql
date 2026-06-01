-- CreateEnum
CREATE TYPE "DaySessionStatus" AS ENUM ('open', 'closed');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'manager';

-- CreateTable
CREATE TABLE "day_sessions" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openedBy" TEXT NOT NULL,
    "closedBy" TEXT,
    "notes" TEXT,
    "status" "DaySessionStatus" NOT NULL DEFAULT 'open',

    CONSTRAINT "day_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "day_sessions_status_idx" ON "day_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "day_sessions_date_key" ON "day_sessions"("date");

-- AddForeignKey
ALTER TABLE "day_sessions" ADD CONSTRAINT "day_sessions_openedBy_fkey" FOREIGN KEY ("openedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_sessions" ADD CONSTRAINT "day_sessions_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
