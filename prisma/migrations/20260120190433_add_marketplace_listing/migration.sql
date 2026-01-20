-- CreateTable
CREATE TABLE "Listing" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "carTokenId" INTEGER NOT NULL,
    "sellerId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "soldAt" DATETIME,
    "buyerId" TEXT,
    "txHash" TEXT,
    CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Listing_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Listing_carTokenId_fkey" FOREIGN KEY ("carTokenId") REFERENCES "Car" ("tokenId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing_carTokenId_key" ON "Listing"("carTokenId");

-- CreateIndex
CREATE INDEX "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_sellerId_idx" ON "Listing"("sellerId");
