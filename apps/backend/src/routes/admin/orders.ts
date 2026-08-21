import express from 'express';
import prisma from '../../prisma';
import { requireAuth, AuthRequest } from '../../middleware/requireAuth';

export const adminOrdersRouter = express.Router();

// Approve an Order with method OC (Orden de Compra)
adminOrdersRouter.post('/:orderId/approve-oc', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params;

    const requester = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!requester) return res.status(403).json({ error: 'requester not found' });

    // Only ADMIN or COMPANY_ADMIN allowed
    if (requester.role !== 'ADMIN' && requester.role !== 'COMPANY_ADMIN') {
      return res.status(403).json({ error: 'forbidden' });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    if (!order) return res.status(404).json({ error: 'order not found' });
    if (order.status !== 'PENDING_OC') return res.status(400).json({ error: 'order not in PENDING_OC' });

    // Confirm or create payment and set statuses
    let payment = order.payment as any;
    if (!payment) {
      payment = await prisma.payment.create({
        data: { orderId: order.id, method: 'OC', status: 'CONFIRMED' },
      });
    } else {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'CONFIRMED' } });
    }

    await prisma.order.update({ where: { id: order.id }, data: { status: 'PAID' } });

    // TODO: trigger notifications (email/webhook)
    return res.json({ ok: true, orderId: order.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Reject an OC
adminOrdersRouter.post('/:orderId/reject-oc', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params;
    const requester = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!requester) return res.status(403).json({ error: 'requester not found' });
    if (requester.role !== 'ADMIN' && requester.role !== 'COMPANY_ADMIN') {
      return res.status(403).json({ error: 'forbidden' });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    if (!order) return res.status(404).json({ error: 'order not found' });
    if (order.status !== 'PENDING_OC') return res.status(400).json({ error: 'order not in PENDING_OC' });

    await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
    // Optionally update payment status if exists
    if (order.payment) {
      await prisma.payment.update({ where: { id: order.payment.id }, data: { status: 'FAILED' } });
    }

    return res.json({ ok: true, orderId: order.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});
