import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Review, ReviewComment } from '@openrate/shared';
import { StarRating } from '../components/StarRating';
import { Turnstile } from '../components/Turnstile';
import { useAuth, verifyOwner } from '../lib/auth';
import { getApiUrl } from '../lib/config';
import {
  getBusinessBySlug,
  getReviewByNumber,
  getReviewComments,
} from '../lib/github/client';

export function ReviewPage() {
  const { number = '' } = useParams();
  const reviewNumber = Number.parseInt(number, 10);
  const { user, login } = useAuth();
  const [review, setReview] = useState<Review | null>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [businessTitle, setBusinessTitle] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [reply, setReply] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const reviewData = await getReviewByNumber(reviewNumber);
        setReview(reviewData);
        if (reviewData) {
          const [commentData, business] = await Promise.all([
            getReviewComments(reviewNumber),
            getBusinessBySlug(reviewData.meta.business),
          ]);
          setComments(commentData);
          setBusinessTitle(business?.title ?? reviewData.meta.business);
          if (user) {
            setIsOwner(await verifyOwner(reviewData.meta.business));
          }
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load review');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [reviewNumber, user]);

  async function submitReply(event: React.FormEvent) {
    event.preventDefault();
    if (!review || !reply.trim()) return;

    setError(null);
    setMessage(null);

    const response = await fetch(getApiUrl(`/api/reviews/${review.number}/reply`), {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        business: review.meta.business,
        text: reply,
      }),
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? 'Failed to post reply');
      return;
    }

    setReply('');
    setMessage('Reply posted.');
    setComments(await getReviewComments(reviewNumber));
  }

  async function submitReport(event: React.FormEvent) {
    event.preventDefault();
    if (!review || !reportReason.trim()) return;

    setError(null);
    setMessage(null);

    const response = await fetch(getApiUrl('/api/reports'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        reviewUrl: review.url,
        reviewNumber: review.number,
        reason: reportReason,
        details: reportDetails,
        turnstileToken: turnstileToken || 'dev-bypass',
      }),
    });

    const data = (await response.json()) as { error?: string; url?: string };
    if (!response.ok) {
      setError(data.error ?? 'Failed to submit report');
      return;
    }

    setReportReason('');
    setReportDetails('');
    setMessage(`Report submitted${data.url ? `: ${data.url}` : ''}.`);
  }

  if (loading) return <p className="text-stone-500">Loading review...</p>;
  if (error && !review) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">{error}</div>;
  }
  if (!review) return <p>Review not found.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          to={`/business/${review.meta.business}`}
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          ← Back to {businessTitle}
        </Link>
      </div>

      <article className="rounded-3xl border border-stone-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {review.author.avatarUrl ? (
              <img
                src={review.author.avatarUrl}
                alt={review.author.login ?? 'Reviewer'}
                className="h-12 w-12 rounded-full"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-200">
                ?
              </div>
            )}
            <div>
              <p className="font-semibold">
                {review.author.isAnonymous ? 'Anonymous' : `@${review.author.login}`}
              </p>
              <p className="text-sm text-stone-500">
                {new Date(review.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <StarRating value={review.meta.rating} />
        </div>

        <p className="mt-5 whitespace-pre-wrap text-stone-800">{review.text}</p>

        {review.meta.photos && review.meta.photos.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2 text-sm text-stone-500">
            {review.meta.photos.map((photo) => (
              <li key={photo}>{photo}</li>
            ))}
          </ul>
        )}

        <a
          href={review.url}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-block text-sm text-amber-700 hover:underline"
        >
          View on GitHub
        </a>
      </article>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Owner replies</h2>
        {comments.length === 0 ? (
          <p className="text-sm text-stone-500">No replies yet.</p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center gap-2">
                  <img
                    src={comment.author.avatarUrl}
                    alt={comment.author.login}
                    className="h-8 w-8 rounded-full"
                  />
                  <span className="font-medium">@{comment.author.login}</span>
                  <span className="text-xs text-stone-400">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{comment.body}</p>
              </div>
            ))}
          </div>
        )}

        {isOwner ? (
          <form onSubmit={(event) => void submitReply(event)} className="space-y-3">
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={4}
              placeholder="Reply as verified owner..."
              className="w-full rounded-xl border border-stone-300 px-4 py-3"
            />
            <button
              type="submit"
              className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-700"
            >
              Post owner reply
            </button>
          </form>
        ) : (
          <p className="text-sm text-stone-500">
            Verified business owners can reply with their GitHub identity after claiming ownership.
            {!user && (
              <>
                {' '}
                <button type="button" onClick={login} className="text-amber-700 hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Report this review</h2>
        <form onSubmit={(event) => void submitReport(event)} className="mt-3 space-y-3">
          <input
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            placeholder="Reason (spam, harassment, fake, etc.)"
            className="w-full rounded-xl border border-stone-300 px-4 py-2"
            required
          />
          <textarea
            value={reportDetails}
            onChange={(event) => setReportDetails(event.target.value)}
            rows={3}
            placeholder="Additional details (optional)"
            className="w-full rounded-xl border border-stone-300 px-4 py-2"
          />
          <Turnstile onVerify={setTurnstileToken} onExpire={() => setTurnstileToken('')} />
          <button
            type="submit"
            className="rounded-full border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100"
          >
            Submit report
          </button>
        </form>
      </section>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
