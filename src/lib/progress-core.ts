import { z } from "zod";
import { initialState, review, type WordState } from "./srs";

/**
 * Progress lives on this device only (owner decision 2026-11-20: no server, no database).
 * These are pure functions over the stored shape; src/lib/progress-store.ts does the I/O.
 */

const LessonProgressSchema = z.object({
  bestScore: z.number().int().min(0).max(100),
  attempts: z.number().int().min(0),
  passed: z.boolean(),
  updatedAt: z.string(),
});
const WordStateSchema = z.object({
  ease: z.number(),
  intervalDays: z.number().int().min(0),
  streak: z.number().int().min(0),
  nextReview: z.string(),
  mastered: z.boolean(),
});
export const ProgressSchema = z.object({
  v: z.literal(1),
  lessons: z.record(z.string(), LessonProgressSchema),
  words: z.record(z.string(), WordStateSchema),
});

export type LessonProgress = z.infer<typeof LessonProgressSchema>;
export type Progress = z.infer<typeof ProgressSchema>;

export const emptyProgress = (): Progress => ({ v: 1, lessons: {}, words: {} });

export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  try {
    const r = ProgressSchema.safeParse(JSON.parse(raw));
    return r.success ? r.data : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

function toWordState(s: Progress["words"][string] | undefined, now: Date): WordState {
  return s ? { ...s, nextReview: new Date(s.nextReview) } : initialState(now);
}

/** Records one finished lesson quiz: best score, passed (sticky), attempt count and each word's SRS state. */
export function applyQuizResult(
  p: Progress,
  lessonId: string,
  percent: number,
  passed: boolean,
  answers: { wordId: string; correct: boolean }[],
  now: Date,
): Progress {
  const prev = p.lessons[lessonId];
  const words = { ...p.words };
  for (const a of answers) {
    const next = review(toWordState(words[a.wordId], now), a.correct, now);
    words[a.wordId] = { ...next, nextReview: next.nextReview.toISOString() };
  }
  return {
    v: 1,
    lessons: {
      ...p.lessons,
      [lessonId]: {
        bestScore: Math.max(prev?.bestScore ?? 0, percent),
        attempts: (prev?.attempts ?? 0) + 1,
        passed: Boolean(prev?.passed) || passed,
        updatedAt: now.toISOString(),
      },
    },
    words,
  };
}

export function passedSet(p: Progress): Set<string> {
  return new Set(Object.entries(p.lessons).filter(([, l]) => l.passed).map(([id]) => id));
}

export function stats(p: Progress, now: Date) {
  const words = Object.values(p.words);
  return {
    passed: Object.values(p.lessons).filter((l) => l.passed).length,
    learning: words.length,
    mastered: words.filter((w) => w.mastered).length,
    due: words.filter((w) => new Date(w.nextReview) <= now).length,
  };
}
