import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../config/prisma';
import { NotFoundError, ValidationError } from '../utils/errors';
import { broadcastQueue } from '../queues';

const router = Router();

const createBroadcastSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(4096),
  templateVars: z.array(z.string()).default([]),
  filter: z.object({
    segments: z.array(z.string()).optional(),
    status: z.string().optional(),
    lastChatDays: z.number().optional(),
  }).optional(),
  scheduleType: z.enum(['once', 'daily', 'weekly']).default('once'),
  scheduleAt: z.string().datetime(),
});

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [broadcasts, total] = await Promise.all([
      prisma.broadcast.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          creator: { select: { id: true, name: true } },
        },
      }),
      prisma.broadcast.count({ where: { businessId } }),
    ]);

    res.json({ data: broadcasts, total, page, limit });
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('ADMIN'), validate(createBroadcastSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId, userId } = req.user!;
    const scheduleAt = new Date(req.body.scheduleAt);

    if (scheduleAt <= new Date()) {
      throw new ValidationError('scheduleAt must be in the future');
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        businessId,
        title: req.body.title,
        message: req.body.message,
        templateVars: req.body.templateVars,
        filter: req.body.filter || {},
        scheduleType: req.body.scheduleType,
        scheduleAt,
        createdBy: userId,
        status: 'PENDING',
      },
    });

    const delay = scheduleAt.getTime() - Date.now();
    await broadcastQueue.add('execute-broadcast', {
      broadcastId: broadcast.id,
      businessId,
    }, {
      delay: Math.max(0, delay),
      jobId: `broadcast-${broadcast.id}`,
    });

    res.status(201).json(broadcast);
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const broadcast = await prisma.broadcast.findFirst({
      where: { id, businessId: req.user!.businessId },
      include: {
        creator: { select: { id: true, name: true } },
        _count: { select: { broadcastLogs: true } },
      },
    });
    if (!broadcast) throw new NotFoundError('Broadcast');
    res.json(broadcast);
  } catch (err) { next(err); }
});

router.patch('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const broadcast = await prisma.broadcast.findFirst({
      where: { id, businessId: req.user!.businessId, status: 'PENDING' },
    });
    if (!broadcast) throw new NotFoundError('Broadcast or not editable');

    const updated = await prisma.broadcast.update({
      where: { id },
      data: req.body,
    });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const broadcast = await prisma.broadcast.findFirst({
      where: { id, businessId: req.user!.businessId },
    });
    if (!broadcast) throw new NotFoundError('Broadcast');

    await prisma.broadcast.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    const job = await broadcastQueue.getJob(`broadcast-${broadcast.id}`);
    if (job) await job.remove();

    res.json({ message: 'Broadcast cancelled' });
  } catch (err) { next(err); }
});

router.get('/:id/logs', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const broadcast = await prisma.broadcast.findFirst({
      where: { id, businessId: req.user!.businessId },
    });
    if (!broadcast) throw new NotFoundError('Broadcast');

    const [logs, total] = await Promise.all([
      prisma.broadcastLog.findMany({
        where: { broadcastId: id, businessId: req.user!.businessId },
        include: { lead: { select: { name: true, waNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.broadcastLog.count({ where: { broadcastId: id, businessId: req.user!.businessId } }),
    ]);

    res.json({ data: logs, total, page, limit });
  } catch (err) { next(err); }
});

export default router;
