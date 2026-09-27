/*
  Warnings:

  - You are about to drop the column `tokenNumber` on the `QueueEntry` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[doctorId,appointmentDate,tokenNumber]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "QueueEntry_appointmentId_tokenNumber_key";

-- AlterTable
ALTER TABLE "QueueEntry" DROP COLUMN "tokenNumber";

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_doctorId_appointmentDate_tokenNumber_key" ON "Appointment"("doctorId", "appointmentDate", "tokenNumber");
