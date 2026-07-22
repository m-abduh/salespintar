import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/crypto';
import { logger } from '../utils/logger';
import { env } from '../config/env';

let io: Server | null = null;

export function getIO(): Server | null {
  return io;
}

export function setupWebSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(',').map(o => o.trim()),
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.query.token as string;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    const businessRoom = `business:${user.businessId}`;

    socket.join(businessRoom);
    logger.info(`WebSocket connected: user ${user.userId} joined ${businessRoom}`);

    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket disconnected: user ${user.userId}, reason: ${reason}`);
    });

    const heartbeat = setInterval(() => {
      socket.emit('ping', Date.now());
    }, 30000);

    socket.on('pong', () => {});

    socket.on('error', (err) => {
      logger.error(`WebSocket error for user ${user.userId}: ${err.message}`);
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}
