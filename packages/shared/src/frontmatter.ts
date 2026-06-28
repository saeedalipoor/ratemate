import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export function parseFrontmatter<T extends Record<string, unknown> = Record<string, unknown>>(
  body: string,
): { data: Partial<T>; content: string } {
  const match = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, content: body.trim() };
  }

  const data = (parseYaml(match[1]) ?? {}) as Partial<T>;
  return { data, content: match[2].trim() };
}

export function buildFrontmatter<T extends Record<string, unknown>>(
  data: T,
  content: string,
): string {
  const yaml = stringifyYaml(data).trim();
  return `---\n${yaml}\n---\n\n${content.trim()}`;
}

export function buildReviewBody(input: {
  business: string;
  rating: number;
  reviewer: {
    mode: 'anonymous' | 'github-public' | 'github-anonymous';
    github_login?: string | null;
  };
  photos?: string[];
  text: string;
}): string {
  const photoUrls = input.photos ?? [];
  const photoMarkdown =
    photoUrls.length > 0
      ? '\n\n' + photoUrls.map((url) => `![photo](${url})`).join('\n')
      : '';

  return buildFrontmatter(
    {
      type: 'review',
      business: input.business,
      rating: input.rating,
      reviewer: {
        mode: input.reviewer.mode,
        github_login: input.reviewer.github_login ?? null,
      },
      photos: photoUrls,
    },
    input.text + photoMarkdown,
  );
}

export function buildReportBody(input: {
  reviewUrl: string;
  reviewNumber: number;
  reason: string;
  details: string;
}): string {
  return buildFrontmatter(
    {
      type: 'report',
      review_url: input.reviewUrl,
      review_number: input.reviewNumber,
      reason: input.reason,
    },
    input.details,
  );
}

export function buildBusinessBody(input: {
  slug: string;
  category: string;
  location?: string;
  website?: string;
  description: string;
}): string {
  return buildFrontmatter(
    {
      type: 'business',
      slug: input.slug,
      category: input.category,
      location: input.location ?? '',
      website: input.website ?? '',
    },
    input.description,
  );
}
