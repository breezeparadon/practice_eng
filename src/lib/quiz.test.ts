import { describe, expect, it } from "vitest";
import { blankOut, buildQuiz, gradeQuiz, toPublic, type QuizWord } from "./quiz";
import { initialState, review } from "./srs";

const words: QuizWord[] = Array.from({ length: 16 }, (_, i) => ({
  id: `w${i}`,
  headword: `word${i}`,
  meaningTh: `ความหมาย${i}`,
  exampleEn: `I use the word${i} every single day at work.`,
  exampleTh: `ประโยค${i}`,
  emoji: i % 2 === 0 ? "📦" : null,
}));

describe("buildQuiz", () => {
  it("builds 10 questions with valid answers and distinct choices", () => {
    const q = buildQuiz(words, 42);
    expect(q).toHaveLength(10);
    for (const x of q) {
      expect(x.choices).toHaveLength(4);
      expect(new Set(x.choices).size).toBe(4);
      expect(x.answerIndex).toBeGreaterThanOrEqual(0);
      expect(x.answerIndex).toBeLessThan(4);
    }
    expect(new Set(q.map((x) => x.wordId)).size).toBe(10);
  });
  it("is deterministic for a seed", () => {
    expect(buildQuiz(words, 7)).toEqual(buildQuiz(words, 7));
  });
  it("falls back when a word has no emoji", () => {
    const noEmoji = words.map((w) => ({ ...w, emoji: null }));
    expect(buildQuiz(noEmoji, 3).some((x) => x.type === "pic_to_word")).toBe(false);
  });
  it("public questions hide the answer", () => {
    const pub = toPublic(buildQuiz(words, 1));
    expect(pub.every((x) => !("answerIndex" in x) && !("wordId" in x))).toBe(true);
  });
});

describe("blankOut", () => {
  it("blanks a simple plural", () => {
    expect(blankOut("Some keys are broken.", "key")).toBe("Some _____ are broken.");
  });
  it("blanks a phrase", () => {
    expect(blankOut("Use a paper clip here.", "paper clip")).toBe("Use a _____ here.");
  });
  it("handles doubling, e-drop and y→ied", () => {
    expect(blankOut("We are shopping today.", "shop")).toBe("We are _____ today.");
    expect(blankOut("She is making tea.", "make")).toBe("She is _____ tea.");
    expect(blankOut("He carried the box.", "carry")).toBe("He _____ the box.");
    expect(blankOut("Put the knives away.", "knife")).toBe("Put the _____ away.");
  });
  it("returns null when missing", () => {
    expect(blankOut("Nothing here.", "stapler")).toBeNull();
  });
});

describe("gradeQuiz", () => {
  it("scores on the server-side key and ignores bad input", () => {
    const q = buildQuiz(words, 9);
    const answers: Record<string, number | null> = {};
    q.forEach((x, i) => (answers[x.id] = i < 7 ? x.answerIndex : 99));
    const r = gradeQuiz(q, answers);
    expect(r.correct).toBe(7);
    expect(r.percent).toBe(70);
    expect(r.graded[9]?.chosen).toBeNull();
  });
});

describe("srs review", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("resets on a wrong answer", () => {
    const s = review({ ...initialState(now), intervalDays: 10, streak: 4 }, false, now);
    expect(s.intervalDays).toBe(0);
    expect(s.streak).toBe(0);
    expect(s.nextReview).toEqual(now);
  });
  it("grows and masters after enough right answers", () => {
    let s = initialState(now);
    for (let i = 0; i < 6; i++) s = review(s, true, now);
    expect(s.intervalDays).toBeGreaterThanOrEqual(21);
    expect(s.mastered).toBe(true);
  });
});
