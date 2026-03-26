-- CreateTable
CREATE TABLE "UserFeedback" (
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

-- CreateIndex
CREATE INDEX "UserFeedback_status_idx" ON "UserFeedback"("status");

-- CreateIndex
CREATE INDEX "UserFeedback_createdAt_idx" ON "UserFeedback"("createdAt");
