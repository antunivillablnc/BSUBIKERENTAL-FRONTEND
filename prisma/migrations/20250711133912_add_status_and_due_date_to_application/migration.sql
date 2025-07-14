-- AlterTable
ALTER TABLE "BikeRentalApplication" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';
