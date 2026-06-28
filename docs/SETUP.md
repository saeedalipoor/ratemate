# OpenRate setup guide

This guide walks through configuring GitHub Discussions, OAuth, the GitHub App, Cloudflare Worker secrets, and GitHub Pages deployment.

## 1. Create the GitHub repository

1. Create a public repository (for example `ratemate`).
2. Push this codebase to `main`.
3. Enable **Discussions** under repository Settings → General → Features.

## 2. Create discussion categories

In the Discussions tab, create exactly these categories (names are case-sensitive in the app):

| Name | Purpose |
|---|---|
| Businesses | Business profile pages |
| Reviews | Customer reviews |
| Reports | Flagged review moderation queue |

Optional: add discussion templates from [`.github/DISCUSSION_TEMPLATE/`](../../.github/DISCUSSION_TEMPLATE/).

## 3. Register a GitHub OAuth App

Used for user sign-in and owner replies.

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. **Homepage URL:** your GitHub Pages URL or `http://localhost:5173` for dev
3. **Callback URL:** `https://YOUR-WORKER.workers.dev/auth/callback` (or `http://localhost:8787/auth/callback` for local Wrangler)
4. Note the **Client ID** and generate a **Client secret**
5. Scopes requested by the app: `public_repo`, `read:user`

Store as Worker secrets:

- `GITHUB_OAUTH_CLIENT_ID`
- `GITHUB_OAUTH_CLIENT_SECRET`

## 4. Register a GitHub App

Used to post anonymous/hidden-identity reviews and upload photos.

1. GitHub → Settings → Developer settings → GitHub Apps → New GitHub App
2. **Webhook:** inactive (not required for this project)
3. **Repository permissions:**
   - Contents: Read and write
   - Discussions: Read and write
   - Metadata: Read-only
4. **Where can this app be installed?** Only on this account
5. Create the app and generate a **private key**
6. Install the app on your `openrate` repository

Store as Worker secrets:

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY` (PEM contents; use `\n` for newlines in Wrangler secrets)

## 5. Configure Cloudflare Worker

1. Create a Cloudflare account and install Wrangler locally (`pnpm --filter api exec wrangler login
`)
2. Update [`apps/api/wrangler.toml`](../apps/api/wrangler.toml):
   - `GITHUB_OWNER`
   - `GITHUB_REPO`
   - `FRONTEND_URL` (your GitHub Pages URL)
3. Set secrets:

```bash
cd apps/api
wrangler secret put GITHUB_APP_ID
wrangler secret put GITHUB_APP_PRIVATE_KEY
wrangler secret put GITHUB_OAUTH_CLIENT_ID
wrangler secret put GITHUB_OAUTH_CLIENT_SECRET
wrangler secret put OAUTH_COOKIE_SECRET
wrangler secret put TURNSTILE_SECRET
```

4. Optional: create a KV namespace for rate limiting and uncomment the `[[kv_namespaces]]` block in `wrangler.toml`.

### Cloudflare Turnstile (recommended)

1. Cloudflare dashboard → Turnstile → Add site
2. Set `VITE_TURNSTILE_SITE_KEY` in the web app
3. Set `TURNSTILE_SECRET` in the Worker

For local development without Turnstile, leave keys empty — the app uses a dev bypass token.

## 6. Configure the web app

Copy `apps/web/.env.example` to `apps/web/.env`:

```env
VITE_GITHUB_OWNER=your-username
VITE_GITHUB_REPO=ratemate
VITE_API_URL=https://YOUR-WORKER.workers.dev
VITE_TURNSTILE_SITE_KEY=your-site-key
```

For local dev, leave `VITE_API_URL` empty — Vite proxies `/auth` and `/api` to Wrangler on port 8787.

## 7. Business owner verification

Owners are listed in [`config/business-owners.yaml`](../config/business-owners.yaml).

1. Business owner opens a PR using the [owner claim template](../.github/pull_request_template.md)
2. Maintainer verifies ownership
3. After merge, the listed GitHub username can post owner replies on reviews for that business slug

## 8. GitHub Actions secrets

Add these repository secrets for CI deployment:

| Secret | Used by |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Worker deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Worker deploy |
| `VITE_GITHUB_OWNER` | Pages build |
| `VITE_GITHUB_REPO` | Pages build |
| `VITE_API_URL` | Pages build |
| `VITE_TURNSTILE_SITE_KEY` | Pages build |

Enable GitHub Pages: Settings → Pages → Source: **GitHub Actions**.

## 9. Seed sample data (optional)

Create two discussions manually to test:

**Businesses category**

```markdown
---
type: business
slug: acme-coffee
category: food-drink
location: "Portland, OR"
website: https://example.com
---

A cozy neighborhood coffee shop.
```

**Reviews category**

```markdown
---
type: review
business: acme-coffee
rating: 5
reviewer:
  mode: anonymous
  github_login: null
photos: []
---

Great espresso and friendly staff.
```

## 10. Local development

```bash
pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars
cp apps/web/.env.example apps/web/.env
pnpm dev
```

Fill in `.dev.vars` with your GitHub App and OAuth credentials to test writes locally.
