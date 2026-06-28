import { Link } from 'react-router-dom';
import type { Business, Review } from '@openrate/shared';
import { getCategoryLabel } from '@openrate/shared';
import { StarRating } from './StarRating';

export function BusinessCard({
  business,
  average,
  reviewCount,
}: {
  business: Business;
  average: number | null;
  reviewCount: number;
}) {
  return (
    <Link
      to={`/business/${business.meta.slug}`}
      className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{business.title}</h2>
          <p className="mt-1 text-sm text-stone-500">
            {getCategoryLabel(business.meta.category)}
            {business.meta.location ? ` · ${business.meta.location}` : ''}
          </p>
        </div>
        <div className="text-right">
          {average !== null ? (
            <>
              <div className="text-2xl font-bold">{average.toFixed(1)}</div>
              <StarRating value={Math.round(average)} size="sm" />
            </>
          ) : (
            <span className="text-sm text-stone-400">No reviews</span>
          )}
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-stone-600">{business.description}</p>
      <p className="mt-3 text-xs text-stone-400">{reviewCount} review(s)</p>
    </Link>
  );
}

export function ReviewCard({ review }: { review: Review }) {
  return (
    <Link
      to={`/review/${review.number}`}
      className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-300"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {review.author.avatarUrl ? (
            <img
              src={review.author.avatarUrl}
              alt={review.author.login ?? 'Reviewer'}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-sm font-medium">
              ?
            </div>
          )}
          <div>
            <p className="font-medium">
              {review.author.isAnonymous ? 'Anonymous' : `@${review.author.login}`}
            </p>
            <p className="text-xs text-stone-400">
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <StarRating value={review.meta.rating} size="sm" />
      </div>
      <p className="mt-3 line-clamp-3 text-sm text-stone-700">{review.text}</p>
    </Link>
  );
}
