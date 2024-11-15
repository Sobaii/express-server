/*
  Warnings:

  - Made the column `refreshToken` on table `AuthProvider` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "AuthProvider" ALTER COLUMN "refreshToken" SET NOT NULL;

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "total" SET DEFAULT '0',
ALTER COLUMN "total" SET DATA TYPE TEXT,
ALTER COLUMN "subtotal" SET DEFAULT '0',
ALTER COLUMN "subtotal" SET DATA TYPE TEXT,
ALTER COLUMN "totalTax" SET DEFAULT '0',
ALTER COLUMN "totalTax" SET DATA TYPE TEXT,
ALTER COLUMN "gratuity" SET DEFAULT '0',
ALTER COLUMN "gratuity" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");
