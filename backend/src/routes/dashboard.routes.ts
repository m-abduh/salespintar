import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { redisCache } from '../config/redis';

const router = Router();

async function getCachedOrFetch<T>(key: string, fetch: () => Promise<T>, ttl = 300): Promise<T> {
  const cached = await redisCache.get(key);
  if (cached) return JSON.parse(cached);
  const data = await fetch();
  await redisCache.setex(key, ttl, JSON.stringify(data));
  return data;
}

router.get('/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.user!;
    const cacheKey = `business:${businessId}:dashboard:stats`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await getCachedOrFetch(cacheKey, async () => {
      const [
        totalChatsToday,
        activeConversations,
        totalLeads,
        newLeadsToday,
        totalBroadcasts,
      ] = await Promise.all([
        prisma.conversation.count({
          where: { businessId, startedAt: { gte: today } },
        }),
        prisma.conversation.count({
          where: { businessId, status: { in: ['AI', 'HUMAN'] } },
        }),
        prisma.lead.count({ where: { businessId } }),
        prisma.lead.count({
          where: { businessId, createdAt: { gte: today } },
        }),
        prisma.broadcast.count({ where: { businessId } }),
      ]);

      const aiReplies = await prisma.message.count({
        where: { businessId, fromRole: 'AI', createdAt: { gte: today } },
      });

      const humanMessages = await prisma.message.count({
        where: { businessId, fromRole: 'HUMAN', createdAt: { gte: today } },
      });

      const conversionRate = totalChatsToday > 0
        ? Math.round((newLeadsToday / totalChatsToday) * 100)
        : 0;

      return {
        totalChatsToday,
        activeConversations,
        totalLeads,
        newLeadsToday,
        totalBroadcasts,
        aiReplies,
        humanMessages,
        conversionRate,
      };
    });

    res.json(stats);
  } catch (err) { next(err); }
});

router.get('/trends', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.user!;
    const period = (req.query.period as string) || '7d';
    const days = period === '30d' ? 30 : 7;
    const cacheKey = `business:${businessId}:dashboard:trends:${period}`;

    const trends = await getCachedOrFetch(cacheKey, async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const conversations = await prisma.conversation.findMany({
        where: { businessId, startedAt: { gte: startDate } },
        select: { startedAt: true, status: true },
        orderBy: { startedAt: 'asc' },
      });

      const messages = await prisma.message.findMany({
        where: { businessId, createdAt: { gte: startDate } },
        select: { createdAt: true, fromRole: true },
        orderBy: { createdAt: 'asc' },
      });

      const dailyData: Record<string, { chats: number; ai: number; human: number; leads: number }> = {};

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const key = date.toISOString().split('T')[0];
        dailyData[key] = { chats: 0, ai: 0, human: 0, leads: 0 };
      }

      for (const c of conversations) {
        const key = c.startedAt.toISOString().split('T')[0];
        if (dailyData[key]) dailyData[key].chats++;
      }

      for (const m of messages) {
        const key = m.createdAt.toISOString().split('T')[0];
        if (dailyData[key]) {
          if (m.fromRole === 'AI') dailyData[key].ai++;
          if (m.fromRole === 'HUMAN') dailyData[key].human++;
        }
      }

      const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
      for (const m of messages) {
        const hour = m.createdAt.getHours();
        hours[hour].count++;
      }

      return {
        daily: Object.entries(dailyData).map(([date, data]) => ({ date, ...data })),
        peakHours: hours,
      };
    });

    res.json(trends);
  } catch (err) { next(err); }
});

router.get('/recent', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.user!;
    const { limit = '10' } = req.query;

    const conversations = await prisma.conversation.findMany({
      where: { businessId },
      include: {
        lead: { select: { id: true, name: true, waNumber: true, avatarUrl: true } },
        human: { select: { id: true, name: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { message: true, fromRole: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(conversations);
  } catch (err) { next(err); }
});

router.get('/performance', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.user!;
    const cacheKey = `business:${businessId}:dashboard:performance`;

    const performance = await getCachedOrFetch(cacheKey, async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalAiReplies, totalHumanTakeovers, totalConversations] = await Promise.all([
        prisma.message.count({ where: { businessId, fromRole: 'AI' } }),
        prisma.conversation.count({ where: { businessId, status: 'DONE', humanId: { not: null } } }),
        prisma.conversation.count({ where: { businessId } }),
      ]);

      const humanTakeoverRate = totalConversations > 0
        ? Math.round((totalHumanTakeovers / totalConversations) * 100)
        : 0;

      const topIntents = await prisma.lead.groupBy({
        by: ['intent'],
        where: { businessId, intent: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      });

      return {
        totalAiReplies,
        totalHumanTakeovers,
        humanTakeoverRate,
        topIntents: topIntents.map(i => ({ intent: i.intent, count: i._count.id })),
      };
    });

    res.json(performance);
  } catch (err) { next(err); }
});

export default router;
