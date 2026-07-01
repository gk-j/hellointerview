-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'FAILURE', 'COMPLETED');

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "status" "FileStatus" NOT NULL DEFAULT 'PENDING';
