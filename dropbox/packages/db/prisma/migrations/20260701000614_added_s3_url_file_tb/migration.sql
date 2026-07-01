/*
  Warnings:

  - Added the required column `s3_url` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "s3_url" TEXT NOT NULL;
