import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateDeck } from "../actions";

interface Props {
  params: Promise<{ deckId: string }>;
}

export default async function EditDeckPage({ params }: Props) {
  const { deckId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: deck } = await supabase
    .from("decks")
    .select("name, description")
    .eq("id", deckId)
    .single();

  if (!deck) notFound();

  const action = updateDeck.bind(null, deckId);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="mb-8">
        <Link
          href={`/decks/${deckId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to deck
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Edit Deck</h1>
      </div>

      <form action={action} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold mb-1.5">
            Deck Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={deck.name}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., German Vocabulary"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold mb-1.5">
            Description <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={deck.description ?? ""}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="What is this deck about?"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Link
            href={`/decks/${deckId}`}
            className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
