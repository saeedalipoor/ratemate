import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import auth from './routes/auth';
import owner from './routes/owner';
import reports from './routes/reports';
import reviews from './routes/reviews';
import uploads from './routes/uploads';

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.FRONTEND_URL,
    credentials: true,
  });
  return corsMiddleware(c, next);
});

app.get('/health', (c) => c.json({ ok: true }));

app.route('/auth', auth);
app.route('/api/reviews', reviews);
app.route('/api/reports', reports);
app.route('/api/uploads', uploads);
app.route('/api/owner', owner);

export default app;
