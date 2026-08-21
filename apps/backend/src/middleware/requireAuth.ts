import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin';

export interface AuthRequest extends Request {
  user?: any;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'missing auth header' });
    const parts = auth.split(' ');
    if (parts.length !== 2) return res.status(401).json({ error: 'invalid auth header' });
    const token = parts[1];

    const { data, error } = await supabaseAdmin.auth.getUser(token as string);
    if (error || !data?.user) return res.status(401).json({ error: 'invalid token' });

    req.user = { id: data.user.id, email: data.user.email };
    return next();
  } catch (err) {
    console.error('requireAuth error', err);
    return res.status(500).json({ error: 'server error' });
  }
}
