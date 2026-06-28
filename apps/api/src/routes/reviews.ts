import { buildReviewBody, DISCUSSION_CATEGORIES } from '@openrate/shared';
import { Hono } from 'hono';
import type { Env } from '../env';
import {
  createDiscussion,
  getAppGraphql,
  getCategoryId,
  getRepositoryId,
} from '../github/app';
import { isBusinessOwner } from '../lib/owners';
import {
  checkRateLimit,
  isValidRating,
  sanitizeText,
  verifyTurnstile,
} from '../lib/security';
import { getClientIp, getSessionUser } from '../lib/session';

const reviews = new Hono<{ Bindings: Env }>();

reviews.post('/anonymous', async (c) => {
  const body = await c.req.json<{
    business: string;
    businessTitle?: string;
    rating: number;
    text: string;
    photos?: string[];
    turnstileToken: string;
    hideIdentity?: boolean;
  }>();

  const ip = getClientIp(c);
  const allowed = await checkRateLimit(
    c.env.RATE_LIMIT,
    `review:${ip}`,
    3,
    3600,
  );
  if (!allowed) {
    return c.json({ error: 'Rate limit exceeded. Try again later.' }, 429);
  }

  const captchaOk = await verifyTurnstile(
    c.env.TURNSTILE_SECRET,
    body.turnstileToken,
    ip,
  );
  if (!captchaOk) {
    return c.json({ error: 'Captcha verification failed.' }, 400);
  }

  if (!body.business || !isValidRating(body.rating) || !body.text?.trim()) {
    return c.json({ error: 'Invalid review payload.' }, 400);
  }

  const session = await getSessionUser(c);
  const reviewerMode = session
    ? body.hideIdentity
      ? 'github-anonymous'
      : 'github-public'
    : 'anonymous';

  if (reviewerMode === 'github-public' && session) {
    return c.json(
      {
        error:
          'Public GitHub reviews must be submitted with your GitHub identity from the web app.',
      },
      400,
    );
  }

  const reviewText = sanitizeText(body.text, 5000);
  const discussionBody = buildReviewBody({
    business: body.business,
    rating: body.rating,
    reviewer: {
      mode: reviewerMode,
      github_login: null,
    },
    photos: body.photos ?? [],
    text: reviewText,
  });

  const stars = '★'.repeat(body.rating) + '☆'.repeat(5 - body.rating);
  const title = `Review: ${body.businessTitle ?? body.business} ${stars}`;

  try {
    const gql = await getAppGraphql(c.env);
    const repositoryId = await getRepositoryId(c.env, gql);
    const categoryId = await getCategoryId(
      c.env,
      gql,
      DISCUSSION_CATEGORIES.reviews,
    );

    const discussion = await createDiscussion(gql, {
      repositoryId,
      categoryId,
      title,
      body: discussionBody,
    });

    return c.json({
      ok: true,
      number: discussion.number,
      url: discussion.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create review';
    return c.json({ error: message }, 500);
  }
});

reviews.post('/public', async (c) => {
  const session = await getSessionUser(c);
  if (!session) {
    return c.json({ error: 'Authentication required.' }, 401);
  }

  const body = await c.req.json<{
    business: string;
    businessTitle?: string;
    rating: number;
    text: string;
    photos?: string[];
  }>();

  if (!body.business || !isValidRating(body.rating) || !body.text?.trim()) {
    return c.json({ error: 'Invalid review payload.' }, 400);
  }

  const reviewText = sanitizeText(body.text, 5000);
  const discussionBody = buildReviewBody({
    business: body.business,
    rating: body.rating,
    reviewer: {
      mode: 'github-public',
      github_login: session.login,
    },
    photos: body.photos ?? [],
    text: reviewText,
  });

  const stars = '★'.repeat(body.rating) + '☆'.repeat(5 - body.rating);
  const title = `Review: ${body.businessTitle ?? body.business} ${stars}`;

  try {
    const { getUserGraphql } = await import('../github/app');
    const gql = await getUserGraphql(session.accessToken);
    const repositoryId = await getRepositoryId(c.env, gql);
    const categoryId = await getCategoryId(
      c.env,
      gql,
      DISCUSSION_CATEGORIES.reviews,
    );

    const discussion = await createDiscussion(gql, {
      repositoryId,
      categoryId,
      title,
      body: discussionBody,
    });

    return c.json({
      ok: true,
      number: discussion.number,
      url: discussion.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create review';
    return c.json({ error: message }, 500);
  }
});

reviews.post('/:number/reply', async (c) => {
  const session = await getSessionUser(c);
  if (!session) {
    return c.json({ error: 'Authentication required.' }, 401);
  }

  const number = Number.parseInt(c.req.param('number'), 10);
  const body = await c.req.json<{ business: string; text: string }>();

  if (!body.business || !body.text?.trim()) {
    return c.json({ error: 'Invalid reply payload.' }, 400);
  }

  const owner = await isBusinessOwner(c.env, body.business, session.login);
  if (!owner) {
    return c.json({ error: 'You are not an verified owner of this business.' }, 403);
  }

  try {
    const { getUserGraphql } = await import('../github/app');
    const gql = await getUserGraphql(session.accessToken);

    const lookup = await gql<{
      repository: {
        discussion: { id: string } | null;
      };
    }>(
      `query($owner: String!, $name: String!, $number: Int!) {
        repository(owner: $owner, name: $name) {
          discussion(number: $number) { id }
        }
      }`,
      { owner: c.env.GITHUB_OWNER, name: c.env.GITHUB_REPO, number },
    );

    const discussionId = lookup.repository.discussion?.id;
    if (!discussionId) {
      return c.json({ error: 'Review not found.' }, 404);
    }

    const reply = await gql<{
      addDiscussionComment: {
        comment: { id: string; url: string };
      };
    }>(
      `mutation($input: AddDiscussionCommentInput!) {
        addDiscussionComment(input: $input) {
          comment { id url }
        }
      }`,
      {
        input: {
          discussionId,
          body: sanitizeText(body.text, 3000),
        },
      },
    );

    return c.json({
      ok: true,
      url: reply.addDiscussionComment.comment.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to post reply';
    return c.json({ error: message }, 500);
  }
});

export default reviews;
