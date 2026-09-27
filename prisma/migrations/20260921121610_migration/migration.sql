-- DropIndex
DROP INDEX "AppointmentWindow_doctorId_date_key";

-- CreateIndex
CREATE INDEX "AppointmentWindow_doctorId_date_idx" ON "AppointmentWindow"("doctorId", "date");
