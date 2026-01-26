import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import checkinRoutes from "./routes/checkin";
import gachaRoutes from "./routes/gacha";
import assemblyRoutes from "./routes/assembly";
import garageRoutes from "./routes/garage";
import metadataRoutes from "./routes/metadata";
import marketplaceRoutes from "./routes/marketplace";
import supplyRoutes from "./routes/supply";
import activityRoutes from "./routes/activity";
import redeemRoutes from "./routes/redeem";
import userRoutes from "./routes/user";
import gaslessRoutes from "./routes/gasless";
import adminBuybackRoutes from "./routes/admin-buyback";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_, res: express.Response) => {
  res.json({ status: "ok" });
});

// API Routes
app.use("/api", checkinRoutes);
app.use("/api", gachaRoutes);
app.use("/api", assemblyRoutes);
app.use("/api", garageRoutes);
app.use("/api", marketplaceRoutes);
app.use("/api", supplyRoutes);
app.use("/api", activityRoutes);
app.use("/api", redeemRoutes);
app.use("/api", userRoutes);
app.use("/api", gaslessRoutes); // 🔥 Gasless transaction relay
app.use("/api", adminBuybackRoutes); // 💰 Admin buyback / Sell to Admin

// Metadata Routes (for NFT marketplaces)
app.use(metadataRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
