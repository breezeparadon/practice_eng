import "server-only";
import { LEVELS } from "./config";
import { loadContent } from "./content";
import type { QuizWord } from "./quiz";
import { lessonKey, type LessonRow, type WordRow } from "./schema";

/**
 * Build-time view of the CSV content. Pages are statically generated from it; nothing reads
 * the CSVs at request time. Ids are stable across edits that do not rename things:
 * lesson id "1-home-1", word id "1|stapler|noun" (headword + pos are unique per level).
 */

export type WordView = QuizWord & {
  pos: string;
  phonetic: string;
  readingTh: string;
  noteEn: string | null;
  reviewed: boolean;
};

export type LessonSummary = { id: string; order: number; titleEn: string; titleTh: string; wordCount: number };
export type CategorySummary = {
  id: string;
  family: "DAILY" | "WORK";
  nameEn: string;
  nameTh: string;
  lessons: LessonSummary[];
};
export type LevelSummary = { id: number; name: string; nameTh: string; cefr: string; categories: CategorySummary[] };

export type LessonDetail = LessonSummary & {
  level: { id: number; nameTh: string };
  category: { nameTh: string; nameEn: string };
  words: WordView[];
  /** Lesson ids of this category in order, for the unlock rule. */
  siblingIds: string[];
  nextLessonId: string | null;
};

export const lessonId = (r: { level: number; category: string; lesson: number }) => `${r.level}-${r.category}-${r.lesson}`;
export const wordId = (w: Pick<WordRow, "level" | "headword" | "pos">) => `${w.level}|${w.headword.toLowerCase()}|${w.pos}`;

type Catalog = { levels: LevelSummary[]; lessons: Map<string, LessonDetail> };
let cached: Catalog | null = null;

function toWord(w: WordRow): WordView {
  return {
    id: wordId(w),
    headword: w.headword,
    pos: w.pos,
    phonetic: w.phonetic,
    readingTh: w.reading_th,
    meaningTh: w.meaning_th,
    exampleEn: w.example_en,
    exampleTh: w.example_th,
    noteEn: w.note_en ?? null,
    emoji: w.emoji ?? null,
    reviewed: w.reviewed,
  };
}

function build(): Catalog {
  const content = loadContent();
  if (content.errors.length > 0) throw new Error(`Content has errors; run npm run words:check\n${content.errors.join("\n")}`);

  const wordsByLesson = new Map<string, WordRow[]>();
  for (const w of content.words) wordsByLesson.set(lessonKey(w), [...(wordsByLesson.get(lessonKey(w)) ?? []), w]);

  const lessons = new Map<string, LessonDetail>();
  const levels: LevelSummary[] = LEVELS.map((lv) => {
    const rows = content.lessons.filter((l) => l.level === lv.id);
    const byCategory = new Map<string, LessonRow[]>();
    for (const r of rows) byCategory.set(r.category, [...(byCategory.get(r.category) ?? []), r]);

    const categories = [...byCategory.values()]
      .map((ls) => ls.sort((a, b) => a.lesson - b.lesson))
      .sort((a, b) => a[0]!.category_order - b[0]!.category_order)
      .map((ls): CategorySummary => {
        const first = ls[0]!;
        const siblingIds = ls.map(lessonId);
        const summaries = ls.map((l, i): LessonSummary => {
          const words = (wordsByLesson.get(lessonKey(l)) ?? []).sort((a, b) => a.order - b.order).map(toWord);
          const summary = { id: lessonId(l), order: l.lesson, titleEn: l.title_en, titleTh: l.title_th, wordCount: words.length };
          lessons.set(summary.id, {
            ...summary,
            level: { id: lv.id, nameTh: lv.nameTh },
            category: { nameTh: first.category_th, nameEn: first.category_en },
            words,
            siblingIds,
            nextLessonId: siblingIds[i + 1] ?? null,
          });
          return summary;
        });
        return {
          id: `${lv.id}-${first.category}`,
          family: first.family,
          nameEn: first.category_en,
          nameTh: first.category_th,
          lessons: summaries,
        };
      });
    return { id: lv.id, name: lv.name, nameTh: lv.nameTh, cefr: lv.cefr, categories };
  });
  return { levels, lessons };
}

function catalog(): Catalog {
  cached ??= build();
  return cached;
}

export const getLevels = (): LevelSummary[] => catalog().levels;
export const getLesson = (id: string): LessonDetail | null => catalog().lessons.get(id) ?? null;
export const allLessonIds = (): string[] => [...catalog().lessons.keys()];
