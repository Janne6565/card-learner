"use client";

interface RatingButtonsProps {
  onRate: (rating: 1 | 2 | 3 | 4) => void;
  disabled?: boolean;
}

const RATINGS = [
  { value: 1 as const, label: "Again", color: "bg-red-600 hover:bg-red-700", shortcut: "1" },
  { value: 2 as const, label: "Hard", color: "bg-orange-600 hover:bg-orange-700", shortcut: "2" },
  { value: 3 as const, label: "Good", color: "bg-green-600 hover:bg-green-700", shortcut: "3" },
  { value: 4 as const, label: "Easy", color: "bg-blue-600 hover:bg-blue-700", shortcut: "4" },
];

export default function RatingButtons({ onRate, disabled }: RatingButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-2 w-full max-w-md mx-auto mt-4">
      {RATINGS.map((r) => (
        <button
          key={r.value}
          onClick={() => onRate(r.value)}
          disabled={disabled}
          className={`${r.color} rounded-lg px-3 py-3 text-sm font-medium text-white disabled:opacity-50 transition-colors`}
        >
          <span className="block">{r.label}</span>
          <span className="block text-xs opacity-70">{r.shortcut}</span>
        </button>
      ))}
    </div>
  );
}
