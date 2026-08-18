-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'WARDEN', 'OVERSEER', 'WATCHMAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('GOING_HOME', 'OUTING', 'LEAVE', 'EMERGENCY_LEAVE', 'OTHER');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProblemCategory" AS ENUM ('NO_WATER', 'ELECTRICITY', 'CLEANING', 'PLUMBING', 'FURNITURE', 'WIFI', 'OTHER');

-- CreateEnum
CREATE TYPE "ProblemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "NoticePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ATTENDANCE_UPDATED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'PROBLEM_STATUS_CHANGED', 'FEE_REMINDER', 'IMPORTANT_NOTICE');

-- CreateEnum
CREATE TYPE "EntryExitStatus" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'SPECIAL');

-- CreateEnum
CREATE TYPE "LocationVerification" AS ENUM ('VERIFIED', 'UNVERIFIED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "usn" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" TEXT NOT NULL,
    "floorNumber" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "isOccupied" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "floorId" TEXT NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_academic_history" (
    "id" TEXT NOT NULL,
    "yearLabel" TEXT NOT NULL,
    "semesterLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,

    CONSTRAINT "student_academic_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_settings" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_windows" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "isSpecial" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "locationType" "LocationVerification" NOT NULL DEFAULT 'UNVERIFIED',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "distanceFromHostel" DOUBLE PRECISION,
    "photoUrl" TEXT,
    "isSpecialWindow" BOOLEAN NOT NULL DEFAULT false,
    "specialWindowReason" TEXT,
    "studentId" TEXT NOT NULL,
    "attendanceWindowId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "destination" TEXT,
    "additionalDetails" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problems" (
    "id" TEXT NOT NULL,
    "category" "ProblemCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrl" TEXT,
    "roomNumber" TEXT NOT NULL,
    "status" "ProblemStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolveNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fees" (
    "id" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,

    CONSTRAINT "fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_payments" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'SUCCESS',
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feeId" TEXT NOT NULL,

    CONSTRAINT "fee_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notices" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "priority" "NoticePriority" NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "academicYearId" TEXT,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entry_exit_records" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "entryTime" TIMESTAMP(3),
    "exitTime" TIMESTAMP(3),
    "status" "EntryExitStatus" NOT NULL DEFAULT 'OUT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "entry_exit_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_usn_key" ON "users"("usn");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_label_key" ON "academic_years"("label");

-- CreateIndex
CREATE UNIQUE INDEX "floors_floorNumber_key" ON "floors"("floorNumber");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_floorId_roomNumber_key" ON "rooms"("floorId", "roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_userId_key" ON "students"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "student_academic_history_studentId_academicYearId_key" ON "student_academic_history"("studentId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_studentId_date_key" ON "attendance"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "fees_studentId_academicYearId_key" ON "fees"("studentId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "fee_payments_reference_key" ON "fee_payments"("reference");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_academic_history" ADD CONSTRAINT "student_academic_history_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_academic_history" ADD CONSTRAINT "student_academic_history_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_windows" ADD CONSTRAINT "attendance_windows_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_attendanceWindowId_fkey" FOREIGN KEY ("attendanceWindowId") REFERENCES "attendance_windows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fees" ADD CONSTRAINT "fees_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fees" ADD CONSTRAINT "fees_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "fees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_exit_records" ADD CONSTRAINT "entry_exit_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
