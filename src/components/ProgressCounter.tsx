"use client";

interface ProgressCounterProps {
  completed: number;
  total: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  status: string;
}

export default function ProgressCounter({
  completed,
  total,
  againCount,
  hardCount,
  goodCount,
  easyCount,
  status,
}: ProgressCounterProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">
            {completed} / {total}
          </span>
          <span className="text-gray-500 dark:text-gray-400">{pct}%</span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Rating breakdown */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-2">
          <div className="font-bold text-red-600 dark:text-red-400 text-lg">
            {againCount}
          </div>
          <div className="text-red-500 dark:text-red-400">Again</div>
        </div>
        <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-2">
          <div className="font-bold text-orange-600 dark:text-orange-400 text-lg">
            {hardCount}
          </div>
          <div className="text-orange-500 dark:text-orange-400">Hard</div>
        </div>
        <div className="rounded-lg bg-green-50 dark:bg-green-950 p-2">
          <div className="font-bold text-green-600 dark:text-green-400 text-lg">
            {goodCount}
          </div>
          <div className="text-green-500 dark:text-green-400">Good</div>
        </div>
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-2">
          <div className="font-bold text-blue-600 dark:text-blue-400 text-lg">
            {easyCount}
          </div>
          <div className="text-blue-500 dark:text-blue-400">Easy</div>
        </div>
      </div>

      {/* Status */}
      {status === "done" && (
        <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
          <p className="text-green-700 dark:text-green-300 font-medium">
            Session Complete!
          </p>
        </div>
      )}

      {status === "expired" && (
        <div className="text-center p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
          <p className="text-yellow-700 dark:text-yellow-300 font-medium">
            Session Expired
          </p>
        </div>
      )}
    </div>
  );
}
