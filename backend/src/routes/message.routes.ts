import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';
import { baileysManager } from '../services/baileys.service';
import { getIO } from '../websocket/handler';

const router = Router({ mergeParams: true });

const sendMessageSchema = z.object({
  message: z.string().min(1).max(4096),
  messageType: z.enum(['text', 'image', 'document', 'location']).default('text'),
  mediaUrl: z.string().optional(),
});

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.user!;
    const conversationId = req.params.id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, businessId },
    });
    if (!conversation) throw new NotFoundError('Conversation');

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId, businessId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          human: { select: { id: true, name: true } },
        },
      }),
      prisma.message.count({ where: { conversationId, businessId } }),
    ]);

    res.json({ data: messages.reverse(), total, page, limit });
  } catch (err) { next(err); }
});

router.post('/', authenticate, validate(sendMessageSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId, userId } = req.user!;
    const conversationId = req.params.id as string;

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, businessId },
      include: { lead: true },
    });
    if (!conversation) throw new NotFoundError('Conversation');

    if (conversation.status === 'AI') {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: 'HUMAN', humanId: userId },
      });
    }

    const message = await prisma.message.create({
      data: {
        businessId,
        conversationId: conversation.id,
        message: req.body.message,
        messageType: req.body.messageType,
        mediaUrl: req.body.mediaUrl,
        fromRole: 'HUMAN',
        humanId: userId,
      },
    });

    if (conversation.lead?.waId) {
      const waId = conversation.lead.waId.includes('@s.whatsapp.net')
        ? conversation.lead.waId
        : `${conversation.lead.waId}@s.whatsapp.net`;

      await baileysManager.sendMessage(businessId, waId, { text: req.body.message });
    }

    const io = getIO();
    if (io) {
      io.to(`business:${businessId}`).emit('chat:new', {
        conversationId: conversation.id,
        message: {
          ...message,
          human: { id: userId, name: req.user!.userId },
        },
      });
    }

    res.status(201).json(message);
  } catch (err) { next(err); }
});

export default router;
