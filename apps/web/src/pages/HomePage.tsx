import { useEffect, useMemo, useState } from 'react';
import { averageRating, type Business, type Review } from '@openrate/shared';
import { BusinessCard } from '../components/Cards';
import { SearchBar } from '../components/SearchBar';
import { getNewBusinessUrl } from '../lib/config';
import { listBusinesses, listReviews } from '../lib/github/client';

export function HomePage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [businessData, reviewData] = await Promise.all([
          listBusinesses(),
          listReviews(),
        ]);
        setBusinesses(businessData);
        setReviews(reviewData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const statsBySlug = useMemo(() => {
    const map = new Map<string, { average: number | null; count: number }>();
    for (const business of businesses) {
      const businessReviews = reviews.filter(
        (review) => review.meta.business === business.meta.slug,
      );
      map.set(business.meta.slug, {
        average: averageRating(businessReviews),
        count: businessReviews.length,
      });
    }
    return map;
  }, [businesses, reviews]);

  const filtered = useMemo(() => {
    return businesses.filter((business) => {
      const matchesQuery =
        !query ||
        business.title.toLowerCase().includes(query.toLowerCase()) ||
        business.meta.location?.toLowerCase().includes(query.toLowerCase()) ||
        business.description.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !category || business.meta.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [businesses, query, category]);

  if (loading) {
    return <p className="text-stone-500">Loading businesses...</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <h1 className="text-lg font-semibold">Unable to load discussions</h1>
        <p className="mt-2 text-sm">{error}</p>
        <p className="mt-2 text-sm">
          Ensure Discussions are enabled and VITE_GITHUB_OWNER / VITE_GITHUB_REPO are configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-stone-900 px-6 py-10 text-white">
        <h1 className="text-3xl font-semibold tracking-tight">Rate businesses openly on GitHub</h1>
        <p className="mt-3 max-w-2xl text-stone-300">
          Reviews live in GitHub Discussions. Anyone can read them. Submit anonymously via this
          app, sign in with GitHub to choose whether your identity is public, and let verified
          owners reply.
        </p>
        <a
          href={getNewBusinessUrl()}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block rounded-full bg-amber-400 px-5 py-2 font-medium text-stone-900 hover:bg-amber-300"
        >
          Add a business on GitHub
        </a>
      </section>

      <SearchBar
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
      />

      {filtered.length === 0 ? (
        <p className="text-stone-500">No businesses found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((business) => {
            const stats = statsBySlug.get(business.meta.slug) ?? { average: null, count: 0 };
            return (
              <BusinessCard
                key={business.id}
                business={business}
                average={stats.average}
                reviewCount={stats.count}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
