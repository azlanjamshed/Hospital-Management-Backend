-- CreateEnum
CREATE TYPE "AppointmentWindowStatus" AS ENUM ('CLOSED', 'OPEN', 'FULL');

-- CreateEnum
CREATE TYPE "DoctorAvailabilityStatus" AS ENUM (
    'AVAILABLE',
    'ON_LUNCH',
    'IN_OT',
    'IN_CONSULTATION',
    'UNAVAILABLE'
);

-- Add doctor live availability status
ALTER TABLE "Doctor"
ADD COLUMN "availabilityStatus" "DoctorAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE';

-- Remove old slot configuration
ALTER TABLE "Schedule"
DROP COLUMN "slotMinutes";

-- Create appointment window table
CREATE TABLE "AppointmentWindow" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER,
    "status" "AppointmentWindowStatus" NOT NULL DEFAULT 'CLOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentWindow_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "AppointmentWindow_organizationId_date_idx"
ON "AppointmentWindow"("organizationId", "date");

-- One appointment window per doctor per date
CREATE UNIQUE INDEX "AppointmentWindow_doctorId_date_key"
ON "AppointmentWindow"("doctorId", "date");

-- Create appointment window for existing appointment(s)
INSERT INTO "AppointmentWindow" (
    "id",
    "organizationId",
    "doctorId",
    "date",
    "startTime",
    "endTime",
    "status",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    "organizationId",
    "doctorId",
    DATE_TRUNC('day', "appointmentDate"),
    TO_CHAR("startAt", 'HH24:MI'),
    TO_CHAR("endAt", 'HH24:MI'),
    'CLOSED'::"AppointmentWindowStatus",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Appointment";

-- Add the new column as nullable temporarily
ALTER TABLE "Appointment"
ADD COLUMN "appointmentWindowId" TEXT;

-- Connect existing appointments to their corresponding window
UPDATE "Appointment" a
SET "appointmentWindowId" = aw."id"
FROM "AppointmentWindow" aw
WHERE aw."doctorId" = a."doctorId"
  AND aw."organizationId" = a."organizationId"
  AND aw."date" = DATE_TRUNC('day', a."appointmentDate");

-- Make the column required
ALTER TABLE "Appointment"
ALTER COLUMN "appointmentWindowId" SET NOT NULL;

-- Foreign keys
ALTER TABLE "AppointmentWindow"
ADD CONSTRAINT "AppointmentWindow_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "Organization"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "AppointmentWindow"
ADD CONSTRAINT "AppointmentWindow_doctorId_fkey"
FOREIGN KEY ("doctorId")
REFERENCES "Doctor"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_appointmentWindowId_fkey"
FOREIGN KEY ("appointmentWindowId")
REFERENCES "AppointmentWindow"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;