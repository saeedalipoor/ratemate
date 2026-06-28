# RateMate

Open-source rate and review platform backed entirely by **GitHub Discussions**.

Anyone can browse reviews on the web app or directly on GitHub. Submit reviews anonymously through the web app, sign in with GitHub to choose whether your identity is public, and let verified business owners reply with their GitHub identity.

## Features

- Business listings with search and category filters
- Star ratings and text reviews stored as GitHub Discussions
- Anonymous submissions via web app (bot proxy)
- GitHub login with public or hidden identity
- Verified owner replies tied to `config/business-owners.yaml`
- Photo uploads committed to `media/reviews/`
- Report/flag flow via Reports discussions
- Add businesses and reviews directly on GitHub

## Monorepo layout

- `apps/web` — Vite + React SPA (GitHub Pages)
- `apps/api` — Hono API on Cloudflare Workers
- `packages/shared` — shared types and frontmatter helpers
- `config/business-owners.yaml` — verified owner registry

## Quick start

```bash
pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars
cp apps/web/.env.example apps/web/.env
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:8787

See [docs/SETUP.md](docs/SETUP.md) for GitHub App, OAuth App, Discussions categories, and deployment.

## Environment variables

### Web (`apps/web/.env`)

| Variable | Description |
|---|---|
| `VITE_GITHUB_OWNER` | GitHub org or username |
| `VITE_GITHUB_REPO` | Repository name |
| `VITE_API_URL` | API base URL (empty for local proxy) |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |

### API (`apps/api/.dev.vars` / Worker secrets)

| Variable | Description |
|---|---|
| `GITHUB_OWNER` | GitHub org or username |
| `GITHUB_REPO` | Repository name |
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App private key PEM |
| `GITHUB_OAUTH_CLIENT_ID` | OAuth App client ID |
| `GITHUB_OAUTH_CLIENT_SECRET` | OAuth App client secret |
| `OAUTH_COOKIE_SECRET` | Random string for signed session cookies |
| `FRONTEND_URL` | SPA origin for CORS and OAuth redirects |
| `TURNSTILE_SECRET` | Cloudflare Turnstile secret key |

## Known constraints

- GitHub API rate limits apply (~5,000 requests/hour per token)
- Anonymous reviews appear authored by the GitHub App bot on GitHub
- Photo uploads create commits in the repository
- GitHub search indexing may lag behind new discussions

## License

MIT — see [LICENSE](LICENSE).
