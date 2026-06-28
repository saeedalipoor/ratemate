import { Hono } from 'hono';
import type { Env } from '../env';
import { clearSessionCookie, getSessionUser, setSessionCookie } from '../lib/session';

const auth = new Hono<{ Bindings: Env }>();

async function signState(state: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(state));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${state}.${b64}`;
}

async function verifyState(token: string, secret: string): Promise<string | null> {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const state = token.slice(0, dot);
  const expected = await signState(state, secret);
  return expected === token ? state : null;
}

auth.get('/github', async (c) => {
  const nonce = crypto.randomUUID();
  const signedState = await signState(nonce, c.env.OAUTH_COOKIE_SECRET);
  const redirectUri = `${c.env.FRONTEND_URL}/auth/callback`;
  const params = new URLSearchParams({
    client_id: c.env.GITHUB_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'public_repo read:user',
    state: signedState,
  });

  return c.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

auth.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code || !state) {
    return c.redirect(`${c.env.FRONTEND_URL}/?auth=failed`);
  }

  const validState = await verifyState(state, c.env.OAUTH_COOKIE_SECRET);
  if (!validState) {
    return c.redirect(`${c.env.FRONTEND_URL}/?auth=failed`);
  }

  const redirectUri = `${c.env.FRONTEND_URL}/auth/callback`;
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
    console.error('[auth] token exchange HTTP error:', tokenResponse.status);
    return c.redirect(`${c.env.FRONTEND_URL}/?auth=failed`);
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenData.access_token) {
    console.error('[auth] no access_token:', JSON.stringify(tokenData));
    return c.redirect(`${c.env.FRONTEND_URL}/?auth=failed`);
  }

  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      authorization: `Bearer ${tokenData.access_token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'ratemate-app',
    },
  });

  if (!userResponse.ok) {
    console.error('[auth] user fetch error:', userResponse.status);
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
