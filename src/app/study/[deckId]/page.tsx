"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import QrCode from "@/components/QrCode";
import ProgressCounter from "@/components/ProgressCounter";
import Link from "next/link";

interface SessionData {
  token: string;
  total: number;
  completed: number;
  again_count: number;
  hard_count: number;
  good_count: number;
  easy_count: number;
  status: string;
}

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create study session
  useEffect(() => {
    async function createSession() {
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deckId }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to create session");
          setLoading(false);
          return;
        }

        setSession({
          token: data.token,
          total: data.total,
          completed: 0,
          again_count: 0,
          hard_count: 0,
          good_count: 0,
          easy_count: 0,
          status: "pending",
        });
        setLoading(false);
      } catch {
        setError("Network error");
        setLoading(false);
      }
    }
    createSession();
  }, [deckId]);

  // Subscribe to realtime updates + poll as a fallback
  useEffect(() => {
    if (!session?.token) return;

    const token = session.token;
    const supabase = createClient();

    const applyUpdate = (updated: Partial<SessionData>) => {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              completed: updated.completed ?? prev.completed,
              again_count: updated.again_count ?? prev.again_count,
              hard_count: updated.hard_count ?? prev.hard_count,
              good_count: updated.good_count ?? prev.good_count,
              easy_count: updated.easy_count ?? prev.easy_count,
              status: updated.status ?? prev.status,
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

    // Polling fallback — ensures live progress even if realtime is blocked
    // by RLS/network/proxy. Stops when the session is done.
    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select(
          "completed, again_count, hard_count, good_count, easy_count, status",
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
  }, [session?.token]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-500">Creating study session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Link
            href={`/decks/${deckId}`}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Back to deck
          </Link>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const sessionUrl = `${window.location.origin}/session/${session.token}`;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Study Session</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Scan the QR code with your phone to start studying
          </p>
        </div>

        <QrCode url={sessionUrl} size={280} />

        <div className="text-xs text-gray-400 dark:text-gray-500 break-all max-w-xs mx-auto">
          {sessionUrl}
        </div>

        <ProgressCounter
          completed={session.completed}
          total={session.total}
          againCount={session.again_count}
          hardCount={session.hard_count}
          goodCount={session.good_count}
          easyCount={session.easy_count}
          status={session.status}
        />

        {session.status === "done" && (
          <button
            onClick={() => router.push(`/decks/${deckId}`)}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Back to Deck
          </button>
        )}
      </div>
    </div>
  );
}
