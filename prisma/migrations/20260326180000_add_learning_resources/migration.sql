-- CreateTable
CREATE TABLE "LearningResource" (
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

-- CreateIndex
CREATE INDEX "LearningResource_curriculumCode_idx" ON "LearningResource"("curriculumCode");

-- CreateIndex
CREATE INDEX "LearningResource_type_idx" ON "LearningResource"("type");

-- CreateIndex
CREATE INDEX "LearningResource_language_idx" ON "LearningResource"("language");
