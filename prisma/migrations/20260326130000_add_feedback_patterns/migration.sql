-- AI Learning: accumulated QA patterns that improve pass 1 over time
CREATE TABLE "FeedbackPattern" (
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
