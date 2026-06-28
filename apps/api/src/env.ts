export interface Env {
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  FRONTEND_URL: string;
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_OAUTH_CLIENT_ID: string;
  GITHUB_OAUTH_CLIENT_SECRET: string;
  OAUTH_COOKIE_SECRET: string;
  TURNSTILE_SECRET?: string;
  RATE_LIMIT?: KVNamespace;
}
