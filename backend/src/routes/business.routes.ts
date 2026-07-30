import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../config/prisma';

const router = Router();

const aiConfigSchema = z.object({
  prompt: z.string().optional(),
  model: z.string().optional(),
  fallbackModel: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(8192).optional(),
  dailyCap: z.number().min(0).optional(),
  contextLimit: z.number().min(1).max(100).optional(),
  labelLead: z.string().optional(),
  labelHuman: z.string().optional(),
  labelAI: z.string().optional(),
});

router.get('/ai-config', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user!.businessId },
      select: { aiConfig: true },
    });
    res.json(business?.aiConfig || {});
  } catch (err) { next(err); }
});

router.put('/ai-config', authenticate, validate(aiConfigSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user!.businessId },
      select: { aiConfig: true },
    });
    const current = (business?.aiConfig as Record<string, unknown>) || {};
    const updated = await prisma.business.update({
      where: { id: req.user!.businessId },
      data: { aiConfig: { ...current, ...req.body } },
      select: { aiConfig: true },
    });
    res.json(updated.aiConfig);
  } catch (err) { next(err); }
});

export default router;