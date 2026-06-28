import { Hono } from 'hono';
import type { Env } from '../env';
import { isBusinessOwner } from '../lib/owners';
import { getSessionUser } from '../lib/session';

const owner = new Hono<{ Bindings: Env }>();

owner.get('/verify', async (c) => {
  const session = await getSessionUser(c);
  if (!session) {
    return c.json({ authenticated: false, isOwner: false });
  }

  const business = c.req.query('business');
  if (!business) {
    return c.json({ error: 'business query param required' }, 400);
  }

  const isOwner = await isBusinessOwner(c.env, business, session.login);
  return c.json({
    authenticated: true,
    login: session.login,
    isOwner,
  });
});

export default owner;
