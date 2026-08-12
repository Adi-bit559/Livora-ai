"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDB = connectDB;
exports.disconnectDB = disconnectDB;
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Ensure data directory exists for SQLite
const dataDir = path_1.default.join(__dirname, 'data');
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
exports.prisma = globalThis.prismaGlobal ?? new client_1.PrismaClient();
if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = exports.prisma;
}
async function connectDB() {
    try {
        await exports.prisma.$connect();
        console.log('✅ SQLite database connected successfully (data/livora.db)');
    }
    catch (error) {
        console.error('⚠️ Database connection error:', error);
    }
}
async function disconnectDB() {
    await exports.prisma.$disconnect();
}
