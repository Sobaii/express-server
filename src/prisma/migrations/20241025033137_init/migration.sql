/*
  Warnings:

  - You are about to drop the column `vendorAddress` on the `Expense` table. All the data in the column will be lost.
  - The `total` column on the `Expense` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `subtotal` column on the `Expense` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `totalTax` column on the `Expense` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `gratuity` column on the `Expense` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "vendorAddress",
DROP COLUMN "total",
ADD COLUMN     "total" DOUBLE PRECISION DEFAULT 0,
DROP COLUMN "subtotal",
ADD COLUMN     "subtotal" DOUBLE PRECISION DEFAULT 0,
DROP COLUMN "totalTax",
ADD COLUMN     "totalTax" DOUBLE PRECISION DEFAULT 0,
DROP COLUMN "gratuity",
ADD COLUMN     "gratuity" DOUBLE PRECISION DEFAULT 0;

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
