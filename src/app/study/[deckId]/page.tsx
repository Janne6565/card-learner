import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createStudySession } from "./actions";

interface Props {
  params: Promise<{ deckId: string }>;
}

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

  const nowIso = new Date().toISOString();

  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("token, total, completed, status, created_at, expires_at")
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .in("status", ["pending", "active"])
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false });

  // If no active sessions, create one and redirect straight into it.
  if (!sessions || sessions.length === 0) {
    await createStudySession(deckId);
    return null; // unreachable: createStudySession redirects
  }

  const createNew = createStudySession.bind(null, deckId);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/decks/${deckId}`}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          &larr; {deck.name}
        </Link>
      </div>

      <h1 className="text-2xl font-bold">Study Sessions</h1>
      <p className="mt-1 text-gray-500 dark:text-gray-400">
        Resume an existing session or start a new one.
      </p>

      <ul className="mt-6 space-y-3">
        {sessions.map((s) => {
          const pct =
            s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
          return (
            <li key={s.token}>
              <Link
                href={`/study/${deckId}/${s.token}`}
                className="block rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {s.completed} / {s.total} cards ({pct}%)
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Started {new Date(s.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {s.status}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <form action={createNew} className="mt-8">
        <button
          type="submit"
          className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          Start New Session
        </button>
      </form>
    </div>
  );
}
