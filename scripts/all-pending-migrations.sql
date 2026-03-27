-- Õpetaja Tagasiside: All pending migrations since 20260323
-- Run with: turso db shell maasiku-prod < scripts/all-pending-migrations.sql
-- Or paste into Turso dashboard SQL editor

-- === 20260326120000_add_qa_fields ===
ALTER TABLE "TestResult" ADD COLUMN "qaFeedback" TEXT;
ALTER TABLE "TestResult" ADD COLUMN "qaLog" TEXT;
ALTER TABLE "TestResult" ADD COLUMN "qaScore" REAL;
ALTER TABLE "TestResult" ADD COLUMN "qaCompletedAt" DATETIME;

-- === 20260326130000_add_feedback_patterns ===
CREATE TABLE IF NOT EXISTS "FeedbackPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dimension" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "correction" TEXT NOT NULL,
    "example" TEXT,
    "topic" TEXT,
    "grade" TEXT,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "severity" TEXT NOT NULL DEFAULT 'important',
    "active" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- === 20260326180000_add_learning_resources ===
CREATE TABLE IF NOT EXISTS "LearningResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "curriculumCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'et',
    "isFree" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT,
    "description" TEXT,
    "gradeRange" TEXT,
    "topic" TEXT,
    "quality" INTEGER NOT NULL DEFAULT 3,
    "addedBy" TEXT,
    "verified" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "LearningResource_curriculumCode_idx" ON "LearningResource"("curriculumCode");
CREATE INDEX IF NOT EXISTS "LearningResource_type_idx" ON "LearningResource"("type");
CREATE INDEX IF NOT EXISTS "LearningResource_language_idx" ON "LearningResource"("language");

-- === 20260326200000_add_test_content ===
ALTER TABLE "Test" ADD COLUMN "content" TEXT;

-- === 20260326210000_add_consent_method ===
ALTER TABLE "ConsentGrant" ADD COLUMN "consentMethod" TEXT;
ALTER TABLE "ConsentGrant" ADD COLUMN "documentUrl" TEXT;

-- === 20260326220000_add_user_feedback ===
CREATE TABLE IF NOT EXISTS "UserFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "page" TEXT,
    "screenshotUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "UserFeedback_status_idx" ON "UserFeedback"("status");
CREATE INDEX IF NOT EXISTS "UserFeedback_createdAt_idx" ON "UserFeedback"("createdAt");

-- === 20260327120000_add_user_preferences ===
ALTER TABLE "User" ADD COLUMN "preferences" TEXT;

-- === 20260327140000_add_ai_provider_config ===
CREATE TABLE IF NOT EXISTS "AIProviderConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "defaultModel" TEXT NOT NULL,
    "allowedModels" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIProviderConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "TeacherUsageLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "teacherProfileId" TEXT,
    "monthlyTokenLimit" INTEGER NOT NULL DEFAULT 500000,
    "monthlyRequestLimit" INTEGER NOT NULL DEFAULT 200,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeacherUsageLimit_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherUsageLimit_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "AIUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "teacherProfileId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIUsageLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AIProviderConfig_schoolId_provider_key" ON "AIProviderConfig"("schoolId", "provider");
CREATE INDEX IF NOT EXISTS "AIProviderConfig_schoolId_idx" ON "AIProviderConfig"("schoolId");
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherUsageLimit_schoolId_teacherProfileId_key" ON "TeacherUsageLimit"("schoolId", "teacherProfileId");
CREATE INDEX IF NOT EXISTS "TeacherUsageLimit_schoolId_idx" ON "TeacherUsageLimit"("schoolId");
CREATE INDEX IF NOT EXISTS "AIUsageLog_schoolId_teacherProfileId_createdAt_idx" ON "AIUsageLog"("schoolId", "teacherProfileId", "createdAt");
CREATE INDEX IF NOT EXISTS "AIUsageLog_createdAt_idx" ON "AIUsageLog"("createdAt");

-- === 20260327220000_add_qa_toggle ===
ALTER TABLE "AIProviderConfig" ADD COLUMN "qaEnabled" BOOLEAN NOT NULL DEFAULT true;
