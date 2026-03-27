-- Add QA toggle to AI provider config (school-level setting)
ALTER TABLE "AIProviderConfig" ADD COLUMN "qaEnabled" BOOLEAN NOT NULL DEFAULT true;
