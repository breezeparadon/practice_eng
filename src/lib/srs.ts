import { SRS_MASTERED_INTERVAL_DAYS, SRS_MASTERED_STREAK, SRS_MIN_EASE } from "./config";

export type WordState = {
  ease: number;
  intervalDays: number;
  streak: number;
  nextReview: Date;
  mastered: boolean;
};

export const initialState = (now: Date): WordState => ({
  ease: 2.5,
  intervalDays: 0,
  streak: 0,
  nextReview: now,
  mastered: false,
});

const DAY = 24 * 60 * 60 * 1000;

/** Simplified SM-2. Wrong: review now, interval reset. Right: interval grows by ease. */
export function review(state: WordState, correct: boolean, now: Date): WordState {
  if (!correct) {
    return {
      ease: Math.max(SRS_MIN_EASE, state.ease - 0.2),
      intervalDays: 0,
      streak: 0,
      nextReview: now,
      mastered: false,
    };
  }
  const streak = state.streak + 1;
  const intervalDays = state.intervalDays === 0 ? 1 : state.intervalDays === 1 ? 3 : Math.round(state.intervalDays * state.ease);
  const ease = state.ease + 0.05;
  return {
    ease,
    intervalDays,
    streak,
    nextReview: new Date(now.getTime() + intervalDays * DAY),
    mastered: intervalDays >= SRS_MASTERED_INTERVAL_DAYS && streak >= SRS_MASTERED_STREAK,
  };
}
