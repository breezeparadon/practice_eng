import { describe, expect, it } from "vitest";
import { applyQuizResult, emptyProgress, parseProgress, passedSet, stats } from "./progress-core";

const now = new Date("2026-01-01T00:00:00Z");

describe("progress", () => {
  it("keeps the best score and a sticky pass", () => {
    let p = applyQuizResult(emptyProgress(), "1-home-1", 80, true, [{ wordId: "1|bed|noun", correct: true }], now);
    p = applyQuizResult(p, "1-home-1", 40, false, [{ wordId: "1|bed|noun", correct: false }], now);
    expect(p.lessons["1-home-1"]).toMatchObject({ bestScore: 80, attempts: 2, passed: true });
    expect(passedSet(p).has("1-home-1")).toBe(true);
    expect(p.words["1|bed|noun"]?.streak).toBe(0);
  });
  it("round-trips through JSON and ignores bad data", () => {
    const p = applyQuizResult(emptyProgress(), "a", 100, true, [{ wordId: "w", correct: true }], now);
    expect(parseProgress(JSON.stringify(p))).toEqual(p);
    expect(parseProgress("{bad")).toEqual(emptyProgress());
    expect(parseProgress(JSON.stringify({ v: 2 }))).toEqual(emptyProgress());
  });
  it("counts stats", () => {
    const p = applyQuizResult(emptyProgress(), "a", 100, true, [{ wordId: "w", correct: false }], now);
    expect(stats(p, now)).toEqual({ passed: 1, learning: 1, mastered: 0, due: 1 });
  });
});
