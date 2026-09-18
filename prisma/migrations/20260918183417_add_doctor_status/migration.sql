-- CreateEnum
CREATE TYPE "DoctorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "status" "DoctorStatus" NOT NULL DEFAULT 'ACTIVE';
