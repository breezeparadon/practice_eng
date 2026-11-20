import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { LEVELS } from "../src/lib/config";
import { loadContent } from "../src/lib/content";
import { lessonKey } from "../src/lib/schema";

/** Upserts CSV content. Never deletes user progress: removed rows are marked inactive. */
async function main() {
  const { lessons, words, errors } = loadContent();
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    throw new Error("Content has errors; run npm run words:check");
  }
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: (process.env.DIRECT_URL || process.env.DATABASE_URL)! }) });
  try {
    for (const l of LEVELS) {
      await db.level.upsert({
        where: { id: l.id },
        update: { name: l.name, nameTh: l.nameTh, cefr: l.cefr },
        create: { id: l.id, name: l.name, nameTh: l.nameTh, cefr: l.cefr },
      });
    }

    const lessonIds = new Map<string, string>();
    for (const l of lessons) {
      const category = await db.category.upsert({
        where: { levelId_slug: { levelId: l.level, slug: l.category } },
        update: { family: l.family, nameEn: l.category_en, nameTh: l.category_th, order: l.category_order },
        create: { levelId: l.level, slug: l.category, family: l.family, nameEn: l.category_en, nameTh: l.category_th, order: l.category_order },
      });
      const lesson = await db.lesson.upsert({
        where: { categoryId_order: { categoryId: category.id, order: l.lesson } },
        update: { titleEn: l.title_en, titleTh: l.title_th, active: true },
        create: { categoryId: category.id, order: l.lesson, titleEn: l.title_en, titleTh: l.title_th },
      });
      lessonIds.set(lessonKey(l), lesson.id);
    }

    const keep = new Set<string>();
    for (const w of words) {
      const lessonId = lessonIds.get(lessonKey(w))!;
      const data = {
        order: w.order,
        phonetic: w.phonetic,
        readingTh: w.reading_th,
        meaningTh: w.meaning_th,
        exampleEn: w.example_en,
        exampleTh: w.example_th,
        noteEn: w.note_en ?? null,
        emoji: w.emoji ?? null,
        reviewed: w.reviewed,
        active: true,
      };
      const row = await db.word.upsert({
        where: { lessonId_headword_pos: { lessonId, headword: w.headword, pos: w.pos } },
        update: data,
        create: { lessonId, headword: w.headword, pos: w.pos, ...data },
      });
      keep.add(row.id);
    }

    const allLessonIds = [...lessonIds.values()];
    const inactiveWords = await db.word.updateMany({ where: { id: { notIn: [...keep] } }, data: { active: false } });
    const inactiveLessons = await db.lesson.updateMany({ where: { id: { notIn: allLessonIds } }, data: { active: false } });
    console.log(
      `seeded ${lessons.length} lessons, ${words.length} words; marked inactive: ${inactiveWords.count} words, ${inactiveLessons.count} lessons`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
