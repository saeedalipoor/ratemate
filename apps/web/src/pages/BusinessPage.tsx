import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { averageRating, getCategoryLabel, type Business, type Review } from '@openrate/shared';
import { ReviewCard } from '../components/Cards';
import { StarRating } from '../components/StarRating';
import { getNewReviewUrl, getOwnerClaimUrl } from '../lib/config';
import { getBusinessBySlug, listReviewsForBusiness } from '../lib/github/client';

export function BusinessPage() {
  const { slug = '' } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [businessData, reviewData] = await Promise.all([
          getBusinessBySlug(slug),
          listReviewsForBusiness(slug),
        ]);
        setBusiness(businessData);
        setReviews(reviewData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load business');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [slug]);

  if (loading) return <p className="text-stone-500">Loading business...</p>;
  if (error || !business) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        {error ?? 'Business not found.'}
      </div>
    );
  }

  const avg = averageRating(reviews);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-200 bg-white p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-stone-500">
              {getCategoryLabel(business.meta.category)}
            </p>
            <h1 className="mt-1 text-3xl font-semibold">{business.title}</h1>
            {business.meta.location && (
              <p className="mt-2 text-stone-600">{business.meta.location}</p>
            )}
            {business.meta.website && (
              <a
                href={business.meta.website}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-amber-700 hover:underline"
              >
                Visit website
              </a>
            )}
            <p className="mt-4 max-w-2xl text-stone-700">{business.description}</p>
            <a
              href={business.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm text-stone-500 hover:text-stone-800"
            >
              View on GitHub
            </a>
          </div>
          <div className="rounded-2xl bg-stone-50 p-5 text-center">
            <div className="text-4xl font-bold">{avg !== null ? avg.toFixed(1) : '—'}</div>
            {avg !== null && <StarRating value={Math.round(avg)} />}
            <p className="mt-2 text-sm text-stone-500">{reviews.length} review(s)</p>
            <Link
              to={`/business/${slug}/review`}
              className="mt-4 inline-block rounded-full bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-700"
            >
              Write a review
            </Link>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-3 text-sm">
        <a
          href={getNewReviewUrl(business.title, business.meta.slug)}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-stone-300 px-4 py-2 hover:bg-stone-100"
        >
          Submit on GitHub
        </a>
        <a
          href={getOwnerClaimUrl(business.meta.slug)}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-stone-300 px-4 py-2 hover:bg-stone-100"
        >
          Claim this business
        </a>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-stone-500">No reviews yet. Be the first.</p>
        ) : (
          <div className="grid gap-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
