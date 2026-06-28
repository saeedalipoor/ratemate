import type { SessionUser } from '@openrate/shared';
import type { Context } from 'hono';
import type { Env } from '../env';

const COOKIE_NAME = 'openrate_session';

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  );
  return toBase64Url(new Uint8Array(signature));
}

async function createSignedPayload(payload: SessionUser, secret: string): Promise<string> {
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(encoded, secret);
  return `${encoded}.${signature}`;
}

async function verifySignedPayload(
  token: string,
  secret: string,
): Promise<SessionUser | null> {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expected = await sign(encoded, secret);
  if (expected !== signature) return null;

  try {
    const json = new TextDecoder().decode(fromBase64Url(encoded));
    return JSON.parse(json) as SessionUser;
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  c: Context<{ Bindings: Env }>,
  user: SessionUser,
): Promise<void> {
  const token = await createSignedPayload(user, c.env.OAUTH_COOKIE_SECRET);
  const secure = c.env.FRONTEND_URL.startsWith('https');
  c.header(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure ? '; Secure' : ''}`,
  );
}

export async function clearSessionCookie(c: Context<{ Bindings: Env }>): Promise<void> {
  const secure = c.env.FRONTEND_URL.startsWith('https');
  c.header(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`,
  );
}

export async function getSessionUser(
  c: Context<{ Bindings: Env }>,
): Promise<SessionUser | null> {
  const cookie = c.req.header('Cookie') ?? '';
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match?.[1]) return null;
  return verifySignedPayload(match[1], c.env.OAUTH_COOKIE_SECRET);
}

export function getClientIp(c: Context): string {
  return (
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
