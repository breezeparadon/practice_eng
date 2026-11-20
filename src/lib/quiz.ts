import { QUIZ_CHOICES, QUIZ_QUESTIONS } from "./config";
import { findHeadword } from "./schema";

/** Pure quiz building and scoring. The server builds, stores and scores; the client only renders. */

export type QuizWord = {
  id: string;
  headword: string;
  meaningTh: string;
  exampleEn: string;
  exampleTh: string;
  emoji?: string | null;
};

export type QuestionType = "pic_to_word" | "word_to_meaning" | "meaning_to_word" | "fill_blank" | "listen";

export type Prompt = {
  /** Big text shown to the learner (emoji, word, Thai meaning or sentence with a blank). */
  text?: string;
  /** Smaller helper line (Thai translation of a sentence). */
  hint?: string;
  /** Text the client speaks for this question (listen questions, word prompts). */
  speak?: string;
};

export type Question = {
  id: string;
  type: QuestionType;
  wordId: string;
  prompt: Prompt;
  choices: string[];
  answerIndex: number;
};

export type PublicQuestion = Omit<Question, "answerIndex" | "wordId">;

export type GradedQuestion = Question & { chosen: number | null; correct: boolean };

/** Deterministic PRNG so a quiz can be rebuilt and tested. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/** Planned mix for 10 questions; falls back when a word cannot support a type. */
const PLAN: QuestionType[] = [
  "pic_to_word",
  "pic_to_word",
  "word_to_meaning",
  "word_to_meaning",
  "word_to_meaning",
  "fill_blank",
  "fill_blank",
  "fill_blank",
  "listen",
  "listen",
];

export function blankOut(example: string, headword: string): string | null {
  const at = findHeadword(example, headword);
  if (!at) return null;
  return `${example.slice(0, at.start)}_____${example.slice(at.end)}`;
}

function supports(type: QuestionType, w: QuizWord): boolean {
  if (type === "pic_to_word") return Boolean(w.emoji);
  if (type === "fill_blank") return blankOut(w.exampleEn, w.headword) !== null;
  return true;
}

function choicesFor(
  target: QuizWord,
  pool: QuizWord[],
  field: "headword" | "meaningTh",
  rand: () => number,
  n = QUIZ_CHOICES,
): { choices: string[]; answerIndex: number } {
  const answer = target[field];
  const seen = new Set([answer.toLowerCase()]);
  const distractors: string[] = [];
  for (const w of shuffle(pool, rand)) {
    const v = w[field];
    if (w.id === target.id || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    distractors.push(v);
    if (distractors.length === n - 1) break;
  }
  const choices = shuffle([answer, ...distractors], rand);
  return { choices, answerIndex: choices.indexOf(answer) };
}

export function buildQuiz(words: QuizWord[], seed: number, count = QUIZ_QUESTIONS): Question[] {
  if (words.length < QUIZ_CHOICES) throw new Error("A quiz needs at least 4 words");
  const rand = rng(seed);
  const targets = shuffle(words, rand).slice(0, Math.min(count, words.length));
  const plan = shuffle(PLAN.slice(0, targets.length), rand);

  return targets.map((w, i): Question => {
    const planned = plan[i] ?? "word_to_meaning";
    const type: QuestionType = supports(planned, w) ? planned : "meaning_to_word";
    const id = `q${i + 1}`;
    switch (type) {
      case "pic_to_word":
        return { id, type, wordId: w.id, prompt: { text: w.emoji ?? "" }, ...choicesFor(w, words, "headword", rand) };
      case "word_to_meaning":
        return { id, type, wordId: w.id, prompt: { text: w.headword, speak: w.headword }, ...choicesFor(w, words, "meaningTh", rand) };
      case "fill_blank":
        return {
          id,
          type,
          wordId: w.id,
          prompt: { text: blankOut(w.exampleEn, w.headword) ?? "", hint: w.exampleTh },
          ...choicesFor(w, words, "headword", rand),
        };
      case "listen":
        return { id, type, wordId: w.id, prompt: { speak: w.headword }, ...choicesFor(w, words, "headword", rand) };
      case "meaning_to_word":
        return { id, type, wordId: w.id, prompt: { text: w.meaningTh }, ...choicesFor(w, words, "headword", rand) };
    }
  });
}

export function toPublic(questions: Question[]): PublicQuestion[] {
  return questions.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, choices: q.choices }));
}

/** answers maps question id → chosen choice index (or null when skipped). */
export function gradeQuiz(questions: Question[], answers: Record<string, number | null>) {
  const graded: GradedQuestion[] = questions.map((q) => {
    const raw = answers[q.id];
    const chosen = typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw < q.choices.length ? raw : null;
    return { ...q, chosen, correct: chosen === q.answerIndex };
  });
  const correct = graded.filter((g) => g.correct).length;
  const percent = questions.length === 0 ? 0 : Math.round((100 * correct) / questions.length);
  return { graded, correct, total: questions.length, percent };
}
