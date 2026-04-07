"use client";

import { sanitizeHtml } from "@/lib/sanitize";

interface CardViewProps {
  front: string;
  back: string;
  isHtml: boolean;
  revealed: boolean;
  onReveal: () => void;
}

export default function CardView({
  front,
  back,
  isHtml,
  revealed,
  onReveal,
}: CardViewProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Front */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 mb-4 min-h-[120px] flex items-center justify-center">
        {isHtml ? (
          <div
            className="text-center text-lg"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(front) }}
          />
        ) : (
          <p className="text-center text-lg">{front}</p>
        )}
      </div>

      {/* Back / Reveal Button */}
      {revealed ? (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-6 min-h-[120px] flex items-center justify-center">
          {isHtml ? (
            <div
              className="text-center text-lg"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(back) }}
            />
          ) : (
            <p className="text-center text-lg">{back}</p>
          )}
        </div>
      ) : (
        <button
          onClick={onReveal}
          className="w-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-6 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors min-h-[120px]"
        >
          Tap to reveal answer
        </button>
      )}
    </div>
  );
}
