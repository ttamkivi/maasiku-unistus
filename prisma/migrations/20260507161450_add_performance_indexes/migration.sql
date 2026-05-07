/*
  Warnings:

  - You are about to alter the column `active` on the `FeedbackPattern` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `isFree` on the `LearningResource` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `verified` on the `LearningResource` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.

*/
-- CreateTable
CREATE TABLE "TeacherClassAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "parallel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeacherClassAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherClassAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TeacherClassAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FeedbackPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dimension" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "correction" TEXT NOT NULL,
    "example" TEXT,
    "topic" TEXT,
    "grade" TEXT,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "severity" TEXT NOT NULL DEFAULT 'important',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FeedbackPattern" ("active", "correction", "createdAt", "dimension", "example", "frequency", "grade", "id", "pattern", "severity", "topic", "updatedAt") SELECT "active", "correction", "createdAt", "dimension", "example", "frequency", "grade", "id", "pattern", "severity", "topic", "updatedAt" FROM "FeedbackPattern";
DROP TABLE "FeedbackPattern";
ALTER TABLE "new_FeedbackPattern" RENAME TO "FeedbackPattern";
CREATE TABLE "new_InviteToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME
);
INSERT INTO "new_InviteToken" ("createdAt", "createdBy", "email", "expiresAt", "id", "role", "token", "usedAt") SELECT "createdAt", "createdBy", "email", "expiresAt", "id", "role", "token", "usedAt" FROM "InviteToken";
DROP TABLE "InviteToken";
ALTER TABLE "new_InviteToken" RENAME TO "InviteToken";
CREATE UNIQUE INDEX "InviteToken_token_key" ON "InviteToken"("token");
CREATE TABLE "new_LearningResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "curriculumCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'et',
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT,
    "description" TEXT,
    "gradeRange" TEXT,
    "topic" TEXT,
    "quality" INTEGER NOT NULL DEFAULT 3,
    "addedBy" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LearningResource" ("addedBy", "createdAt", "curriculumCode", "description", "gradeRange", "id", "isFree", "language", "provider", "quality", "title", "topic", "type", "updatedAt", "url", "verified", "verifiedAt") SELECT "addedBy", "createdAt", "curriculumCode", "description", "gradeRange", "id", "isFree", "language", "provider", "quality", "title", "topic", "type", "updatedAt", "url", "verified", "verifiedAt" FROM "LearningResource";
DROP TABLE "LearningResource";
ALTER TABLE "new_LearningResource" RENAME TO "LearningResource";
CREATE INDEX "LearningResource_curriculumCode_idx" ON "LearningResource"("curriculumCode");
CREATE INDEX "LearningResource_type_idx" ON "LearningResource"("type");
CREATE INDEX "LearningResource_language_idx" ON "LearningResource"("language");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TEACHER',
    "personalCode" TEXT,
    "phoneNumber" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "preferences" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "password", "personalCode", "phoneNumber", "preferences", "role", "updatedAt") SELECT "createdAt", "email", "id", "name", "password", "personalCode", "phoneNumber", "preferences", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_personalCode_key" ON "User"("personalCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TeacherClassAssignment_teacherId_subjectId_academicYearId_gradeLevel_parallel_key" ON "TeacherClassAssignment"("teacherId", "subjectId", "academicYearId", "gradeLevel", "parallel");

-- CreateIndex
CREATE INDEX "AcademicYear_schoolId_idx" ON "AcademicYear"("schoolId");

-- CreateIndex
CREATE INDEX "AdminProfile_schoolId_idx" ON "AdminProfile"("schoolId");

-- CreateIndex
CREATE INDEX "Assignment_teacherId_idx" ON "Assignment"("teacherId");

-- CreateIndex
CREATE INDEX "Assignment_classId_idx" ON "Assignment"("classId");

-- CreateIndex
CREATE INDEX "Assignment_subjectId_idx" ON "Assignment"("subjectId");

-- CreateIndex
CREATE INDEX "Assignment_schoolId_idx" ON "Assignment"("schoolId");

