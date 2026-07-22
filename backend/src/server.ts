import http from 'http';
import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { redisCache, redisBull } from './config/redis';
import { setupWorkers, closeQueues } from './queues';
import { setupWebSocket } from './websocket/handler';
import { baileysManager } from './services/baileys.service';
import { handleIncomingMessage } from './services/message.service';
import { logger } from './utils/logger';

async function bootstrap() {
  logger.info('Starting SalesPintar API server...');

  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (err) {
    logger.error('Failed to connect to database', err);
    process.exit(1);
  }

  try {
    await redisCache.ping();
    await redisBull.ping();
    logger.info('Redis connected');
  } catch (err) {
    logger.error('Failed to connect to Redis', err);
    process.exit(1);
  }

  await setupWorkers();

  baileysManager.setMessageHandler(handleIncomingMessage);

  await prisma.waCredential.updateMany({
    where: { status: 'CONNECTED' },
    data: { status: 'DISCONNECTED' },
  });
  logger.info('Reset stale WA connections');

  const httpServer = http.createServer(app);
  setupWebSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
    logger.info(`API prefix: ${env.API_PREFIX}`);
    logger.info(`CORS origin: ${env.CORS_ORIGIN}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    try { httpServer.close(); } catch {}
    try { baileysManager.disconnectAll(); } catch {}
    try { prisma.$disconnect(); } catch {}
    try { redisCache.disconnect(); } catch {}
    try { redisBull.disconnect(); } catch {}
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGHUP', () => shutdown('SIGHUP'));

  process.on('unhandledRejection', (err: Error) => {
    logger.error('Unhandled rejection', { error: err.message, stack: err.stack });
  });

  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to bootstrap server', err);
  process.exit(1);
});
