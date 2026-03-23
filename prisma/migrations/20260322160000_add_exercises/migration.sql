-- CreateTable: Exercise (free-form student exercise without teacher assignment)
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT,
    "studentName" TEXT,
    "subjectId" TEXT,
    "topic" TEXT NOT NULL,
    "grade" TEXT,
    "rawFeedback" TEXT,
    "studentNote" TEXT,
    "teacherNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ANALYZING',
    "sharedAt" DATETIME,
    "analyzedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Exercise_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Exercise_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable: ExercisePhoto
CREATE TABLE "ExercisePhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "base64Data" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExercisePhoto_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Exercise_studentId_idx" ON "Exercise"("studentId");
CREATE INDEX "Exercise_status_idx" ON "Exercise"("status");
CREATE INDEX "ExercisePhoto_exerciseId_idx" ON "ExercisePhoto"("exerciseId");
