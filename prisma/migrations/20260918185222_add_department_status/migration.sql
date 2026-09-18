-- CreateEnum
CREATE TYPE "DepartmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "status" "DepartmentStatus" NOT NULL DEFAULT 'ACTIVE';
