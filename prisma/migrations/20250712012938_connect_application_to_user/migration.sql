/*
  Warnings:

  - Added the required column `userId` to the `BikeRentalApplication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BikeRentalApplication" ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "BikeRentalApplication" ADD CONSTRAINT "BikeRentalApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
