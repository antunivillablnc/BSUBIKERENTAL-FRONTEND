/*
  Warnings:

  - You are about to drop the column `bikeName` on the `RentalHistory` table. All the data in the column will be lost.
  - You are about to drop the column `userName` on the `RentalHistory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RentalHistory" DROP COLUMN "bikeName",
DROP COLUMN "userName";
