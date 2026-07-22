import { Job } from 'bullmq';
import { prisma } from '../config/prisma';
import { detectIntent } from '../services/ai.service';
import { logger } from '../utils/logger';

interface AiTaggingJob {
  businessId: string;
  leadId: string;
  messageText: string;
}

export async function handleAiTagging(job: Job<AiTaggingJob>) {
  const { businessId, leadId, messageText } = job.data;

  const result = await detectIntent(businessId, leadId, messageText);

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      intent: result.intent,
      score: result.score,
      totalMessages: { increment: 1 },
    },
  });

  logger.info(`Tagged lead ${leadId}: intent=${result.intent}, score=${result.score}`);
}
