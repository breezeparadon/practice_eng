import { z } from "zod";

/** CSV schemas. CSV files in data/ are the source of truth for content. */

const bool = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.enum(["true", "false"]))
  .transform((v) => v === "true");

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const LessonRowSchema = z.object({
  level: z.coerce.number().int().min(1).max(5),
  family: z.enum(["DAILY", "WORK"]),
  category: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "category must be a lowercase slug"),
  category_en: z.string().trim().min(1),
  category_th: z.string().trim().min(1),
  category_order: z.coerce.number().int().min(1),
  lesson: z.coerce.number().int().min(1),
  title_en: z.string().trim().min(1),
  title_th: z.string().trim().min(1),
});
export type LessonRow = z.infer<typeof LessonRowSchema>;

export const WordRowSchema = z.object({
  level: z.coerce.number().int().min(1).max(5),
  category: z.string().trim().min(1),
  lesson: z.coerce.number().int().min(1),
  order: z.coerce.number().int().min(1),
  headword: z.string().trim().min(1),
  pos: z.string().trim().min(1),
  phonetic: z.string().trim().min(1),
  reading_th: z.string().trim().min(1),
  meaning_th: z.string().trim().min(1),
  example_en: z
    .string()
    .trim()
    .refine((s) => {
      const n = wordCount(s);
      return n >= 6 && n <= 18;
    }, "example_en must be 6 to 18 words"),
  example_th: z.string().trim().min(1),
  note_en: optionalText,
  emoji: optionalText,
  reviewed: bool,
});
export type WordRow = z.infer<typeof WordRowSchema>;

export const MIN_WORDS = 12;
export const MAX_WORDS = 20;

export const lessonKey = (r: { level: number; category: string; lesson: number }) =>
  `L${r.level}/${r.category}/${r.lesson}`;

/** Regex source for a word and its regular inflections (shop→shopping, make→making, carry→carried, box→boxes). */
function inflections(word: string): string {
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const w = word.toLowerCase();
  const forms = new Set([`${esc(w)}(?:s|es|ed|d|ing|er|ers)?`]);
  if (/[^aeiou][aeiou][bdgklmnprt]$/.test(w)) forms.add(`${esc(w)}${esc(w.slice(-1))}(?:ed|ing|er|ers)`);
  if (/e$/.test(w)) forms.add(`${esc(w.slice(0, -1))}ing`);
  if (/[^aeiou]y$/.test(w)) forms.add(`${esc(w.slice(0, -1))}(?:ies|ied)`);
  if (/(?:f|fe)$/.test(w)) forms.add(`${esc(w.replace(/fe?$/, ""))}ves`);
  return `(?:${[...forms].join("|")})`;
}

/** Find where the headword (or a regular inflection of its last word) appears in the example. */
export function findHeadword(example: string, headword: string): { start: number; end: number } | null {
  const parts = headword.trim().split(/\s+/);
  const last = parts.pop() ?? "";
  const head = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
  const re = new RegExp(`\\b${head ? `${head}\\s+` : ""}${inflections(last)}\\b`, "i");
  const m = re.exec(example);
  return m ? { start: m.index, end: m.index + m[0].length } : null;
}

/** Cross-row checks that a single-row schema cannot express. Returns error messages. */
export function checkLessons(lessons: LessonRow[], words: WordRow[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lessonKeys = new Set<string>();
  for (const l of lessons) {
    const k = lessonKey(l);
    if (lessonKeys.has(k)) errors.push(`${k}: duplicate lesson row`);
    lessonKeys.add(k);
  }
  const byLesson = new Map<string, WordRow[]>();
  const seen = new Set<string>();
  const levelOf = new Map<string, number>();
  for (const w of words) {
    const k = lessonKey(w);
    if (!lessonKeys.has(k)) errors.push(`${k}: word "${w.headword}" has no lessons row`);
    byLesson.set(k, [...(byLesson.get(k) ?? []), w]);
    const dup = `${w.level}|${w.headword.toLowerCase()}|${w.pos}`;
    if (seen.has(dup)) errors.push(`${k}: duplicate "${w.headword}" (${w.pos}) in level ${w.level}`);
    seen.add(dup);
    const across = `${w.headword.toLowerCase()}|${w.pos}`;
    const other = levelOf.get(across);
    if (other !== undefined && other !== w.level) {
      warnings.push(`${k}: "${w.headword}" (${w.pos}) is also in level ${other}`);
    }
    if (other === undefined || w.level < other) levelOf.set(across, w.level);
    if (!findHeadword(w.example_en, w.headword)) {
      warnings.push(`${k}: example for "${w.headword}" does not contain the word (no fill-in-the-blank)`);
    }
  }
  for (const k of lessonKeys) {
    const n = byLesson.get(k)?.length ?? 0;
    if (n < MIN_WORDS || n > MAX_WORDS) errors.push(`${k}: has ${n} words, needs ${MIN_WORDS} to ${MAX_WORDS}`);
  }
  return { errors, warnings };
}
