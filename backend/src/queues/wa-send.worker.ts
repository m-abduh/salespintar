import { Job } from 'bullmq';
import { baileysManager } from '../services/baileys.service';
import { logger } from '../utils/logger';

interface WaSendJob {
  businessId: string;
  waJid: string;
  message: string;
  priority?: 'HIGH' | 'LOW';
  typing?: boolean;
}

export async function handleWaSend(job: Job<WaSendJob>) {
  const { businessId, waJid, message, typing } = job.data;

  try {
    if (typing) {
      await baileysManager.sendTyping(businessId, waJid);
    }

    await baileysManager.sendMessage(businessId, waJid, { text: message });

    logger.info(`Message sent to ${waJid} for business ${businessId}`);
  } catch (error: any) {
    logger.error(`Failed to send message to ${waJid}: ${error.message}`);
    throw error;
  }
}
