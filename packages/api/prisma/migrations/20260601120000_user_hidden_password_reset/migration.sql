-- AlterTable: add isHidden, passwordResetToken, passwordResetExpiry to users
ALTER TABLE "users" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "passwordResetToken" TEXT;
ALTER TABLE "users" ADD COLUMN "passwordResetExpiry" TIMESTAMP(3);

-- CreateIndex: unique constraint on passwordResetToken
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "users"("passwordResetToken");
