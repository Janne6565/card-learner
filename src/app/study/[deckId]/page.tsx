import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createStudySession, deleteStudySession } from "./actions";

interface Props {
  params: Promise<{ deckId: string }>;
}

const STATUS_STYLES: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  done: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  expired:
    "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export default async function StudyPickerPage({ params }: Props) {
  const { deckId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: deck } = await supabase
    .from("decks")
    .select("id, name")
    .eq("id", deckId)
    .single();
  if (!deck) notFound();

  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("token, total, completed, status, created_at")
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // If no sessions at all, create one and redirect straight into it.
  if (!sessions || sessions.length === 0) {
    await createStudySession(deckId);
    return null; // unreachable: createStudySession redirects
  }

  const createNew = createStudySession.bind(null, deckId);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/decks/${deckId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {deck.name}
        </Link>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Study Sessions
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Resume an existing session or start a new one.
            </p>
          </div>
          <form action={createNew} className="shrink-0">
            <button
              type="submit"
              className="rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
            >
              + New Session
            </button>
          </form>
        </div>
      </div>

      {/* Session list */}
      <ul className="space-y-3">
        {sessions.map((s) => {
          const pct =
            s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
          const isResumable = s.status === "pending" || s.status === "active";
          const deleteAction = deleteStudySession.bind(null, deckId, s.token);

          return (
            <li
              key={s.token}
              className="flex rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Clickable session area */}
              {isResumable ? (
                <Link
                  href={`/study/${deckId}/${s.token}`}
                  className="flex-1 p-5 min-w-0"
                >
                  <SessionCardContent s={s} pct={pct} />
                </Link>
              ) : (
                <div className="flex-1 p-5 min-w-0 opacity-70">
                  <SessionCardContent s={s} pct={pct} />
                </div>
              )}

              {/* Delete button — separate flex item so it never overlaps the link */}
              <form
                action={deleteAction}
                className="flex items-center px-3 border-l border-gray-100 dark:border-gray-800"
              >
                <button
                  type="submit"
                  title="Delete session"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SessionCardContent({
  s,
  pct,
}: {
  s: { token: string; total: number; completed: number; status: string; created_at: string };
  pct: number;
}) {
  const statusLabel =
    s.status.charAt(0).toUpperCase() + s.status.slice(1);
  const statusStyle =
    STATUS_STYLES[s.status] ??
    "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";

  return (
    <>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-base">
            {s.completed} / {s.total} cards
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {new Date(s.created_at).toLocaleString()}
          </p>
        </div>
        <span
          className={`shrink-0 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-right text-xs text-gray-400 dark:text-gray-500">
          {pct}%
        </p>
      </div>
    </>
  );
}
