-- CreateEnum
CREATE TYPE "SpecialWindowStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AttendanceStatus" ADD VALUE 'LATE_PRESENT';
ALTER TYPE "AttendanceStatus" ADD VALUE 'EXCUSED';

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "excuseReason" TEXT,
ADD COLUMN     "photoFilename" TEXT;

-- AlterTable
ALTER TABLE "attendance_windows" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "windowStatus" "SpecialWindowStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);
