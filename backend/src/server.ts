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
  await baileysManager.connectAllActive();
  logger.info('Baileys connections restored for active businesses');

  const httpServer = http.createServer(app);
  setupWebSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
    logger.info(`API prefix: ${env.API_PREFIX}`);
    logger.info(`CORS origin: ${env.CORS_ORIGIN}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    httpServer.close(async () => {
      await baileysManager.disconnectAll();
      await closeQueues();
      await prisma.$disconnect();
      redisCache.disconnect();
      redisBull.disconnect();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

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
