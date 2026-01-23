-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "usernameSet" BOOLEAN NOT NULL DEFAULT false,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "lastCheckIn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shippingName" TEXT,
    "shippingPhone" TEXT,
    "shippingAddress" TEXT
);
INSERT INTO "new_User" ("coins", "createdAt", "email", "id", "lastCheckIn", "shippingAddress", "shippingName", "shippingPhone", "username", "walletAddress") SELECT "coins", "createdAt", "email", "id", "lastCheckIn", "shippingAddress", "shippingName", "shippingPhone", "username", "walletAddress" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
