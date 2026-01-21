-- CreateTable
CREATE TABLE "WaitingList" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "fragmentIds" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" DATETIME,
    "expiresAt" DATETIME,
    CONSTRAINT "WaitingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WaitingList_series_status_position_idx" ON "WaitingList"("series", "status", "position");

-- CreateIndex
CREATE INDEX "WaitingList_userId_status_idx" ON "WaitingList"("userId", "status");
