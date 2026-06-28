import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Business } from '@openrate/shared';
import { PhotoUpload } from '../components/PhotoUpload';
import { StarRating } from '../components/StarRating';
import { Turnstile } from '../components/Turnstile';
import { useAuth } from '../lib/auth';
import { getApiUrl } from '../lib/config';
import { getBusinessBySlug } from '../lib/github/client';

export function SubmitReviewPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [identityMode, setIdentityMode] = useState<'anonymous' | 'public' | 'hidden'>('anonymous');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getBusinessBySlug(slug).then(setBusiness);
  }, [slug]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) {
      setError('Review text is required.');
      return;
    }

    if (!turnstileToken && identityMode === 'anonymous') {
      setError('Please complete the captcha.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        business: slug,
        businessTitle: business?.title,
        rating,
        text,
        photos,
        turnstileToken: turnstileToken || 'dev-bypass',
      };

      let endpoint = '/api/reviews/anonymous';
      let body: Record<string, unknown> = {
        ...payload,
        hideIdentity: identityMode === 'hidden',
      };

      if (user && identityMode === 'public') {
        endpoint = '/api/reviews/public';
        body = payload;
      }

      const response = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as { number?: number; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to submit review');
      }

      navigate(`/review/${data.number}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!business) {
    return <p className="text-stone-500">Loading...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link to={`/business/${slug}`} className="text-sm text-stone-500 hover:text-stone-800">
          ← Back to {business.title}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Write a review</h1>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6">
        <div>
          <label className="mb-2 block text-sm font-medium">Rating</label>
          <StarRating value={rating} onChange={setRating} size="lg" />
        </div>

        <div>
          <label htmlFor="review-text" className="mb-2 block text-sm font-medium">
            Review
          </label>
          <textarea
            id="review-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none ring-amber-400 focus:ring-2"
            placeholder="Share your experience..."
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Photos (optional)</label>
          <PhotoUpload photos={photos} onChange={setPhotos} />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Identity</legend>
          {!user && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="identity"
                checked={identityMode === 'anonymous'}
                onChange={() => setIdentityMode('anonymous')}
              />
              Submit anonymously (no GitHub account)
            </label>
          )}
          {!user && (
            <button
              type="button"
              onClick={login}
              className="text-sm text-amber-700 hover:underline"
            >
              Sign in with GitHub for identity options
            </button>
          )}
          {user && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="identity"
                  checked={identityMode === 'public'}
                  onChange={() => setIdentityMode('public')}
                />
                Show my GitHub identity (@{user.login})
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="identity"
                  checked={identityMode === 'hidden'}
                  onChange={() => setIdentityMode('hidden')}
                />
                Hide my identity (posted via bot)
              </label>
            </>
          )}
        </fieldset>

        {(identityMode === 'anonymous' || identityMode === 'hidden') && (
          <Turnstile onVerify={setTurnstileToken} onExpire={() => setTurnstileToken('')} />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-stone-900 px-5 py-2 text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit review'}
        </button>
      </form>
    </div>
  );
}
