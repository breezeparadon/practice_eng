import { describe, expect, it } from "vitest";
import { lessonStates } from "./unlock";

describe("lessonStates", () => {
  it("opens only the first lesson at the start", () => {
    expect([...lessonStates(["a", "b", "c"], new Set()).values()]).toEqual(["open", "locked", "locked"]);
  });
  it("opens the next lesson after a pass", () => {
    expect([...lessonStates(["a", "b", "c"], new Set(["a"])).values()]).toEqual(["passed", "open", "locked"]);
  });
  it("keeps passed lessons passed", () => {
    expect([...lessonStates(["a", "b", "c"], new Set(["a", "b", "c"])).values()]).toEqual(["passed", "passed", "passed"]);
  });
});
