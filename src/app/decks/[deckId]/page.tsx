import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HtmlContent from "@/components/HtmlContent";

interface Props {
  params: Promise<{ deckId: string }>;
}

export default async function DeckDetailPage({ params }: Props) {
  const { deckId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: deck } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .single();

  if (!deck) notFound();

  const { data: cards } = await supabase
    .from("cards")
    .select("id, front, back, is_html, due_at, interval_days, ease_factor, tags")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: true });

  const now = new Date();
  const dueCount = cards?.filter((c) => new Date(c.due_at) <= now).length ?? 0;
  const totalCards = cards?.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/decks"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          &larr; All Decks
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          {deck.description && (
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {deck.description}
            </p>
          )}
          <div className="mt-2 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>{totalCards} cards</span>
            <span>{dueCount} due</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/decks/${deckId}/import`}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Import
          </Link>
          {dueCount > 0 && (
            <Link
              href={`/study/${deckId}`}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              Study ({dueCount})
            </Link>
          )}
        </div>
      </div>

      {!cards || cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No cards yet. Import from Anki or add cards manually.
          </p>
          <Link
            href={`/decks/${deckId}/import`}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Import Anki TXT
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const isDue = new Date(card.due_at) <= now;
            return (
              <div
                key={card.id}
                className={`rounded-lg border p-4 ${
                  isDue
                    ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1">Front</p>
                    {card.is_html ? (
                      <HtmlContent html={card.front} className="text-sm" />
                    ) : (
                      <p className="text-sm">{card.front}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1">Back</p>
                    {card.is_html ? (
                      <HtmlContent html={card.back} className="text-sm" />
                    ) : (
                      <p className="text-sm">{card.back}</p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex gap-3 text-xs text-gray-400">
                  <span>EF: {card.ease_factor.toFixed(2)}</span>
                  <span>Interval: {card.interval_days}d</span>
                  {card.tags?.length > 0 && (
                    <span>Tags: {card.tags.join(", ")}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
