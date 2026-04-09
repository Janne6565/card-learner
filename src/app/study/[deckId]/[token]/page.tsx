"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import QrCode from "@/components/QrCode";
import ProgressCounter from "@/components/ProgressCounter";

interface SessionData {
  token: string;
  total: number;
  completed: number;
  status: string;
  batch_card_ids: string[] | null;
  card_last_ratings: Record<string, number> | null;
}

function computeRatingCounts(session: SessionData) {
  const ratings = session.card_last_ratings ?? {};
  const cardIds = session.batch_card_ids ?? Object.keys(ratings);
  const counts = { again: 0, hard: 0, good: 0, easy: 0 };
  for (const id of cardIds) {
    const r = ratings[id];
    if (r === 1) counts.again++;
    else if (r === 2) counts.hard++;
    else if (r === 3) counts.good++;
    else if (r === 4) counts.easy++;
  }
  return counts;
}

export default function StudySessionPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;
  const token = params.token as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Load initial session state from the DB
  useEffect(() => {
    if (!token) return;
    const supabase = createClient();
    (async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select(
          "token, total, completed, status, batch_card_ids, card_last_ratings",
        )
        .eq("token", token)
        .single();

      if (error || !data) {
        setError("Session not found");
        setLoading(false);
        return;
      }

      setSession(data as SessionData);
      setLoading(false);
    })();
  }, [token]);

  // Subscribe to realtime updates + poll as a fallback
  useEffect(() => {
    if (!session?.token) return;

    const supabase = createClient();

    const applyUpdate = (updated: Partial<SessionData>) => {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              completed: updated.completed ?? prev.completed,
              status: updated.status ?? prev.status,
              batch_card_ids: updated.batch_card_ids ?? prev.batch_card_ids,
              card_last_ratings: updated.card_last_ratings ?? prev.card_last_ratings,
            }
          : prev,
      );
    };

    const channel = supabase
      .channel(`session:${token}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "study_sessions",
          filter: `token=eq.${token}`,
        },
        (payload) => {
          applyUpdate(payload.new as SessionData);
        },
      )
      .subscribe((status, err) => {
        console.log("[study] realtime status:", status, err ?? "");
      });

    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select(
          "completed, status, batch_card_ids, card_last_ratings",
        )
        .eq("token", token)
        .single();

      if (error) {
        console.error("[study] poll error:", error);
        return;
      }
      if (data) {
        applyUpdate(data as Partial<SessionData>);
        if (data.status === "done" || data.status === "expired") {
          clearInterval(interval);
        }
      }
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [session?.token, token]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-green-500 animate-spin" />
          <p className="text-sm text-gray-500">Loading session…</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-4xl">⚠</div>
          <p className="text-red-600 dark:text-red-400 font-medium">
            {error || "Session not found"}
          </p>
          <Link
            href={`/study/${deckId}`}
            className="inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Back to sessions
          </Link>
        </div>
      </div>
    );
  }

  const sessionUrl = `${window.location.origin}/session/${session.token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        {/* Page title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Study Session</h1>
          <p className="mt-1.5 text-gray-500 dark:text-gray-400">
            Scan the QR code with your phone to start studying
          </p>
        </div>

        {/* QR card */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-6 flex flex-col items-center gap-4">
          <QrCode url={sessionUrl} size={260} />

          {/* Clickable URL + copy button */}
          <div className="flex items-center gap-2 w-full max-w-xs">
            <a
              href={sessionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-0 text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
            >
              {sessionUrl}
            </a>
            <button
              onClick={handleCopy}
              title="Copy link"
              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-5">
          <ProgressCounter
            completed={session.completed}
            total={session.total}
            status={session.status}
            ratingCounts={computeRatingCounts(session)}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Link
            href={`/study/${deckId}`}
            className="rounded-xl border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            All Sessions
          </Link>
          {session.status === "done" && (
            <button
              onClick={() => router.push(`/decks/${deckId}`)}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
            >
              Back to Deck
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
