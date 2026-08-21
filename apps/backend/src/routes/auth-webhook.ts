import express from 'express';
import prisma from '../prisma';

export const authWebhookRouter = express.Router();

// This endpoint is intended to be called by Supabase Auth webhook (server-side)
// or by the frontend after signup to create the Prisma user record.
// Configure Supabase to POST signup events to /api/auth-webhook/supabase or
// call this endpoint from the client after successful sign up.

authWebhookRouter.post('/supabase', async (req, res) => {
  try {
    const payload = req.body;
    // Supabase webhook payload varies; accept both direct user object or nested event
    const user = payload?.user || payload?.record || payload;
    if (!user || !user.id || !user.email) return res.status(400).json({ error: 'invalid payload' });

    // Upsert user in Prisma using Supabase user id as primary key
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email, name: user.user_metadata?.full_name || user.user_metadata?.name || undefined },
      create: { id: user.id, email: user.email, name: user.user_metadata?.full_name || user.user_metadata?.name || undefined, role: 'CUSTOMER' },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('auth webhook error', err);
    return res.status(500).json({ error: 'server error' });
  }
});
