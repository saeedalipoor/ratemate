import { parse as parseYaml } from 'yaml';
import type { Env } from '../env';

export interface OwnerRecord {
  owners: string[];
  verified_at?: string;
}

export type OwnersConfig = Record<string, OwnerRecord>;

export async function fetchOwnersConfig(env: Env): Promise<OwnersConfig> {
  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/config/business-owners.yaml`,
    {
      headers: {
        accept: 'application/vnd.github.raw',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'ratemate-app',
      },
    },
  );

  if (response.status === 404) {
    return {};
  }

  if (!response.ok) {
    throw new Error(`Failed to load business owners config: ${response.status}`);
  }

  const text = await response.text();
  return (parseYaml(text) ?? {}) as OwnersConfig;
}

export async function isBusinessOwner(
  env: Env,
  businessSlug: string,
  login: string,
): Promise<boolean> {
  const config = await fetchOwnersConfig(env);
  const record = config[businessSlug];
  if (!record?.owners?.length) return false;
  return record.owners.some(
    (owner) => owner.toLowerCase() === login.toLowerCase(),
  );
}
