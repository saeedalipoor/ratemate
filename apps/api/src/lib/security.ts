export async function verifyTurnstile(
  secret: string | undefined,
  token: string,
  ip: string,
): Promise<boolean> {
  if (!secret) {
    return token === 'dev-bypass';
  }

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
  });

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });

  if (!response.ok) return false;
  const data = (await response.json()) as { success: boolean };
  return data.success;
}

export async function checkRateLimit(
  kv: KVNamespace | undefined,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  if (!kv) return true;

  const current = await kv.get(key);
  const count = current ? Number.parseInt(current, 10) : 0;
  if (count >= limit) return false;

  await kv.put(key, String(count + 1), { expirationTtl: windowSeconds });
  return true;
}

export function sanitizeText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function isValidRating(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}
