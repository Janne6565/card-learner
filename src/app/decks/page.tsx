import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DecksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: decks } = await supabase
    .from("decks")
    .select("id, name, description, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Decks</h1>
        <div className="flex gap-3">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Sign out
            </button>
          </form>
          <Link
            href="/decks/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            New Deck
          </Link>
        </div>
      </div>

      {!decks || decks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No decks yet. Create one or import from Anki.
          </p>
          <Link
            href="/decks/new"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Create your first deck
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {decks.map((deck) => (
            <Link
              key={deck.id}
              href={`/decks/${deck.id}`}
              className="block rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all"
            >
              <h2 className="text-lg font-semibold">{deck.name}</h2>
              {deck.description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {deck.description}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Created {new Date(deck.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
