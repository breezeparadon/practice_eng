import { describe, expect, it } from "vitest";
import { checkLessons, LessonRowSchema, WordRowSchema } from "./schema";

const lesson = LessonRowSchema.parse({
  level: "1",
  family: "WORK",
  category: "office",
  category_en: "Office",
  category_th: "ออฟฟิศ",
  category_order: "1",
  lesson: "1",
  title_en: "Things on a desk",
  title_th: "ของบนโต๊ะทำงาน",
});

const base = {
  level: "1",
  category: "office",
  lesson: "1",
  order: "1",
  headword: "pen",
  pos: "noun",
  phonetic: "/pen/",
  reading_th: "เพ็น",
  meaning_th: "ปากกา",
  example_en: "Sign your name here with a black pen.",
  example_th: "เซ็นชื่อตรงนี้ด้วยปากกาสีดำ",
  note_en: "",
  emoji: "🖊️",
  reviewed: "false",
};
const row = (i: number, extra: Partial<typeof base> = {}) =>
  WordRowSchema.parse({ ...base, order: String(i), headword: `pen${i}`, example_en: `Sign your name here with pen${i} now.`, ...extra });

describe("WordRowSchema", () => {
  it("parses a valid row", () => {
    const r = WordRowSchema.parse(base);
    expect(r.level).toBe(1);
    expect(r.reviewed).toBe(false);
    expect(r.note_en).toBeUndefined();
  });
  it("rejects a too-short example", () => {
    expect(WordRowSchema.safeParse({ ...base, example_en: "A pen." }).success).toBe(false);
  });
  it("rejects a bad reviewed value", () => {
    expect(WordRowSchema.safeParse({ ...base, reviewed: "yes" }).success).toBe(false);
  });
});

describe("checkLessons", () => {
  it("accepts 12 words", () => {
    const r = checkLessons([lesson], Array.from({ length: 12 }, (_, i) => row(i + 1)));
    expect(r.errors).toEqual([]);
  });
  it("flags too few words", () => {
    expect(checkLessons([lesson], [row(1)]).errors).toHaveLength(1);
  });
  it("flags duplicates and orphans", () => {
    const words = Array.from({ length: 12 }, (_, i) => row(i + 1));
    words.push(row(1));
    words.push(row(50, { category: "missing" }));
    const { errors } = checkLessons([lesson], words);
    expect(errors.some((e) => e.includes("duplicate"))).toBe(true);
    expect(errors.some((e) => e.includes("no lessons row"))).toBe(true);
  });
  it("warns when the example lacks the word", () => {
    const words = Array.from({ length: 12 }, (_, i) => row(i + 1));
    words[0] = row(1, { example_en: "This sentence has a different word inside." });
    expect(checkLessons([lesson], words).warnings).toHaveLength(1);
  });
});
