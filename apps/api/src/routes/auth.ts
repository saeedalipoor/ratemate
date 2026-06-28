import { Hono } from 'hono';
import type { Env } from '../env';
import { clearSessionCookie, getSessionUser, setSessionCookie } from '../lib/session';

const auth = new Hono<{ Bindings: Env }>();

auth.get('/github', (c) => {
  const state = crypto.randomUUID();
  const secure = c.env.FRONTEND_URL.startsWith('https');
  c.header(
    'Set-Cookie',
    `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure ? '; Secure' : ''}`,
  );

  const redirectUri = new URL('/auth/callback', c.req.url).toString();
  const params = new URLSearchParams({
    client_id: c.env.GITHUB_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'public_repo read:user',
    state,
  });

  return c.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

auth.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const cookie = c.req.header('Cookie') ?? '';
  const stateMatch = cookie.match(/oauth_state=([^;]+)/);
  const savedState = stateMatch?.[1];

  if (!code || !state || !savedState || state !== savedState) {
    return c.redirect(`${c.env.FRONTEND_URL}/?auth=failed`);
  }

  const redirectUri = new URL('/auth/callback', c.req.url).toString();
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      client_id: c.env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: c.env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return c.redirect(`${c.env.FRONTEND_URL}/?auth=failed`);
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
  };

  if (!tokenData.access_token) {
    return c.redirect(`${c.env.FRONTEND_URL}/?auth=failed`);
  }

  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      authorization: `Bearer ${tokenData.access_token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    },
  });

  if (!userResponse.ok) {
    return c.redirect(`${c.env.FRONTEND_URL}/?auth=failed`);
  }

  const user = (await userResponse.json()) as {
    login: string;
    avatar_url: string;
  };

  await setSessionCookie(c, {
    login: user.login,
    avatarUrl: user.avatar_url,
    accessToken: tokenData.access_token,
  });

  return c.redirect(`${c.env.FRONTEND_URL}/?auth=success`);
});

auth.get('/me', async (c) => {
  const user = await getSessionUser(c);
  if (!user) {
    return c.json({ authenticated: false });
  }

  return c.json({
    authenticated: true,
    login: user.login,
    avatarUrl: user.avatarUrl,
  });
});

auth.post('/logout', async (c) => {
  await clearSessionCookie(c);
  return c.json({ ok: true });
});

export default auth;
