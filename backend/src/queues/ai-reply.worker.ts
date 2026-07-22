import { Job } from 'bullmq';
import { prisma } from '../config/prisma';
import { baileysManager } from '../services/baileys.service';
import { generateReply } from '../services/ai.service';
import { waSendQueue, aiTaggingQueue } from './index';
import { logger } from '../utils/logger';
import { getIO } from '../websocket/handler';

interface AiReplyJob {
  businessId: string;
  conversationId: string;
  leadId: string;
  messageText: string;
  leadName: string | null;
  waJid: string;
}

export async function handleAiReply(job: Job<AiReplyJob>) {
  const { businessId, conversationId, leadId, messageText, leadName, waJid } = job.data;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation || conversation.status !== 'AI') {
    logger.info(`Skipping AI reply for conversation ${conversationId}: status is ${conversation?.status}`);
    return;
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return;

  const reply = await generateReply(
    businessId,
    leadId,
    messageText,
    leadName,
    business.name
  );

  if (!reply) return;

  await prisma.message.create({
    data: {
      businessId,
      conversationId,
      message: reply,
      messageType: 'text',
      fromRole: 'AI',
      aiModel: 'llama-3.1-8b',
    },
  });

  await waSendQueue.add('send-ai-reply', {
    businessId,
    waJid,
    message: reply,
    priority: 'HIGH',
    typing: true,
  });

  await aiTaggingQueue.add('tag-lead', {
    businessId,
    leadId,
    messageText,
  }, { priority: 1 });

  const io = getIO();
  if (io) {
    io.to(`business:${businessId}`).emit('chat:new', {
      conversationId,
      message: { fromRole: 'AI', message: reply, createdAt: new Date() },
    });
  }

  logger.info(`AI replied to lead ${leadId} in conversation ${conversationId}`);
}
