-- CreateTable
CREATE TABLE "Test" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT,
    "schoolId" TEXT,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "grade" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PREPARING',
    "plannedDate" DATETIME,
    "distributedDate" DATETIME,
    "collectedDate" DATETIME,
    "completedDate" DATETIME,
    "blankTestNotes" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Test_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Test_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Test_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL,
    "studentId" TEXT,
    "studentName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rawFeedback" TEXT,
    "editedFeedback" TEXT,
    "teacherNotes" TEXT,
    "teacherComment" TEXT,
    "score" REAL,
    "maxScore" REAL,
    "storageMode" TEXT NOT NULL DEFAULT 'local_only',
    "uploadedAt" DATETIME,
    "analyzedAt" DATETIME,
    "reviewedAt" DATETIME,
    "approvedAt" DATETIME,
    "sharedAt" DATETIME,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TestResult_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TestResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resultId" TEXT NOT NULL,
    "base64Data" TEXT NOT NULL,
    "storageMode" TEXT NOT NULL DEFAULT 'local_only',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "TestPhoto_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "TestResult" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingConsent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resultId" TEXT NOT NULL,
    "consentedBy" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "consentedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anonymizedAt" DATETIME,
    CONSTRAINT "TrainingConsent_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "TestResult" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnonymizedTrainingData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "consentId" TEXT NOT NULL,
    "grade" TEXT,
    "subject" TEXT,
    "score" REAL,
    "maxScore" REAL,
    "feedback" TEXT NOT NULL,
    "teacherNotes" TEXT,
    "teacherComment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnonymizedTrainingData_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "TrainingConsent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainingConsent_resultId_key" ON "TrainingConsent"("resultId");

-- CreateIndex
CREATE UNIQUE INDEX "AnonymizedTrainingData_consentId_key" ON "AnonymizedTrainingData"("consentId");
