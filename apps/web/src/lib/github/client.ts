import {
  averageRating,
  parseFrontmatter,
  type Business,
  type BusinessMeta,
  type Review,
  type ReviewComment,
  type ReviewMeta,
} from '@openrate/shared';
import { githubOwner, githubRepo, gql } from '../config';

interface DiscussionNode {
  id: string;
  number: number;
  title: string;
  url: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: { login: string; avatarUrl: string } | null;
}

interface CategoryNode {
  id: string;
  name: string;
}

let categoryCache: Record<string, string> | null = null;

async function getCategoryMap(): Promise<Record<string, string>> {
  if (categoryCache) return categoryCache;

  const result = await gql<{
    repository: {
      discussionCategories: { nodes: CategoryNode[] };
    };
  }>(
    `query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        discussionCategories(first: 25) {
          nodes { id name }
        }
      }
    }`,
    { owner: githubOwner, name: githubRepo },
  );

  categoryCache = Object.fromEntries(
    result.repository.discussionCategories.nodes.map((node) => [
      node.name.toLowerCase(),
      node.id,
    ]),
  );

  return categoryCache;
}

async function fetchDiscussions(categoryName: string, first = 50): Promise<DiscussionNode[]> {
  const categories = await getCategoryMap();
  const categoryId = categories[categoryName.toLowerCase()];
  if (!categoryId) return [];

  const result = await gql<{
    repository: {
      discussions: {
        nodes: DiscussionNode[];
      };
    };
  }>(
    `query($owner: String!, $name: String!, $categoryId: ID!, $first: Int!) {
      repository(owner: $owner, name: $name) {
        discussions(first: $first, categoryId: $categoryId, orderBy: { field: CREATED_AT, direction: DESC }) {
          nodes {
            id
            number
            title
            url
            body
            createdAt
            updatedAt
            author { login avatarUrl }
          }
        }
      }
    }`,
    { owner: githubOwner, name: githubRepo, categoryId, first },
  );

  return result.repository.discussions.nodes;
}

function mapBusiness(node: DiscussionNode): Business | null {
  const { data, content } = parseFrontmatter<Record<string, unknown>>(node.body);
  if (data.type !== 'business' || !data.slug) return null;

  return {
    id: node.id,
    number: node.number,
    title: node.title.replace(/^Business:\s*/i, ''),
    url: node.url,
    body: node.body,
    meta: data as unknown as BusinessMeta,
    description: content,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

function mapReview(node: DiscussionNode): Review | null {
  const { data, content } = parseFrontmatter<Record<string, unknown>>(node.body);
  if (data.type !== 'review' || !data.business || !data.rating) return null;

  const reviewer = (data.reviewer ?? {}) as ReviewMeta['reviewer'];
  const mode = reviewer?.mode ?? 'anonymous';
  const isAnonymous = mode === 'anonymous' || mode === 'github-anonymous';
  const publicLogin =
    mode === 'github-public' ? reviewer?.github_login ?? node.author?.login ?? null : null;

  return {
    id: node.id,
    number: node.number,
    title: node.title,
    url: node.url,
    body: node.body,
    meta: {
      type: 'review',
      business: String(data.business),
      rating: Number(data.rating),
      reviewer: reviewer ?? { mode: 'anonymous' },
      photos: (data.photos as string[] | undefined) ?? [],
    },
    text: content,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    author: {
      login: isAnonymous ? null : publicLogin,
      avatarUrl: isAnonymous ? null : node.author?.avatarUrl ?? null,
      isAnonymous,
    },
  };
}

export async function listBusinesses(): Promise<Business[]> {
  const nodes = await fetchDiscussions('businesses', 100);
  return nodes.map(mapBusiness).filter((item): item is Business => item !== null);
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const businesses = await listBusinesses();
  return businesses.find((business) => business.meta.slug === slug) ?? null;
}

export async function listReviews(): Promise<Review[]> {
  const nodes = await fetchDiscussions('reviews', 100);
  return nodes.map(mapReview).filter((item): item is Review => item !== null);
}

export async function listReviewsForBusiness(businessSlug: string): Promise<Review[]> {
  const reviews = await listReviews();
  return reviews.filter((review) => review.meta.business === businessSlug);
}

export async function getReviewByNumber(number: number): Promise<Review | null> {
  const result = await gql<{
    repository: { discussion: DiscussionNode | null };
  }>(
    `query($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        discussion(number: $number) {
          id
          number
          title
          url
          body
          createdAt
          updatedAt
          author { login avatarUrl }
        }
      }
    }`,
    { owner: githubOwner, name: githubRepo, number },
  );

  if (!result.repository.discussion) return null;
  return mapReview(result.repository.discussion);
}

export async function getReviewComments(number: number): Promise<ReviewComment[]> {
  const result = await gql<{
    repository: {
      discussion: {
        comments: {
          nodes: Array<{
            id: string;
            body: string;
            createdAt: string;
            author: { login: string; avatarUrl: string } | null;
          }>;
        };
      } | null;
    };
  }>(
    `query($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        discussion(number: $number) {
          comments(first: 50) {
            nodes {
              id
              body
              createdAt
              author { login avatarUrl }
            }
          }
        }
      }
    }`,
    { owner: githubOwner, name: githubRepo, number },
  );

  const nodes = result.repository.discussion?.comments.nodes ?? [];
  return nodes
    .filter((node) => node.author?.login)
    .map((node) => ({
      id: node.id,
      body: node.body,
      createdAt: node.createdAt,
      author: {
        login: node.author!.login,
        avatarUrl: node.author!.avatarUrl,
      },
    }));
}

export async function searchDiscussions(query: string): Promise<{
  businesses: Business[];
  reviews: Review[];
}> {
  const searchQuery = `${query} repo:${githubOwner}/${githubRepo} type:discussion`;
  const result = await gql<{
    search: {
      nodes: Array<{
        __typename: string;
        id: string;
        number: number;
        title: string;
        url: string;
        body: string;
        createdAt: string;
        updatedAt: string;
        author: { login: string; avatarUrl: string } | null;
      }>;
    };
  }>(
    `query($query: String!) {
      search(query: $query, type: DISCUSSION, first: 30) {
        nodes {
          __typename
          ... on Discussion {
            id
            number
            title
            url
            body
            createdAt
            updatedAt
            author { login avatarUrl }
          }
        }
      }
    }`,
    { query: searchQuery },
  );

  const businesses: Business[] = [];
  const reviews: Review[] = [];

  for (const node of result.search.nodes) {
    if (node.__typename !== 'Discussion') continue;
    const business = mapBusiness(node);
    const review = mapReview(node);
    if (business) businesses.push(business);
    if (review) reviews.push(review);
  }

  return { businesses, reviews };
}

export { averageRating };
