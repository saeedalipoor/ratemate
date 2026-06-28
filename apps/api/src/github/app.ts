import { createAppAuth } from '@octokit/auth-app';
import { graphql, type GraphQlQueryResponseData } from '@octokit/graphql';
import type { Env } from '../env';

export type GithubGraphql = <T = GraphQlQueryResponseData>(
  query: string,
  variables?: Record<string, unknown>,
) => Promise<T>;

export async function getAppGraphql(env: Env): Promise<GithubGraphql> {
  const auth = createAppAuth({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'),
  });

  const installation = await auth({
    type: 'installation',
    installationId: await getInstallationId(env, auth),
  });

  return graphql.defaults({
    headers: { authorization: `token ${installation.token}` },
  }) as GithubGraphql;
}

async function getInstallationId(
  env: Env,
  auth: ReturnType<typeof createAppAuth>,
) {
  const appAuth = await auth({ type: 'app' });
  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/installation`,
    {
      headers: {
        authorization: `Bearer ${appAuth.token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to resolve GitHub App installation: ${response.status}`);
  }

  const data = (await response.json()) as { id: number };
  return data.id;
}

export async function getUserGraphql(accessToken: string): Promise<GithubGraphql> {
  return graphql.defaults({
    headers: { authorization: `token ${accessToken}` },
  }) as GithubGraphql;
}

export async function getRepositoryId(env: Env, gql: GithubGraphql) {
  const result = await gql<{
    repository: { id: string };
  }>(
    `query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) { id }
    }`,
    { owner: env.GITHUB_OWNER, name: env.GITHUB_REPO },
  );

  return result.repository.id;
}

export async function getCategoryId(
  env: Env,
  gql: GithubGraphql,
  categoryName: string,
) {
  const result = await gql<{
    repository: {
      discussionCategories: {
        nodes: Array<{ id: string; name: string }>;
      };
    };
  }>(
    `query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        discussionCategories(first: 25) {
          nodes { id name }
        }
      }
    }`,
    { owner: env.GITHUB_OWNER, name: env.GITHUB_REPO },
  );

  const category = result.repository.discussionCategories.nodes.find(
    (node: { id: string; name: string }) =>
      node.name.toLowerCase() === categoryName.toLowerCase(),
  );

  if (!category) {
    throw new Error(`Discussion category "${categoryName}" not found`);
  }

  return category.id;
}

export async function createDiscussion(
  gql: GithubGraphql,
  input: {
    repositoryId: string;
    categoryId: string;
    title: string;
    body: string;
  },
) {
  const result = await gql<{
    createDiscussion: {
      discussion: { id: string; number: number; url: string };
    };
  }>(
    `mutation($input: CreateDiscussionInput!) {
      createDiscussion(input: $input) {
        discussion { id number url }
      }
    }`,
    {
      input: {
        repositoryId: input.repositoryId,
        categoryId: input.categoryId,
        title: input.title,
        body: input.body,
      },
    },
  );

  return result.createDiscussion.discussion;
}
