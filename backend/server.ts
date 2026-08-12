import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, prisma } from './database';
import { authRouter } from './auth';
import { apiRouter } from './api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check API (Section 58)
app.get('/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: 'ok',
      database: 'connected',
      application: 'Livora AI',
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      database: 'disconnected',
      application: 'Livora AI',
    });
  }
});

// Also support /api/health
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: 'ok',
      database: 'connected',
      application: 'Livora AI',
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      database: 'disconnected',
      application: 'Livora AI',
    });
  }
});

// Router Mounts
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server & Connect SQLite Database
async function bootstrap() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Livora AI Backend Server running at http://localhost:${PORT}`);
    console.log(`💚 Health Check endpoint at http://localhost:${PORT}/health`);
  });
}

if (!process.env.VERCEL) {
  bootstrap();
}

export default app;

