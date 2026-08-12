import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

// Ensure data directory exists for local SQLite
try {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (e) {
  // Ignored on read-only serverless filesystems
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
