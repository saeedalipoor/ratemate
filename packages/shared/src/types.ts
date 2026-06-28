export const DISCUSSION_CATEGORIES = {
  businesses: 'Businesses',
  reviews: 'Reviews',
  reports: 'Reports',
} as const;

export type DiscussionCategoryKey = keyof typeof DISCUSSION_CATEGORIES;

export const BUSINESS_CATEGORIES = [
  { id: 'food-drink', label: 'Food & Drink' },
  { id: 'retail', label: 'Retail' },
  { id: 'services', label: 'Services' },
  { id: 'health', label: 'Health & Wellness' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'other', label: 'Other' },
] as const;

export type BusinessCategoryId = (typeof BUSINESS_CATEGORIES)[number]['id'];

export type ReviewerMode = 'anonymous' | 'github-public' | 'github-anonymous';

export interface BusinessMeta {
  type: 'business';
  slug: string;
  category: BusinessCategoryId;
  location?: string;
  website?: string;
}

export interface ReviewMeta {
  type: 'review';
  business: string;
  rating: number;
  reviewer: {
    mode: ReviewerMode;
    github_login?: string | null;
  };
  photos?: string[];
}

export interface ReportMeta {
  type: 'report';
  review_url: string;
  review_number: number;
  reason: string;
}

export interface Business {
  id: string;
  number: number;
  title: string;
  url: string;
  body: string;
  meta: BusinessMeta;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  number: number;
  title: string;
  url: string;
  body: string;
  meta: ReviewMeta;
  text: string;
  createdAt: string;
  updatedAt: string;
  author: {
    login: string | null;
    avatarUrl: string | null;
    isAnonymous: boolean;
  };
}

export interface ReviewComment {
  id: string;
  body: string;
  createdAt: string;
  author: {
    login: string;
    avatarUrl: string;
  };
}

export interface SessionUser {
  login: string;
  avatarUrl: string;
  accessToken: string;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function averageRating(reviews: Review[]): number | null {
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((acc, review) => acc + review.meta.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

export function getCategoryLabel(id: string): string {
  return BUSINESS_CATEGORIES.find((category) => category.id === id)?.label ?? id;
}
