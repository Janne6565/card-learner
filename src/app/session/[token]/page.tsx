"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import CardView from "@/components/CardView";
import RatingButtons from "@/components/RatingButtons";

interface CardData {
  id: string;
  front: string;
  back: string;
  is_html: boolean;
  tags: string[];
}

interface BatchProgress {
  graduated: number;
  batchSize: number;
  batchTotal: number;
}

interface SessionState {
  done: boolean;
  waiting?: boolean;
  card?: CardData;
  progress?: { completed: number; total: number };
  batchProgress?: BatchProgress;
  error?: string;
}

export default function PhoneSessionPage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<SessionState>({ done: false });
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const waitRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNext = useCallback(async () => {
    setLoading(true);
    setRevealed(false);

    try {
      const res = await fetch(`/api/sessions/${token}/next`);
      const data = await res.json();

      if (!res.ok) {
        setState({ done: false, error: data.error || "Error loading card" });
      } else if (data.done) {
        setState({ done: true, progress: { completed: data.completed, total: data.total } });
      } else if (data.waiting) {
        // Batch cards are all queued slightly in the future — retry shortly
        setState((prev) => ({ ...prev, waiting: true }));
        waitRetryRef.current = setTimeout(fetchNext, 1000);
      } else {
        setState({
          done: false,
          waiting: false,
          card: data.card,
          progress: data.progress,
          batchProgress: data.batchProgress,
        });
      }
    } catch {
      setState({ done: false, error: "Network error" });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNext();
    return () => {
      if (waitRetryRef.current) clearTimeout(waitRetryRef.current);
    };
  }, [fetchNext]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (submitting || loading) return;

      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
        return;
      }

      if (revealed && state.card) {
        const rating = parseInt(e.key) as 1 | 2 | 3 | 4;
        if ([1, 2, 3, 4].includes(rating)) {
          handleRate(rating);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const handleRate = async (rating: 1 | 2 | 3 | 4) => {
    if (!state.card || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sessions/${token}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: state.card.id, rating }),
      });

      if (res.ok) {
        await fetchNext();
      } else {
        const data = await res.json();
        setState((prev) => ({ ...prev, error: data.error || "Error submitting rating" }));
      }
    } catch {
      setState((prev) => ({ ...prev, error: "Network error" }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !state.waiting) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-full border-2 border-gray-300 border-t-green-500 animate-spin" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <p className="text-red-600 dark:text-red-400">{state.error}</p>
          <button
            onClick={fetchNext}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (state.done) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <div className="text-5xl">✓</div>
          <h1 className="text-2xl font-bold">Session Complete!</h1>
          <p className="text-gray-500 dark:text-gray-400">
            You mastered {state.progress?.total ?? 0} cards.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            You can close this tab.
          </p>
        </div>
      </div>
    );
  }

  if (!state.card) return null;

  const bp = state.batchProgress;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
      {/* Progress bars */}
      <div className="w-full max-w-md mb-6 space-y-2">
        {/* Batch progress bar (batch mode only) */}
        {bp && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Batch: {bp.graduated} / {bp.batchTotal} mastered</span>
              <span>{bp.batchSize} per batch</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${bp.batchTotal > 0 ? (bp.graduated / bp.batchTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Overall session progress */}
        {state.progress && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>
                {bp
                  ? `${bp.graduated} / ${state.progress.total} total`
                  : `${state.progress.completed} / ${state.progress.total}`}
              </span>
              <span>
                {state.progress.total > 0
                  ? Math.round(((bp ? bp.graduated : state.progress.completed) / state.progress.total) * 100)
                  : 0}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{
                  width: `${state.progress.total > 0 ? ((bp ? bp.graduated : state.progress.completed) / state.progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <CardView
        front={state.card.front}
        back={state.card.back}
        isHtml={state.card.is_html}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
      />

      {revealed && (
        <RatingButtons onRate={handleRate} disabled={submitting} />
      )}
    </div>
  );
}
