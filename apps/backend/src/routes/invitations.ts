import express from 'express';
import prisma from '../prisma';
import { nanoid } from 'nanoid';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';

export const invitationsRouter = express.Router();

// Invite a user by email to a company (only company_admin or admin allowed)
invitationsRouter.post('/invite', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { email, companyId } = req.body;
    if (!email || !companyId) return res.status(400).json({ error: 'missing fields' });

    // Basic permission check: requester must be ADMIN or COMPANY_ADMIN for that company
    const requester = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!requester) return res.status(403).json({ error: 'requester not found' });

    if (requester.role !== 'ADMIN' && !(requester.role === 'COMPANY_ADMIN' && requester.companyId === companyId)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const token = nanoid(40);
    const invite = await prisma.invitation.create({
      data: { email, token, companyId, invitedById: requester.id },
    });

    // In production: send email with link to accept invite (/accept-invite?token=...)
    // For development return token (DO NOT expose in production)
    return res.json({ invitationId: invite.id, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Accept invite: user must be authenticated (send Authorization: Bearer <access_token>)
invitationsRouter.post('/accept', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'missing token' });

    const invite = await prisma.invitation.findUnique({ where: { token } });
    if (!invite) return res.status(404).json({ error: 'invitation not found' });
    if (invite.accepted) return res.status(400).json({ error: 'already accepted' });

    // Link user (by email) to the company
    const userEmail = req.user.email;
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return res.status(404).json({ error: 'user not found in DB. Ensure you created a user record after Supabase signup' });

    await prisma.user.update({ where: { id: user.id }, data: { companyId: invite.companyId } });
    await prisma.invitation.update({ where: { id: invite.id }, data: { accepted: true } });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});
