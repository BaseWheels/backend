"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const checkin_1 = __importDefault(require("./routes/checkin"));
const gacha_1 = __importDefault(require("./routes/gacha"));
const assembly_1 = __importDefault(require("./routes/assembly"));
const garage_1 = __importDefault(require("./routes/garage"));
const metadata_1 = __importDefault(require("./routes/metadata"));
const marketplace_1 = __importDefault(require("./routes/marketplace"));
const supply_1 = __importDefault(require("./routes/supply"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check
app.get("/health", (_, res) => {
    res.json({ status: "ok" });
});
// API Routes
app.use("/api", checkin_1.default);
app.use("/api", gacha_1.default);
app.use("/api", assembly_1.default);
app.use("/api", garage_1.default);
app.use("/api", marketplace_1.default);
app.use("/api", supply_1.default);
// Metadata Routes (for NFT marketplaces)
app.use(metadata_1.default);
// Start server
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map