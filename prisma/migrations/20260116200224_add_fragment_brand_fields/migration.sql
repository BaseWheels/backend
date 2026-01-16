/*
  Warnings:

  - Added the required column `brand` to the `Fragment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rarity` to the `Fragment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `series` to the `Fragment` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Fragment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "typeId" INTEGER NOT NULL,
    "brand" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "txHash" TEXT,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Fragment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Fragment" ("createdAt", "id", "txHash", "typeId", "userId") SELECT "createdAt", "id", "txHash", "typeId", "userId" FROM "Fragment";
DROP TABLE "Fragment";
ALTER TABLE "new_Fragment" RENAME TO "Fragment";
CREATE INDEX "Fragment_userId_brand_isUsed_idx" ON "Fragment"("userId", "brand", "isUsed");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
