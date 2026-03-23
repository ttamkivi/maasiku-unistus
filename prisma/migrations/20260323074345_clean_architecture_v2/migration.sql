/*
  Warnings:

  - You are about to drop the `Analysis` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExercisePhoto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KlassijuhatajProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ParentConsent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ParentConsentRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentEligibility` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentKlassijuhataj` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubjectConsent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubmissionPhoto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TestPhoto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `class` on the `StudentProfile` table. All the data in the column will be lost.
  - You are about to drop the column `grade` on the `StudentProfile` table. All the data in the column will be lost.
  - You are about to drop the column `resultId` on the `TrainingConsent` table. All the data in the column will be lost.
  - You are about to drop the column `isSuperAdmin` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "KlassijuhatajProfile_userId_key";

-- DropIndex
DROP INDEX "ParentConsentRequest_inviteToken_key";

-- DropIndex
DROP INDEX "StudentEligibility_studentKlassijuhatajId_key";

-- DropIndex
DROP INDEX "StudentKlassijuhataj_studentId_key";

-- AlterTable
ALTER TABLE "AssignmentSubmission" ADD COLUMN "editedFeedback" TEXT;
ALTER TABLE "AssignmentSubmission" ADD COLUMN "reviewedAt" DATETIME;

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN "editedFeedback" TEXT;
ALTER TABLE "Exercise" ADD COLUMN "reviewedAt" DATETIME;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Analysis";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ExercisePhoto";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "KlassijuhatajProfile";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ParentConsent";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ParentConsentRequest";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "StudentEligibility";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "StudentKlassijuhataj";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SubjectConsent";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SubmissionPhoto";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TestPhoto";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT,
    "label" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchoolClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "homroomTeacherId" TEXT,
    CONSTRAINT "SchoolClass_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SchoolClass_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SchoolClass_homroomTeacherId_fkey" FOREIGN KEY ("homroomTeacherId") REFERENCES "TeacherProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestedById" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentProfileId" TEXT,
    "parentEmail" TEXT NOT NULL,
    "parentName" TEXT,
    "inviteToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "respondedAt" DATETIME,
    "declineReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "ConsentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "TeacherProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ConsentRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ConsentRequest_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "ParentProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsentGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT,
    "subjectId" TEXT,
    "academicYearId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'SPECIFIC_SUBJECT',
    "duration" TEXT NOT NULL DEFAULT 'INFINITE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "revokedAt" DATETIME,
    "revokedBy" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConsentGrant_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ConsentRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ConsentGrant_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ConsentGrant_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConsentGrant_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ConsentGrant_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testResultId" TEXT,
    "submissionId" TEXT,
    "exerciseId" TEXT,
    "base64Data" TEXT,
    "storageKey" TEXT,
    "caption" TEXT,
    "storageMode" TEXT NOT NULL DEFAULT 'local_only',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "WorkPhoto_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "TestResult" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkPhoto_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkPhoto_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScanBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "primaryTestId" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "filename" TEXT,
    "pageCount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMsg" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanBatch_primaryTestId_fkey" FOREIGN KEY ("primaryTestId") REFERENCES "Test" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScanBatch_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "TeacherProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScanBatchTestLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "confidence" REAL,
    "pageRange" TEXT,
    "isManuallyConfirmed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ScanBatchTestLink_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ScanBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScanBatchTestLink_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScanBatchPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "resultId" TEXT,
    "pageIndex" INTEGER NOT NULL,
    "storageKey" TEXT,
    CONSTRAINT "ScanBatchPage_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ScanBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScanBatchPage_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "TestResult" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestAccessGrant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL,
    "granteeId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    CONSTRAINT "TestAccessGrant_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestAccessGrant_granteeId_fkey" FOREIGN KEY ("granteeId") REFERENCES "TeacherProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TestAccessGrant_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "TeacherProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestCurriculumLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL,
    "curriculumCode" TEXT NOT NULL,
    "topicLabel" TEXT,
    "gradeRange" TEXT,
    "weightPercent" REAL,
    CONSTRAINT "TestCurriculumLink_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CurriculumNode" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "subjectCode" TEXT NOT NULL,
    "gradeRange" TEXT NOT NULL,
    "topicLabel" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdminProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT,
    CONSTRAINT "AdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdminProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AdminProfile" ("id", "userId") SELECT "id", "userId" FROM "AdminProfile";
DROP TABLE "AdminProfile";
ALTER TABLE "new_AdminProfile" RENAME TO "AdminProfile";
CREATE UNIQUE INDEX "AdminProfile_userId_key" ON "AdminProfile"("userId");
CREATE TABLE "new_Assignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT,
    "schoolId" TEXT,
    "classId" TEXT,
    "academicYearId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "grade" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Assignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Assignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Assignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Assignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Assignment" ("createdAt", "deletedAt", "description", "dueDate", "grade", "id", "schoolId", "status", "subjectId", "teacherId", "title", "updatedAt") SELECT "createdAt", "deletedAt", "description", "dueDate", "grade", "id", "schoolId", "status", "subjectId", "teacherId", "title", "updatedAt" FROM "Assignment";
DROP TABLE "Assignment";
ALTER TABLE "new_Assignment" RENAME TO "Assignment";
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentRequestId" TEXT,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_consentRequestId_fkey" FOREIGN KEY ("consentRequestId") REFERENCES "ConsentRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "consentRequestId", "details", "id", "ipAddress", "targetId", "targetType", "timestamp", "userAgent", "userId") SELECT "action", "consentRequestId", "details", "id", "ipAddress", "targetId", "targetType", "timestamp", "userAgent", "userId" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE TABLE "new_ParentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "email" TEXT,
    "name" TEXT,
    CONSTRAINT "ParentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ParentProfile" ("id", "userId") SELECT "id", "userId" FROM "ParentProfile";
DROP TABLE "ParentProfile";
ALTER TABLE "new_ParentProfile" RENAME TO "ParentProfile";
CREATE UNIQUE INDEX "ParentProfile_userId_key" ON "ParentProfile"("userId");
CREATE TABLE "new_School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "district" TEXT,
    "city" TEXT
);
INSERT INTO "new_School" ("city", "district", "id", "name", "type") SELECT "city", "district", "id", "name", "type" FROM "School";
DROP TABLE "School";
ALTER TABLE "new_School" RENAME TO "School";
CREATE TABLE "new_StudentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT,
    "classId" TEXT,
    "isEligible" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudentProfile_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StudentProfile" ("id", "schoolId", "userId") SELECT "id", "schoolId", "userId" FROM "StudentProfile";
DROP TABLE "StudentProfile";
ALTER TABLE "new_StudentProfile" RENAME TO "StudentProfile";
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");
CREATE TABLE "new_TeacherProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TeacherProfile" ("id", "userId") SELECT "id", "userId" FROM "TeacherProfile";
DROP TABLE "TeacherProfile";
ALTER TABLE "new_TeacherProfile" RENAME TO "TeacherProfile";
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");
CREATE TABLE "new_Test" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "ownerId" TEXT,
    "subjectId" TEXT,
    "schoolId" TEXT,
    "classId" TEXT,
    "academicYearId" TEXT,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "grade" TEXT,
    "rubric" TEXT,
    "answerKey" TEXT,
    "blankTestNotes" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PREPARING',
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "sourceTestId" TEXT,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "versionNote" TEXT,
    "plannedDate" DATETIME,
    "distributedDate" DATETIME,
    "collectedDate" DATETIME,
    "completedDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Test_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Test_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "TeacherProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Test_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Test_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Test_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Test_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Test_sourceTestId_fkey" FOREIGN KEY ("sourceTestId") REFERENCES "Test" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Test" ("blankTestNotes", "collectedDate", "completedDate", "createdAt", "deletedAt", "distributedDate", "grade", "id", "notes", "plannedDate", "schoolId", "status", "subjectId", "teacherId", "title", "topic", "updatedAt") SELECT "blankTestNotes", "collectedDate", "completedDate", "createdAt", "deletedAt", "distributedDate", "grade", "id", "notes", "plannedDate", "schoolId", "status", "subjectId", "teacherId", "title", "topic", "updatedAt" FROM "Test";
DROP TABLE "Test";
ALTER TABLE "new_Test" RENAME TO "Test";
CREATE TABLE "new_TestResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL,
    "scanBatchId" TEXT,
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
    CONSTRAINT "TestResult_scanBatchId_fkey" FOREIGN KEY ("scanBatchId") REFERENCES "ScanBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TestResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TestResult" ("analyzedAt", "approvedAt", "archivedAt", "createdAt", "editedFeedback", "id", "maxScore", "rawFeedback", "reviewedAt", "score", "sharedAt", "status", "storageMode", "studentId", "studentName", "teacherComment", "teacherNotes", "testId", "updatedAt", "uploadedAt") SELECT "analyzedAt", "approvedAt", "archivedAt", "createdAt", "editedFeedback", "id", "maxScore", "rawFeedback", "reviewedAt", "score", "sharedAt", "status", "storageMode", "studentId", "studentName", "teacherComment", "teacherNotes", "testId", "updatedAt", "uploadedAt" FROM "TestResult";
DROP TABLE "TestResult";
ALTER TABLE "new_TestResult" RENAME TO "TestResult";
CREATE TABLE "new_TrainingConsent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testResultId" TEXT,
    "submissionId" TEXT,
    "exerciseId" TEXT,
    "consentedBy" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "consentedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anonymizedAt" DATETIME,
    CONSTRAINT "TrainingConsent_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "TestResult" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TrainingConsent_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TrainingConsent_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TrainingConsent" ("anonymizedAt", "consentType", "consentedAt", "consentedBy", "id") SELECT "anonymizedAt", "consentType", "consentedAt", "consentedBy", "id" FROM "TrainingConsent";
DROP TABLE "TrainingConsent";
ALTER TABLE "new_TrainingConsent" RENAME TO "TrainingConsent";
CREATE UNIQUE INDEX "TrainingConsent_testResultId_key" ON "TrainingConsent"("testResultId");
CREATE UNIQUE INDEX "TrainingConsent_submissionId_key" ON "TrainingConsent"("submissionId");
CREATE UNIQUE INDEX "TrainingConsent_exerciseId_key" ON "TrainingConsent"("exerciseId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TEACHER',
    "personalCode" TEXT,
    "phoneNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "password", "personalCode", "phoneNumber", "role", "updatedAt") SELECT "createdAt", "email", "id", "name", "password", "personalCode", "phoneNumber", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_personalCode_key" ON "User"("personalCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_schoolId_academicYearId_name_key" ON "SchoolClass"("schoolId", "academicYearId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentRequest_inviteToken_key" ON "ConsentRequest"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "ScanBatchTestLink_batchId_testId_key" ON "ScanBatchTestLink"("batchId", "testId");

-- CreateIndex
CREATE UNIQUE INDEX "TestAccessGrant_testId_granteeId_key" ON "TestAccessGrant"("testId", "granteeId");

-- CreateIndex
CREATE UNIQUE INDEX "TestCurriculumLink_testId_curriculumCode_key" ON "TestCurriculumLink"("testId", "curriculumCode");
