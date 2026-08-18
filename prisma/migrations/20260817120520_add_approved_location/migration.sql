-- CreateEnum
CREATE TYPE "ApprovedLocation" AS ENUM ('HOSTEL_CAMPUS', 'COLLEGE_CAMPUS');

-- AlterTable
ALTER TABLE "attendance_windows" ADD COLUMN     "approvedLocation" "ApprovedLocation" NOT NULL DEFAULT 'HOSTEL_CAMPUS';