-- CreateIndex
CREATE INDEX "Assignment_academicYearId_idx" ON "Assignment"("academicYearId");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_assignmentId_idx" ON "AssignmentSubmission"("assignmentId");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_studentId_idx" ON "AssignmentSubmission"("studentId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_consentRequestId_idx" ON "AuditLog"("consentRequestId");

-- CreateIndex
CREATE INDEX "ConsentGrant_studentId_idx" ON "ConsentGrant"("studentId");

-- CreateIndex
CREATE INDEX "ConsentGrant_subjectId_idx" ON "ConsentGrant"("subjectId");

-- CreateIndex
CREATE INDEX "ConsentGrant_parentId_idx" ON "ConsentGrant"("parentId");

-- CreateIndex
CREATE INDEX "ConsentGrant_requestId_idx" ON "ConsentGrant"("requestId");

-- CreateIndex
CREATE INDEX "ConsentGrant_academicYearId_idx" ON "ConsentGrant"("academicYearId");

-- CreateIndex
CREATE INDEX "ConsentGrant_studentId_subjectId_status_idx" ON "ConsentGrant"("studentId", "subjectId", "status");

-- CreateIndex
CREATE INDEX "ConsentRequest_studentId_idx" ON "ConsentRequest"("studentId");

-- CreateIndex
CREATE INDEX "ConsentRequest_requestedById_idx" ON "ConsentRequest"("requestedById");

-- CreateIndex
CREATE INDEX "ConsentRequest_parentProfileId_idx" ON "ConsentRequest"("parentProfileId");

-- CreateIndex
CREATE INDEX "ConsentRequest_requestedById_status_idx" ON "ConsentRequest"("requestedById", "status");

-- CreateIndex
CREATE INDEX "Exercise_studentId_idx" ON "Exercise"("studentId");

-- CreateIndex
CREATE INDEX "Exercise_subjectId_idx" ON "Exercise"("subjectId");

-- CreateIndex
CREATE INDEX "ParentStudentLink_parentId_idx" ON "ParentStudentLink"("parentId");

-- CreateIndex
CREATE INDEX "ParentStudentLink_studentId_idx" ON "ParentStudentLink"("studentId");

-- CreateIndex
CREATE INDEX "ScanBatch_primaryTestId_idx" ON "ScanBatch"("primaryTestId");

-- CreateIndex
CREATE INDEX "ScanBatch_uploadedBy_idx" ON "ScanBatch"("uploadedBy");

-- CreateIndex
CREATE INDEX "ScanBatchPage_batchId_idx" ON "ScanBatchPage"("batchId");

-- CreateIndex
CREATE INDEX "ScanBatchPage_resultId_idx" ON "ScanBatchPage"("resultId");

-- CreateIndex
CREATE INDEX "SchoolClass_homroomTeacherId_idx" ON "SchoolClass"("homroomTeacherId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_classId_idx" ON "StudentProfile"("classId");

-- CreateIndex
CREATE INDEX "StudentProfile_schoolId_idx" ON "StudentProfile"("schoolId");

-- CreateIndex
CREATE INDEX "TeacherSchool_schoolId_idx" ON "TeacherSchool"("schoolId");

-- CreateIndex
CREATE INDEX "TeacherSchool_teacherId_idx" ON "TeacherSchool"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherSubject_subjectId_idx" ON "TeacherSubject"("subjectId");

-- CreateIndex
CREATE INDEX "TeacherSubject_teacherId_idx" ON "TeacherSubject"("teacherId");

-- CreateIndex
CREATE INDEX "Test_teacherId_idx" ON "Test"("teacherId");

-- CreateIndex
CREATE INDEX "Test_classId_idx" ON "Test"("classId");

-- CreateIndex
CREATE INDEX "Test_subjectId_idx" ON "Test"("subjectId");

-- CreateIndex
CREATE INDEX "Test_schoolId_idx" ON "Test"("schoolId");

-- CreateIndex
CREATE INDEX "Test_academicYearId_idx" ON "Test"("academicYearId");

-- CreateIndex
CREATE INDEX "Test_ownerId_idx" ON "Test"("ownerId");

-- CreateIndex
CREATE INDEX "Test_sourceTestId_idx" ON "Test"("sourceTestId");

-- CreateIndex
CREATE INDEX "Test_teacherId_status_idx" ON "Test"("teacherId", "status");

-- CreateIndex
CREATE INDEX "TestAccessGrant_grantedBy_idx" ON "TestAccessGrant"("grantedBy");

-- CreateIndex
CREATE INDEX "TestResult_testId_idx" ON "TestResult"("testId");

-- CreateIndex
CREATE INDEX "TestResult_studentId_idx" ON "TestResult"("studentId");

-- CreateIndex
CREATE INDEX "TestResult_scanBatchId_idx" ON "TestResult"("scanBatchId");

-- CreateIndex
CREATE INDEX "TestResult_testId_status_idx" ON "TestResult"("testId", "status");

-- CreateIndex
CREATE INDEX "UserFeedback_userId_idx" ON "UserFeedback"("userId");

-- CreateIndex
CREATE INDEX "WorkPhoto_testResultId_idx" ON "WorkPhoto"("testResultId");

-- CreateIndex
CREATE INDEX "WorkPhoto_submissionId_idx" ON "WorkPhoto"("submissionId");

-- CreateIndex
CREATE INDEX "WorkPhoto_exerciseId_idx" ON "WorkPhoto"("exerciseId");
