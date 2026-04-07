/**
 * SM-2 spaced-repetition algorithm.
 *
 * Pure function — takes the current card SRS state and a rating,
 * returns the new state. No side effects.
 */

/** 1=Again, 2=Hard, 3=Good, 4=Easy */
export type Rating = 1 | 2 | 3 | 4;

export interface SrsState {
  easeFactor: number;    // >= 1.3
  intervalDays: number;  // days until next review
  repetitions: number;   // consecutive correct reviews
  dueAt: Date;
  lapses: number;
}

/**
 * Compute the next SRS state after a review.
 *
 * Rating mapping:
 *   1 (Again): reset to start, EF -= 0.20 (min 1.3), interval = 1 day, lapses += 1
 *   2 (Hard):  interval = max(1, round(prev * 1.2)), EF -= 0.15 (min 1.3)
 *   3 (Good):  standard SM-2 progression: n=0→1d, n=1→6d, else round(prev * EF)
 *   4 (Easy):  interval = round(prev * EF * 1.3) or 4d if new, EF += 0.15
 *
 * For ratings >= 2, repetitions is incremented.
 */
export function sm2(card: SrsState, rating: Rating, now: Date = new Date()): SrsState {
  const { easeFactor, intervalDays, repetitions, lapses } = card;

  let newInterval: number;
  let newEF = easeFactor;
  let newReps = repetitions;
  let newLapses = lapses;

  switch (rating) {
    case 1: // Again
      newEF = Math.max(1.3, easeFactor - 0.20);
      newInterval = 1;
      newReps = 0;
      newLapses = lapses + 1;
      break;

    case 2: // Hard
      newEF = Math.max(1.3, easeFactor - 0.15);
      newInterval = Math.max(1, Math.round(intervalDays * 1.2));
      newReps = repetitions + 1;
      break;

    case 3: // Good
      // newEF stays the same
      if (repetitions === 0) {
        newInterval = 1;
      } else if (repetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(intervalDays * easeFactor);
      }
      newReps = repetitions + 1;
      break;

    case 4: // Easy
      newEF = easeFactor + 0.15;
      if (repetitions === 0) {
        newInterval = 4;
      } else {
        newInterval = Math.round(intervalDays * easeFactor * 1.3);
      }
      newReps = repetitions + 1;
      break;
  }

  const dueAt = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

  return {
    easeFactor: newEF,
    intervalDays: newInterval,
    repetitions: newReps,
    dueAt,
    lapses: newLapses,
  };
}
