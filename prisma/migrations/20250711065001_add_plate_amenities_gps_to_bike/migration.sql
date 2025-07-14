/*
  Warnings:

  - A unique constraint covering the columns `[plateNumber]` on the table `Bike` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Bike" ADD COLUMN     "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "plateNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Bike_plateNumber_key" ON "Bike"("plateNumber");
