-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "breakingScore" DOUBLE PRECISION,
ADD COLUMN     "hasDuplicates" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isBreaking" BOOLEAN NOT NULL DEFAULT false;
