import "server-only";
import { db } from "@/lib/db";
import { lessonStates, type LessonState } from "@/lib/unlock";

export type LessonSummary = {
  id: string;
  order: number;
  titleEn: string;
  titleTh: string;
  wordCount: number;
  state: LessonState;
  bestScore: number | null;
};

export type CategorySummary = {
  id: string;
  family: "DAILY" | "WORK";
  nameEn: string;
  nameTh: string;
  lessons: LessonSummary[];
};

export async function getLevels() {
  return db.level.findMany({ orderBy: { id: "asc" } });
}

export async function getLevelMap(userId: string, levelId: number): Promise<CategorySummary[]> {
  const categories = await db.category.findMany({
    where: { levelId },
    orderBy: { order: "asc" },
    include: {
      lessons: {
        where: { active: true },
        orderBy: { order: "asc" },
        include: {
          _count: { select: { words: { where: { active: true } } } },
          progress: { where: { userId }, select: { status: true, bestScore: true } },
        },
      },
    },
  });

  return categories
    .filter((c) => c.lessons.length > 0)
    .map((c) => {
      const passed = new Set(c.lessons.filter((l) => l.progress[0]?.status === "PASSED").map((l) => l.id));
      const states = lessonStates(c.lessons.map((l) => l.id), passed);
      return {
        id: c.id,
        family: c.family,
        nameEn: c.nameEn,
        nameTh: c.nameTh,
        lessons: c.lessons.map((l) => ({
          id: l.id,
          order: l.order,
          titleEn: l.titleEn,
          titleTh: l.titleTh,
          wordCount: l._count.words,
          state: states.get(l.id) ?? "locked",
          bestScore: l.progress[0] ? l.progress[0].bestScore : null,
        })),
      };
    });
}

export async function getStats(userId: string) {
  const [passed, mastered, learning, due] = await Promise.all([
    db.userLessonProgress.count({ where: { userId, status: "PASSED" } }),
    db.userWordState.count({ where: { userId, mastered: true } }),
    db.userWordState.count({ where: { userId } }),
    db.userWordState.count({ where: { userId, nextReview: { lte: new Date() } } }),
  ]);
  return { passed, mastered, learning, due };
}

/** Lesson with its words, plus whether this user may open it. */
export async function getLessonForUser(userId: string, lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      category: { include: { level: true, lessons: { where: { active: true }, orderBy: { order: "asc" }, select: { id: true } } } },
      words: { where: { active: true }, orderBy: { order: "asc" } },
    },
  });
  if (!lesson || !lesson.active) return null;

  const siblingIds = lesson.category.lessons.map((l) => l.id);
  const progress = await db.userLessonProgress.findMany({
    where: { userId, lessonId: { in: siblingIds }, status: "PASSED" },
    select: { lessonId: true },
  });
  const states = lessonStates(siblingIds, new Set(progress.map((p) => p.lessonId)));
  const index = siblingIds.indexOf(lesson.id);
  return {
    lesson,
    state: states.get(lesson.id) ?? "locked",
    nextLessonId: siblingIds[index + 1] ?? null,
  };
}
