import { Hono } from 'hono';
import type { Env } from '../env';
import { getSessionUser } from '../lib/session';

const uploads = new Hono<{ Bindings: Env }>();

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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
  const path = `media/reviews/${filename}`;
  const bytes = new Uint8Array(await upload.arrayBuffer());
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const content = btoa(binary);

  try {
    const { createAppAuth } = await import('@octokit/auth-app');
    const auth = createAppAuth({
      appId: c.env.GITHUB_APP_ID,
      privateKey: c.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    const appAuth = await auth({ type: 'app' });
    const installationResponse = await fetch(
      `https://api.github.com/repos/${c.env.GITHUB_OWNER}/${c.env.GITHUB_REPO}/installation`,
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

    const commitMessage = session
      ? `Upload review photo by @${session.login}`
      : 'Upload anonymous review photo';

    const response = await fetch(
      `https://api.github.com/repos/${c.env.GITHUB_OWNER}/${c.env.GITHUB_REPO}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${installationAuth.token}`,
          accept: 'application/vnd.github+json',
          'content-type': 'application/json',
          'x-github-api-version': '2022-11-28',
          'user-agent': 'ratemate-app',
        },
        body: JSON.stringify({
          message: commitMessage,
          content,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return c.json({ error: `Upload failed: ${errorText}` }, 500);
    }

    return c.json({
      ok: true,
      path,
      url: `https://raw.githubusercontent.com/${c.env.GITHUB_OWNER}/${c.env.GITHUB_REPO}/main/${path}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return c.json({ error: message }, 500);
  }
});

export default uploads;
