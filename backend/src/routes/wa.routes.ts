import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { baileysManager } from '../services/baileys.service';
import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';

const router = Router();

router.get('/qr', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.user!;
    let cred = await prisma.waCredential.findFirst({ where: { businessId } });

    if (!cred) {
      cred = await prisma.waCredential.create({
        data: {
          businessId,
          waNumber: 'pending',
          status: 'DISCONNECTED',
        },
      });
    }

    const qrCode = await baileysManager.connect(businessId, true);

    const updated = await prisma.waCredential.findFirst({ where: { businessId } });
    res.json({ qrCode: qrCode || updated?.qrCode, status: updated?.status, expiresAt: updated?.qrExpiresAt });
  } catch (err) { next(err); }
});

router.get('/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessId } = req.user!;
    const status = baileysManager.getStatus(businessId);
    const cred = await prisma.waCredential.findFirst({
      where: { businessId },
      select: { status: true, waNumber: true, lastConnectedAt: true },
    });

    res.json({
      connection: status,
      credential: cred || null,
    });
  } catch (err) { next(err); }
});

router.post('/disconnect', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await baileysManager.disconnect(req.user!.businessId);
    res.json({ message: 'WhatsApp disconnected' });
  } catch (err) { next(err); }
});

router.post('/reconnect', authenticate, authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await baileysManager.disconnect(req.user!.businessId);
    await baileysManager.connect(req.user!.businessId);
    res.json({ message: 'Reconnecting...' });
  } catch (err) { next(err); }
});

export default router;
