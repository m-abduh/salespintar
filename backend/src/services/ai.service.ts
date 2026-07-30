import Groq from 'groq-sdk';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

async function getBusinessConfig(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true, aiConfig: true },
  });
  const cfg = (business?.aiConfig as Record<string, any>) || {};
  return {
    businessName: business?.name || '',
    prompt: cfg.prompt as string | undefined,
    model: (cfg.model as string) || env.GROQ_MODEL,
    fallbackModel: (cfg.fallbackModel as string) || env.GROQ_FALLBACK_MODEL,
    temperature: (cfg.temperature as number) ?? env.GROQ_TEMPERATURE,
    maxTokens: (cfg.maxTokens as number) ?? env.GROQ_MAX_TOKENS,
    dailyCap: (cfg.dailyCap as number) ?? env.GROQ_DAILY_CAP_PER_LEAD,
    contextLimit: (cfg.contextLimit as number) ?? 20,
    labelLead: (cfg.labelLead as string) || 'Pelanggan',
    labelHuman: (cfg.labelHuman as string) || 'Sales',
    labelAI: (cfg.labelAI as string) || 'AI',
  };
}

function getSystemPrompt(businessName: string, customPrompt?: string): string {
  if (customPrompt) return customPrompt;
  return `Kamu adalah AI Customer Service untuk ${businessName}. 
Gunakan bahasa Indonesia yang sopan dan profesional. 
Jawab pertanyaan pelanggan dengan ramah dan membantu.
Jika pelanggan ingin berbicara dengan sales, katakan akan segera dialihkan.
Jangan pernah mengaku sebagai manusia. Kamu adalah AI assistant.
Jangan tampilkan proses berpikir atau analisa internal apapun. Langsung berikan jawaban.`;
}

export async function generateReply(
  businessId: string,
  leadId: string,
  messageText: string,
  leadName: string | null,
  businessName: string
): Promise<string | null> {
  const [lead, config] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId } }),
    getBusinessConfig(businessId),
  ]);
  if (!lead) return null;
  if (lead.dailyAiCount >= config.dailyCap) {
    logger.warn(`Daily AI cap reached for lead ${leadId}`);
    return null;
  }

  const recentMessages = await prisma.message.findMany({
    where: { businessId, conversation: { leadId } },
    orderBy: { createdAt: 'desc' },
    take: config.contextLimit,
    select: { message: true, fromRole: true },
  });

  function roleLabel(role: string) {
    if (role === 'LEAD') return config.labelLead;
    if (role === 'HUMAN') return config.labelHuman;
    if (role === 'AI') return config.labelAI;
    return role;
  }

  const contextMessages = recentMessages
    .reverse()
    .map(m => `${roleLabel(m.fromRole)}: ${m.message}`)
    .join('\n');

  const userName = leadName || config.labelLead;
  const systemPrompt = getSystemPrompt(businessName, config.prompt);

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: `Konteks percakapan:\n${contextMessages}` },
        { role: 'user', content: `${userName}: ${messageText}` },
      ],
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    });

    const reply = completion.choices[0]?.message?.content;
    if (!reply || reply.trim().length === 0) {
      return fallbackReply();
    }

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${userName}: ${messageText}` },
        ],
        model: config.fallbackModel,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
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

export async function testApiKey(): Promise<{ ok: boolean; reply?: string; error?: string }> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Kamu adalah asisten yang ramah.' },
        { role: 'user', content: 'Halo, balas dengan maksimal 10 kata.' },
      ],
      model: env.GROQ_MODEL,
      max_tokens: 50,
      temperature: 0.3,
    });
    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) return { ok: false, error: 'Empty response from Groq' };
    return { ok: true, reply };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
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
