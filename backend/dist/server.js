"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./database");
const auth_1 = require("./auth");
const api_1 = require("./api");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middlewares
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health Check API (Section 58)
app.get('/health', async (req, res) => {
    try {
        await database_1.prisma.$queryRaw `SELECT 1`;
        return res.json({
            status: 'ok',
            database: 'connected',
            application: 'Livora AI',
        });
    }
    catch (error) {
        return res.status(500).json({
            status: 'error',
            database: 'disconnected',
            application: 'Livora AI',
        });
    }
});
// Also support /api/health
app.get('/api/health', async (req, res) => {
    try {
        await database_1.prisma.$queryRaw `SELECT 1`;
        return res.json({
            status: 'ok',
            database: 'connected',
            application: 'Livora AI',
        });
    }
    catch (error) {
        return res.status(500).json({
            status: 'error',
            database: 'disconnected',
            application: 'Livora AI',
        });
    }
});
// Router Mounts
app.use('/api/auth', auth_1.authRouter);
app.use('/api', api_1.apiRouter);
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled API Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    });
});
// Start Server & Connect SQLite Database
async function bootstrap() {
    await (0, database_1.connectDB)();
    app.listen(PORT, () => {
        console.log(`🚀 Livora AI Backend Server running at http://localhost:${PORT}`);
        console.log(`💚 Health Check endpoint at http://localhost:${PORT}/health`);
    });
}
if (!process.env.VERCEL) {
    bootstrap();
}
exports.default = app;
