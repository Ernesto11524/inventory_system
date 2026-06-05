-- AddForeignKey
ALTER TABLE "sales" ADD COLUMN "daySessionId" TEXT;
CREATE INDEX "sales_daySessionId_idx" ON "sales"("daySessionId");
ALTER TABLE "sales" ADD CONSTRAINT "sales_daySessionId_fkey" FOREIGN KEY ("daySessionId") REFERENCES "day_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
