import { graphql } from '@octokit/graphql';

export const githubOwner = import.meta.env.VITE_GITHUB_OWNER || 'your-username';
export const githubRepo = import.meta.env.VITE_GITHUB_REPO || 'openrate';
export const apiUrl = import.meta.env.VITE_API_URL || '';
export const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

export const githubDiscussionsUrl = `https://github.com/${githubOwner}/${githubRepo}/discussions`;

export function getApiUrl(path: string): string {
  const base = apiUrl || '';
  return `${base}${path}`;
}

export const gql = graphql.defaults({
  headers: {},
});

export function gqlWithToken(token: string) {
  return graphql.defaults({
    headers: { authorization: `token ${token}` },
  });
}

export function getNewBusinessUrl(): string {
  const body = encodeURIComponent(`---
type: business
slug: my-business
category: food-drink
location: "City, Country"
website: https://example.com
---

Describe the business here.`);
  return `${githubDiscussionsUrl}/new?category=Businesses&title=${encodeURIComponent('Business: My Business')}&body=${body}`;
}

export function getNewReviewUrl(businessTitle: string, businessSlug: string): string {
  const body = encodeURIComponent(`---
type: review
business: ${businessSlug}
rating: 5
reviewer:
  mode: github-public
  github_login: YOUR_GITHUB_USERNAME
photos: []
---

Write your review here.`);
  return `${githubDiscussionsUrl}/new?category=Reviews&title=${encodeURIComponent(`Review: ${businessTitle} ★★★★★`)}&body=${body}`;
}

export function getOwnerClaimUrl(businessSlug: string): string {
  const repo = `${githubOwner}/${githubRepo}`;
  const title = encodeURIComponent(`Claim ownership: ${businessSlug}`);
  const body = encodeURIComponent(`I am requesting verified owner access for \`${businessSlug}\`.

Please add my GitHub username to \`config/business-owners.yaml\`:

\`\`\`yaml
${businessSlug}:
  owners: [YOUR_GITHUB_USERNAME]
  verified_at: ${new Date().toISOString().slice(0, 10)}
\`\`\`
`);
  return `https://github.com/${repo}/compare/main...main?quick_pull=1&title=${title}&body=${body}`;
}
