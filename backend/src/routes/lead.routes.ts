import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';

const router = Router();

const createLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  waNumber: z.string().min(5).max(15),
  segment: z.string().max(50).optional(),
  labels: z.array(z.string()).optional(),
});

const updateLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  segment: z.string().max(50).optional(),
  labels: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CONVERTED', 'BLOCKED']).optional(),
});

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.user!;
    const status = req.query.status as string | undefined;
    const segment = req.query.segment as string | undefined;
    const search = req.query.search as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = { businessId };
    if (status) where.status = status;
    if (segment) where.segment = segment;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { waNumber: { contains: search } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ data: leads, total, page, limit });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id as string, businessId: req.user!.businessId },
    });
    if (!lead) throw new NotFoundError('Lead');
    res.json(lead);
  } catch (err) { next(err); }
});

router.post('/', authenticate, validate(createLeadSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = await prisma.lead.create({
      data: {
        businessId: req.user!.businessId,
        ...req.body,
        labels: req.body.labels || [],
      },
    });
    res.status(201).json(lead);
  } catch (err) { next(err); }
});

router.patch('/:id', authenticate, validate(updateLeadSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.lead.findFirst({
      where: { id, businessId: req.user!.businessId },
    });
    if (!existing) throw new NotFoundError('Lead');

    const lead = await prisma.lead.update({
      where: { id },
      data: req.body,
    });
    res.json(lead);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.lead.findFirst({
      where: { id, businessId: req.user!.businessId },
    });
    if (!existing) throw new NotFoundError('Lead');

    await prisma.lead.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
    res.json({ message: 'Lead soft-deleted' });
  } catch (err) { next(err); }
});

router.post('/import', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.user!;
    const { leads: leadsData } = req.body;

    if (!Array.isArray(leadsData)) {
      return res.status(400).json({ error: { message: 'leads must be an array' } });
    }

    const results = { imported: 0, skipped: 0, errors: 0 };
    for (const data of leadsData) {
      try {
        const waNumber = String(data.waNumber).replace(/[^0-9]/g, '');
        if (waNumber.length < 5) { results.errors++; continue; }

        const existing = await prisma.lead.findUnique({
          where: { businessId_waNumber: { businessId, waNumber } },
        });
        if (existing) { results.skipped++; continue; }

        await prisma.lead.create({
          data: {
            businessId,
            name: data.name || null,
            waNumber,
            segment: data.segment || null,
            labels: data.labels || [],
          },
        });
        results.imported++;
      } catch { results.errors++; }
    }

    res.status(201).json(results);
  } catch (err) { next(err); }
});

router.get('/export', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { businessId: req.user!.businessId },
      select: { name: true, waNumber: true, segment: true, labels: true, score: true, status: true, intent: true, lastMessageAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const headers = 'name,waNumber,segment,labels,score,status,intent,lastMessageAt,createdAt\n';
    const csv = headers + leads.map(l =>
      `${escapeCsv(l.name || '')},${l.waNumber},${escapeCsv(l.segment || '')},"${l.labels.join(';')}",${l.score},${l.status},${l.intent || ''},${l.lastMessageAt?.toISOString() || ''},${l.createdAt.toISOString()}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    res.send(csv);
  } catch (err) { next(err); }
});

function escapeCsv(val: string): string {
  return `"${val.replace(/"/g, '""')}"`;
}

export default router;
