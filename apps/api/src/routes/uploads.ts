import { Hono } from 'hono';
import type { Env } from '../env';
import { getSessionUser } from '../lib/session';

const uploads = new Hono<{ Bindings: Env }>();

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

let cachedReleaseId: number | null = null;

async function getMediaReleaseId(env: Env, token: string): Promise<number> {
  if (cachedReleaseId) return cachedReleaseId;

  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/releases/tags/media`,
    {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'ratemate-app',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Media release not found. Create a release tagged "media" in the repo.`);
  }

  const data = (await response.json()) as { id: number };
  cachedReleaseId = data.id;
  return data.id;
}

async function getInstallationToken(env: Env): Promise<string> {
  const { createAppAuth } = await import('@octokit/auth-app');
  const auth = createAppAuth({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'),
  });
  const appAuth = await auth({ type: 'app' });

  const installationResponse = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/installation`,
    {
      headers: {
        authorization: `Bearer ${appAuth.token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'ratemate-app',
      },
    },
  );
  const installation = (await installationResponse.json()) as { id: number };
  const installationAuth = await auth({
    type: 'installation',
    installationId: installation.id,
  });
  return installationAuth.token;
}

uploads.post('/', async (c) => {
  const session = await getSessionUser(c);
  const form = await c.req.formData();
  const file = form.get('file');

  if (!file || typeof file === 'string') {
    return c.json({ error: 'File is required.' }, 400);
  }

  const upload = file as File;

  if (!ALLOWED_TYPES.has(upload.type)) {
    return c.json({ error: 'Unsupported file type.' }, 400);
  }

  if (upload.size > MAX_BYTES) {
    return c.json({ error: 'File exceeds 5 MB limit.' }, 400);
  }

  const extension = upload.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin';
  const filename = `${crypto.randomUUID()}.${extension}`;

  try {
    const token = await getInstallationToken(c.env);
    const releaseId = await getMediaReleaseId(c.env, token);

    const arrayBuffer = await upload.arrayBuffer();
    const uploadUrl = `https://uploads.github.com/repos/${c.env.GITHUB_OWNER}/${c.env.GITHUB_REPO}/releases/${releaseId}/assets?name=${encodeURIComponent(filename)}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'content-type': upload.type,
        'x-github-api-version': '2022-11-28',
        'user-agent': 'ratemate-app',
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[uploads] release asset upload failed:', response.status, errorText);
      return c.json({ error: `Upload failed: ${response.status}` }, 500);
    }

    const asset = (await response.json()) as {
      browser_download_url: string;
      name: string;
    };

    return c.json({
      ok: true,
      url: asset.browser_download_url,
      name: asset.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    console.error('[uploads] error:', message);
    return c.json({ error: message }, 500);
  }
});

export default uploads;
