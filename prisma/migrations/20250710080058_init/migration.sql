-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "passwordResetToken" TEXT,
    "passwordResetExpiry" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bike" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BikeRentalApplication" (
    "id" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "srCode" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "collegeProgram" TEXT NOT NULL,
    "gwaLastSemester" TEXT NOT NULL,
    "extracurricularActivities" TEXT,
    "houseNo" TEXT NOT NULL,
    "streetName" TEXT NOT NULL,
    "barangay" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "distanceFromCampus" TEXT NOT NULL,
    "familyIncome" TEXT NOT NULL,
    "intendedDuration" TEXT NOT NULL,
    "intendedDurationOther" TEXT,
    "bikeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BikeRentalApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "BikeRentalApplication" ADD CONSTRAINT "BikeRentalApplication_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE SET NULL ON UPDATE CASCADE;
