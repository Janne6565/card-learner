"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createStudySession } from "../actions";

export default function NewSessionPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;

  const [unlimited, setUnlimited] = useState(false);
  const [batchSize, setBatchSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createStudySession(deckId, unlimited ? null : batchSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="mb-8">
        <Link
          href={`/study/${deckId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Sessions
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">New Study Session</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Configure how you want to study.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1.5">
              Batch size
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Study this many cards at a time. Cards loop until you rate every one{" "}
              <span className="font-medium text-blue-600 dark:text-blue-400">Easy</span>
              , then the next batch loads.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={500}
                value={batchSize}
                disabled={unlimited}
                onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-center text-sm font-medium disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">cards per batch</span>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={unlimited}
              onChange={(e) => setUnlimited(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm">Study all due cards at once (no batching)</span>
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-3">
          <Link
            href={`/study/${deckId}`}
            className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
          >
            {loading ? "Starting…" : "Start Session →"}
          </button>
        </div>
      </form>
    </div>
  );
}
