"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function EditDeckPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("decks")
      .select("name, description")
      .eq("id", deckId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError("Deck not found");
        } else {
          setName(data.name);
          setDescription(data.description ?? "");
        }
        setFetching(false);
      });
  }, [deckId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("decks")
      .update({ name: name.trim(), description: description.trim() || null })
      .eq("id", deckId);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push(`/decks/${deckId}`);
  };

  if (fetching) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-gray-300 border-t-blue-500 animate-spin" />
      </div>
    );
  }

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

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold mb-1.5">
            Deck Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="What is this deck about?"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <Link
            href={`/decks/${deckId}`}
            className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
          >
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
