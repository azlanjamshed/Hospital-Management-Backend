-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_appointmentWindowId_fkey";

-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "appointmentWindowId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_appointmentWindowId_fkey" FOREIGN KEY ("appointmentWindowId") REFERENCES "AppointmentWindow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
