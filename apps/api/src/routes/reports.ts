import { buildReportBody, DISCUSSION_CATEGORIES } from '@openrate/shared';
import { Hono } from 'hono';
import type { Env } from '../env';
import {
  createDiscussion,
  getAppGraphql,
  getCategoryId,
  getRepositoryId,
} from '../github/app';
import { checkRateLimit, sanitizeText, verifyTurnstile } from '../lib/security';
import { getClientIp } from '../lib/session';

const reports = new Hono<{ Bindings: Env }>();

reports.post('/', async (c) => {
  const body = await c.req.json<{
    reviewUrl: string;
    reviewNumber: number;
    reason: string;
    details: string;
    turnstileToken: string;
  }>();

  const ip = getClientIp(c);
  const allowed = await checkRateLimit(c.env.RATE_LIMIT, `report:${ip}`, 5, 3600);
  if (!allowed) {
    return c.json({ error: 'Rate limit exceeded.' }, 429);
  }

  const captchaOk = await verifyTurnstile(
    c.env.TURNSTILE_SECRET,
    body.turnstileToken,
    ip,
  );
  if (!captchaOk) {
    return c.json({ error: 'Captcha verification failed.' }, 400);
  }

  if (!body.reviewUrl || !body.reviewNumber || !body.reason?.trim()) {
    return c.json({ error: 'Invalid report payload.' }, 400);
  }

  const discussionBody = buildReportBody({
    reviewUrl: body.reviewUrl,
    reviewNumber: body.reviewNumber,
    reason: sanitizeText(body.reason, 100),
    details: sanitizeText(body.details ?? '', 2000),
  });

  const title = `Report: review #${body.reviewNumber}`;

  try {
    const gql = await getAppGraphql(c.env);
    const repositoryId = await getRepositoryId(c.env, gql);
    const categoryId = await getCategoryId(
      c.env,
      gql,
      DISCUSSION_CATEGORIES.reports,
    );

    const discussion = await createDiscussion(gql, {
      repositoryId,
      categoryId,
      title,
      body: discussionBody,
    });

    return c.json({ ok: true, url: discussion.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit report';
    return c.json({ error: message }, 500);
  }
});

export default reports;
