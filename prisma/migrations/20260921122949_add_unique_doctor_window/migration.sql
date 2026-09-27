/*
  Warnings:

  - A unique constraint covering the columns `[doctorId,date]` on the table `AppointmentWindow` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "AppointmentWindow_doctorId_date_idx";

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentWindow_doctorId_date_key" ON "AppointmentWindow"("doctorId", "date");
