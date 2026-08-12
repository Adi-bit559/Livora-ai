import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

// Ensure data directory exists for SQLite
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const prisma = globalThis.prismaGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log('✅ SQLite database connected successfully (data/livora.db)');
  } catch (error) {
    console.error('⚠️ Database connection error:', error);
  }
}

export async function disconnectDB() {
  await prisma.$disconnect();
}
