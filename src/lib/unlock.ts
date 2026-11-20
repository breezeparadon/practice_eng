/**
 * Unlock rule (see docs/decisions.md): inside each category the first lesson is
 * open and each next lesson opens once the previous one is passed. Every
 * category and level can be started, so the learner chooses the topic.
 */
export type LessonState = "locked" | "open" | "passed";

export function lessonStates(orderedLessonIds: string[], passed: ReadonlySet<string>): Map<string, LessonState> {
  const out = new Map<string, LessonState>();
  let prevPassed = true;
  for (const id of orderedLessonIds) {
    if (passed.has(id)) out.set(id, "passed");
    else out.set(id, prevPassed ? "open" : "locked");
    prevPassed = passed.has(id);
  }
  return out;
}
