-- Supabase Migration Script
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create User table
CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "walletAddress" TEXT UNIQUE NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "usernameSet" BOOLEAN NOT NULL DEFAULT false,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "lastCheckIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shippingName" TEXT,
    "shippingPhone" TEXT,
    "shippingAddress" TEXT
);

-- Create Fragment table
CREATE TABLE "Fragment" (
    "id" SERIAL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "typeId" INTEGER NOT NULL,
    "brand" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "txHash" TEXT,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Fragment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create Car table
CREATE TABLE "Car" (
    "tokenId" INTEGER PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "modelName" TEXT,
    "series" TEXT,
    "isRedeemed" BOOLEAN NOT NULL DEFAULT false,
    "mintTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),
    CONSTRAINT "Car_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create Listing table
CREATE TABLE "Listing" (
    "id" SERIAL PRIMARY KEY,
    "carTokenId" INTEGER UNIQUE NOT NULL,
    "sellerId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldAt" TIMESTAMP(3),
    "buyerId" TEXT,
    "txHash" TEXT,
    CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Listing_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Listing_carTokenId_fkey" FOREIGN KEY ("carTokenId") REFERENCES "Car"("tokenId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create WaitingList table
CREATE TABLE "WaitingList" (
    "id" SERIAL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "fragmentIds" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "WaitingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes for Fragment table
CREATE INDEX "Fragment_userId_brand_isUsed_idx" ON "Fragment"("userId", "brand", "isUsed");

-- Create indexes for Car table
CREATE INDEX "Car_createdAt_idx" ON "Car"("createdAt");

-- Create indexes for Listing table
CREATE INDEX "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt");
CREATE INDEX "Listing_sellerId_idx" ON "Listing"("sellerId");

-- Create indexes for WaitingList table
CREATE INDEX "WaitingList_series_status_position_idx" ON "WaitingList"("series", "status", "position");
CREATE INDEX "WaitingList_userId_status_idx" ON "WaitingList"("userId", "status");

-- Create trigger to automatically update updatedAt timestamp for Listing table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_listing_updated_at BEFORE UPDATE ON "Listing"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
