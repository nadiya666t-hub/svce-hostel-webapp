-- Overseer Watchman Portals Migration
-- Applied directly due to migration drift from manual photoUrl column addition

-- New enums
DO $$ BEGIN
  CREATE TYPE "OverseerProblemStatus" AS ENUM ('NEW','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','REJECTED','ESCALATED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PermissionStatus" AS ENUM ('PENDING','APPROVED','REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "VisitorEntryStatus" AS ENUM ('INSIDE','EXITED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Overseer profile table
CREATE TABLE IF NOT EXISTS "overseers" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "designation" TEXT NOT NULL DEFAULT 'Hostel Overseer',
  "phone"       TEXT,
  "email"       TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "userId"      TEXT NOT NULL,
  CONSTRAINT "overseers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "overseers_userId_key" UNIQUE ("userId"),
  CONSTRAINT "overseers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Watchman profile table
CREATE TABLE IF NOT EXISTS "watchmen" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "designation" TEXT NOT NULL DEFAULT 'Hostel Watchman',
  "phone"       TEXT,
  "email"       TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "userId"      TEXT NOT NULL,
  CONSTRAINT "watchmen_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "watchmen_userId_key" UNIQUE ("userId"),
  CONSTRAINT "watchmen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

-- OverseerProblem (links Problem to Overseer workflow)
CREATE TABLE IF NOT EXISTS "overseer_problems" (
  "id"               TEXT NOT NULL,
  "status"           "OverseerProblemStatus" NOT NULL DEFAULT 'NEW',
  "acknowledgedAt"   TIMESTAMP(3),
  "resolvedAt"       TIMESTAMP(3),
  "escalatedAt"      TIMESTAMP(3),
  "escalationReason" TEXT,
  "rejectedAt"       TIMESTAMP(3),
  "rejectReason"     TEXT,
  "deadlineAt"       TIMESTAMP(3) NOT NULL,
  "assignedToId"     TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  "problemId"        TEXT NOT NULL,
  CONSTRAINT "overseer_problems_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "overseer_problems_problemId_key" UNIQUE ("problemId"),
  CONSTRAINT "overseer_problems_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "overseer_problems_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "overseers"("id") ON UPDATE CASCADE ON DELETE SET NULL
);

-- OverseerProblemUpdate (audit trail)
CREATE TABLE IF NOT EXISTS "overseer_problem_updates" (
  "id"                TEXT NOT NULL,
  "status"            "OverseerProblemStatus" NOT NULL,
  "comment"           TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "overseerProblemId" TEXT NOT NULL,
  "updatedById"       TEXT,
  CONSTRAINT "overseer_problem_updates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "overseer_problem_updates_overseerProblemId_fkey" FOREIGN KEY ("overseerProblemId") REFERENCES "overseer_problems"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "overseer_problem_updates_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "overseers"("id") ON UPDATE CASCADE ON DELETE SET NULL
);

-- ProblemAttachment (photos/videos)
CREATE TABLE IF NOT EXISTS "problem_attachments" (
  "id"                TEXT NOT NULL,
  "fileUrl"           TEXT NOT NULL,
  "fileType"          TEXT NOT NULL,
  "filename"          TEXT,
  "uploadedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "overseerProblemId" TEXT NOT NULL,
  CONSTRAINT "problem_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "problem_attachments_overseerProblemId_fkey" FOREIGN KEY ("overseerProblemId") REFERENCES "overseer_problems"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Visitor
CREATE TABLE IF NOT EXISTS "visitors" (
  "id"           TEXT NOT NULL,
  "visitorName"  TEXT NOT NULL,
  "phone"        TEXT,
  "relationship" TEXT,
  "purpose"      TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- VisitorEntry
CREATE TABLE IF NOT EXISTS "visitor_entries" (
  "id"               TEXT NOT NULL,
  "entryTime"        TIMESTAMP(3) NOT NULL,
  "expectedExitTime" TIMESTAMP(3),
  "exitTime"         TIMESTAMP(3),
  "entryStatus"      "VisitorEntryStatus" NOT NULL DEFAULT 'INSIDE',
  "permissionStatus" "PermissionStatus"   NOT NULL DEFAULT 'PENDING',
  "approvedBy"       TEXT,
  "approvedAt"       TIMESTAMP(3),
  "remarks"          TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  "visitorId"        TEXT NOT NULL,
  "studentId"        TEXT NOT NULL,
  "recordedById"     TEXT,
  CONSTRAINT "visitor_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "visitor_entries_visitorId_fkey"    FOREIGN KEY ("visitorId")    REFERENCES "visitors"("id")  ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "visitor_entries_studentId_fkey"    FOREIGN KEY ("studentId")    REFERENCES "students"("id")  ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "visitor_entries_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "watchmen"("id") ON UPDATE CASCADE ON DELETE SET NULL
);

-- LateEntry
CREATE TABLE IF NOT EXISTS "late_entries" (
  "id"               TEXT NOT NULL,
  "date"             DATE NOT NULL,
  "entryTime"        TIMESTAMP(3) NOT NULL,
  "reason"           TEXT,
  "permissionStatus" "PermissionStatus" NOT NULL DEFAULT 'PENDING',
  "approvedBy"       TEXT,
  "approvedAt"       TIMESTAMP(3),
  "remarks"          TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  "studentId"        TEXT NOT NULL,
  "recordedById"     TEXT,
  CONSTRAINT "late_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "late_entries_studentId_fkey"    FOREIGN KEY ("studentId")    REFERENCES "students"("id")  ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "late_entries_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "watchmen"("id") ON UPDATE CASCADE ON DELETE SET NULL
);

-- Add photoUrl to students if not already there (handles manual drift)
ALTER TABLE students ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;

SELECT 'Migration complete' AS result;
