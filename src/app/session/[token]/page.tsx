"use client";

import { useEffect, useState, useCallback } from "react";
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

interface SessionState {
  done: boolean;
  card?: CardData;
  progress?: { completed: number; total: number };
  error?: string;
}

export default function PhoneSessionPage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<SessionState>({ done: false });
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
      } else {
        setState({ done: false, card: data.card, progress: data.progress });
      }
    } catch {
      setState({ done: false, error: "Network error" });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNext();
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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-500">Loading...</p>
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
          <div className="text-4xl">&#10003;</div>
          <h1 className="text-2xl font-bold">Session Complete!</h1>
          <p className="text-gray-500 dark:text-gray-400">
            You reviewed {state.progress?.completed ?? 0} of{" "}
            {state.progress?.total ?? 0} cards.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            You can close this tab.
          </p>
        </div>
      </div>
    );
  }

  if (!state.card) return null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
      {/* Progress bar */}
      {state.progress && (
        <div className="w-full max-w-md mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>
              {state.progress.completed} / {state.progress.total}
            </span>
            <span>
              {Math.round(
                (state.progress.completed / state.progress.total) * 100,
              )}
              %
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{
                width: `${(state.progress.completed / state.progress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

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
