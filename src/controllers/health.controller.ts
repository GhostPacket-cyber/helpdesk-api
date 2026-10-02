import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

async function isDatabaseUp(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const databaseUp = await isDatabaseUp();

  res.status(databaseUp ? 200 : 503).json({
    status: databaseUp ? 'ok' : 'degraded',
    database: databaseUp ? 'up' : 'down',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
