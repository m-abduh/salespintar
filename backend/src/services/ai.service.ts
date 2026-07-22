import Groq from 'groq-sdk';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

const CONTEXT_LIMIT = 20;
const DAILY_CAP = env.GROQ_DAILY_CAP_PER_LEAD;
const RATE_LIMIT_MS = 3000;
const CONSECUTIVE_LIMIT = 3;

const lastReplyTimestamps = new Map<string, number>();
const consecutiveReplies = new Map<string, number>();

function getSystemPrompt(businessName: string): string {
  return `Kamu adalah AI Customer Service untuk ${businessName}. 
Gunakan bahasa Indonesia yang sopan dan profesional. 
Jawab pertanyaan pelanggan dengan ramah dan membantu.
Jika pelanggan ingin berbicara dengan sales, katakan akan segera dialihkan.
Jangan pernah mengaku sebagai manusia. Kamu adalah AI assistant.`;
}

function resetDailyCounts() {
  prisma.lead.updateMany({
    where: { dailyAiCount: { gt: 0 } },
    data: { dailyAiCount: 0 },
  }).catch(err => logger.error('Failed to reset daily AI counts', err));
}

const RESET_INTERVAL = 5 * 60 * 1000;
let lastReset = Date.now();

export async function generateReply(
  businessId: string,
  leadId: string,
  messageText: string,
  leadName: string | null,
  businessName: string
): Promise<string | null> {
  const now = Date.now();

  if (now - lastReset > RESET_INTERVAL) {
    lastReset = now;
    consecutiveReplies.clear();
  }

  const lastTime = lastReplyTimestamps.get(leadId);
  if (lastTime && now - lastTime < RATE_LIMIT_MS) {
    logger.warn(`Rate limit hit for lead ${leadId}`);
    return null;
  }

  const consCount = consecutiveReplies.get(leadId) || 0;
  if (consCount >= CONSECUTIVE_LIMIT) {
    logger.warn(`Consecutive reply limit hit for lead ${leadId}`);
    return null;
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return null;
  if (lead.dailyAiCount >= DAILY_CAP) {
    logger.warn(`Daily AI cap reached for lead ${leadId}`);
    return null;
  }

  const recentMessages = await prisma.message.findMany({
    where: { businessId, conversation: { leadId } },
    orderBy: { createdAt: 'desc' },
    take: CONTEXT_LIMIT,
    select: { message: true, fromRole: true },
  });

  const contextMessages = recentMessages
    .reverse()
    .map(m => `${m.fromRole === 'LEAD' ? 'Pelanggan' : 'AI'}: ${m.message}`)
    .join('\n');

  const userName = leadName || 'Pelanggan';

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: getSystemPrompt(businessName) },
        { role: 'system', content: `Konteks percakapan:\n${contextMessages}` },
        { role: 'user', content: `${userName}: ${messageText}` },
      ],
      model: env.GROQ_MODEL,
      max_tokens: env.GROQ_MAX_TOKENS,
      temperature: env.GROQ_TEMPERATURE,
    });

    const reply = completion.choices[0]?.message?.content;
    if (!reply || reply.trim().length === 0) {
      return fallbackReply();
    }

    lastReplyTimestamps.set(leadId, now);
    consecutiveReplies.set(leadId, consCount + 1);

    await prisma.lead.update({
      where: { id: leadId },
      data: { dailyAiCount: { increment: 1 } },
    });

    return reply.trim();
  } catch (error: any) {
    logger.error(`Groq API error: ${error.message}`);

    try {
      const fallbackCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: getSystemPrompt(businessName) },
          { role: 'user', content: `${userName}: ${messageText}` },
        ],
        model: env.GROQ_FALLBACK_MODEL,
        max_tokens: env.GROQ_MAX_TOKENS,
        temperature: env.GROQ_TEMPERATURE,
      });
      const reply = fallbackCompletion.choices[0]?.message?.content;
      return reply?.trim() || fallbackReply();
    } catch {
      return fallbackReply();
    }
  }
}

function fallbackReply(): string {
  return 'Maaf sedang sibuk, akan dijawab sales kami segera.';
}

export async function detectIntent(businessId: string, leadId: string, messageText: string): Promise<{
  intent: string;
  score: number;
}> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Klasifikasikan intent pesan customer berikut ke dalam satu kategori: minat, tanya_harga, komplain, spam, atau unknown. Berikan skor 0-100 berdasarkan engagement. Respon dalam format JSON: {"intent": "kategori", "score": angka}`,
        },
        { role: 'user', content: messageText },
      ],
      model: env.GROQ_MODEL,
      max_tokens: 100,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      intent: parsed.intent || 'unknown',
      score: Math.min(100, Math.max(0, parsed.score || 0)),
    };
  } catch {
    return { intent: 'unknown', score: 0 };
  }
}
