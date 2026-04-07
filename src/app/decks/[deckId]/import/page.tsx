"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ImportPage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params.deckId as string;

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; deckId: string } | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("deckId", deckId);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Import failed");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Import Anki TXT</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Upload an Anki TXT export file. The parser supports tab/comma/semicolon
        separators, HTML content, and column mappings via # headers.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="file"
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
          >
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {file ? file.name : "Click to select .txt file"}
            </span>
            <input
              id="file"
              type="file"
              accept=".txt,.tsv,.csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {result && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              Successfully imported {result.imported} cards!
            </p>
            <button
              type="button"
              onClick={() => router.push(`/decks/${result.deckId}`)}
              className="mt-2 text-sm text-green-600 dark:text-green-400 hover:underline"
            >
              View deck &rarr;
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !file}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Importing..." : "Import"}
          </button>
        </div>
      </form>
    </div>
  );
}
