-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Exercise" (
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Exercise_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Exercise_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Exercise" ("analyzedAt", "createdAt", "grade", "id", "rawFeedback", "sharedAt", "status", "studentId", "studentName", "studentNote", "subjectId", "teacherNote", "topic", "updatedAt") SELECT "analyzedAt", "createdAt", "grade", "id", "rawFeedback", "sharedAt", "status", "studentId", "studentName", "studentNote", "subjectId", "teacherNote", "topic", "updatedAt" FROM "Exercise";
DROP TABLE "Exercise";
ALTER TABLE "new_Exercise" RENAME TO "Exercise";
CREATE TABLE "new_ExercisePhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "base64Data" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExercisePhoto_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ExercisePhoto" ("base64Data", "caption", "exerciseId", "id", "uploadedAt") SELECT "base64Data", "caption", "exerciseId", "id", "uploadedAt" FROM "ExercisePhoto";
DROP TABLE "ExercisePhoto";
ALTER TABLE "new_ExercisePhoto" RENAME TO "ExercisePhoto";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
