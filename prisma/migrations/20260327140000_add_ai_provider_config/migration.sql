-- CreateTable: AI provider configuration per school
CREATE TABLE "AIProviderConfig" (
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

-- CreateTable: Per-teacher monthly usage limits
CREATE TABLE "TeacherUsageLimit" (
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

-- CreateTable: AI API call usage tracking
CREATE TABLE "AIUsageLog" (
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

-- CreateIndex
CREATE UNIQUE INDEX "AIProviderConfig_schoolId_provider_key" ON "AIProviderConfig"("schoolId", "provider");
CREATE INDEX "AIProviderConfig_schoolId_idx" ON "AIProviderConfig"("schoolId");
CREATE UNIQUE INDEX "TeacherUsageLimit_schoolId_teacherProfileId_key" ON "TeacherUsageLimit"("schoolId", "teacherProfileId");
CREATE INDEX "TeacherUsageLimit_schoolId_idx" ON "TeacherUsageLimit"("schoolId");
CREATE INDEX "AIUsageLog_schoolId_teacherProfileId_createdAt_idx" ON "AIUsageLog"("schoolId", "teacherProfileId", "createdAt");
CREATE INDEX "AIUsageLog_createdAt_idx" ON "AIUsageLog"("createdAt");
