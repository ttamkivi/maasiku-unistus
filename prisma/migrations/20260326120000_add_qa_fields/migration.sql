-- Add QA validation fields to TestResult
ALTER TABLE "TestResult" ADD COLUMN "qaFeedback" TEXT;
ALTER TABLE "TestResult" ADD COLUMN "qaLog" TEXT;
ALTER TABLE "TestResult" ADD COLUMN "qaScore" REAL;
ALTER TABLE "TestResult" ADD COLUMN "qaCompletedAt" DATETIME;
