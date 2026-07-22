import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { NotFoundError, ConflictError } from '../utils/errors';
import { getIO } from '../websocket/handler';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.user!;
    const status = req.query.status as string | undefined;
    const leadId = req.query.leadId as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = { businessId };
    if (status) where.status = status;
    if (leadId) where.leadId = leadId;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true, waNumber: true, avatarUrl: true } },
          human: { select: { id: true, name: true } },
          messages: { take: 1, orderBy: { createdAt: 'desc' }, select: { message: true, createdAt: true, fromRole: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    res.json({ data: conversations, total, page, limit });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id as string, businessId: req.user!.businessId },
      include: {
        lead: true,
        human: { select: { id: true, name: true } },
      },
    });
    if (!conversation) throw new NotFoundError('Conversation');
    res.json(conversation);
  } catch (err) { next(err); }
});

router.patch('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id as string, businessId: req.user!.businessId },
    });
    if (!conversation) throw new NotFoundError('Conversation');

    const updated = await prisma.conversation.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json(updated);
  } catch (err) { next(err); }
});

router.post('/:id/takeover', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id as string, businessId: req.user!.businessId },
    });
    if (!conversation) throw new NotFoundError('Conversation');

    if (conversation.status === 'HUMAN' && conversation.humanId) {
      throw new ConflictError('Conversation already taken over by another sales');
    }

    const updated = await prisma.conversation.update({
      where: { id: req.params.id as string },
      data: { status: 'HUMAN', humanId: req.user!.userId },
    });

    const io = getIO();
    if (io) {
      io.to(`business:${req.user!.businessId}`).emit('chat:status', {
        conversationId: req.params.id as string,
        status: 'HUMAN',
        humanId: req.user!.userId,
      });
    }

    res.json(updated);
  } catch (err) { next(err); }
});

router.post('/:id/release', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id as string, businessId: req.user!.businessId, humanId: req.user!.userId },
    });
    if (!conversation) throw new NotFoundError('Conversation');

    const updated = await prisma.conversation.update({
      where: { id: req.params.id as string },
      data: { status: 'AI', humanId: null },
    });

    const io = getIO();
    if (io) {
      io.to(`business:${req.user!.businessId}`).emit('chat:status', {
        conversationId: req.params.id as string,
        status: 'AI',
      });
    }

    res.json(updated);
  } catch (err) { next(err); }
});

router.post('/:id/complete', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id as string, businessId: req.user!.businessId },
    });
    if (!conversation) throw new NotFoundError('Conversation');

    const updated = await prisma.conversation.update({
      where: { id: req.params.id as string },
      data: { status: 'DONE', endedAt: new Date() },
    });

    const io = getIO();
    if (io) {
      io.to(`business:${req.user!.businessId}`).emit('chat:status', {
        conversationId: req.params.id as string,
        status: 'DONE',
      });
    }

    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
