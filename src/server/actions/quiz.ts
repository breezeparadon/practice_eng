"use server";

import { randomInt } from "node:crypto";
import { z } from "zod";
import { LESSON_PASS_PERCENT } from "@/lib/config";
import { db } from "@/lib/db";
import { buildQuiz, gradeQuiz, toPublic, type GradedQuestion, type PublicQuestion, type Question } from "@/lib/quiz";
import { initialState, review } from "@/lib/srs";
import { getLessonForUser } from "@/server/queries";
import { requireUserId } from "@/server/session";

const StartInput = z.object({ lessonId: z.string().min(1).max(64) });

export type StartQuizResult =
  | { ok: true; attemptId: string; questions: PublicQuestion[] }
  | { ok: false; error: string };

export async function startLessonQuiz(input: unknown): Promise<StartQuizResult> {
  const userId = await requireUserId();
  const parsed = StartInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const found = await getLessonForUser(userId, parsed.data.lessonId);
  if (!found) return { ok: false, error: "ไม่พบบทเรียนนี้" };
  if (found.state === "locked") return { ok: false, error: "บทนี้ยังล็อกอยู่ ผ่านบทก่อนหน้าก่อน" };

  const questions = buildQuiz(
    found.lesson.words.map((w) => ({
      id: w.id,
      headword: w.headword,
      meaningTh: w.meaningTh,
      exampleEn: w.exampleEn,
      exampleTh: w.exampleTh,
      emoji: w.emoji,
    })),
    randomInt(2 ** 31),
  );
  const attempt = await db.quizAttempt.create({
    data: { userId, kind: "LESSON", refId: found.lesson.id, questions },
  });
  return { ok: true, attemptId: attempt.id, questions: toPublic(questions) };
}

const SubmitInput = z.object({
  attemptId: z.string().min(1).max(64),
  answers: z.record(z.string().max(8), z.number().int().min(0).max(9).nullable()),
});

export type SubmitQuizResult =
  | {
      ok: true;
      percent: number;
      correct: number;
      total: number;
      passed: boolean;
      passPercent: number;
      review: Pick<GradedQuestion, "id" | "chosen" | "answerIndex" | "correct">[];
      nextLessonId: string | null;
    }
  | { ok: false; error: string };

export async function submitLessonQuiz(input: unknown): Promise<SubmitQuizResult> {
  const userId = await requireUserId();
  const parsed = SubmitInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const attempt = await db.quizAttempt.findUnique({ where: { id: parsed.data.attemptId } });
  if (!attempt || attempt.userId !== userId || attempt.kind !== "LESSON") return { ok: false, error: "ไม่พบแบบทดสอบนี้" };
  if (attempt.submittedAt) return { ok: false, error: "ส่งคำตอบชุดนี้ไปแล้ว เริ่มทำใหม่ได้" };

  const questions = attempt.questions as unknown as Question[];
  const result = gradeQuiz(questions, parsed.data.answers);
  const passed = result.percent >= LESSON_PASS_PERCENT;
  const now = new Date();

  await db.$transaction(async (tx) => {
    // Guard against a double submit racing past the check above.
    const claimed = await tx.quizAttempt.updateMany({
      where: { id: attempt.id, submittedAt: null },
      data: { answers: parsed.data.answers, score: result.percent, submittedAt: now },
    });
    if (claimed.count === 0) throw new Error("already submitted");

    const prev = await tx.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: attempt.refId } },
    });
    await tx.userLessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: attempt.refId } },
      create: { userId, lessonId: attempt.refId, status: passed ? "PASSED" : "STARTED", bestScore: result.percent, attempts: 1 },
      update: {
        status: passed || prev?.status === "PASSED" ? "PASSED" : "STARTED",
        bestScore: Math.max(prev?.bestScore ?? 0, result.percent),
        attempts: { increment: 1 },
      },
    });

    for (const g of result.graded) {
      const existing = await tx.userWordState.findUnique({ where: { userId_wordId: { userId, wordId: g.wordId } } });
      const next = review(existing ?? initialState(now), g.correct, now);
      await tx.userWordState.upsert({
        where: { userId_wordId: { userId, wordId: g.wordId } },
        create: { userId, wordId: g.wordId, ...next },
        update: next,
      });
    }
  });

  const found = await getLessonForUser(userId, attempt.refId);
  return {
    ok: true,
    percent: result.percent,
    correct: result.correct,
    total: result.total,
    passed,
    passPercent: LESSON_PASS_PERCENT,
    review: result.graded.map(({ id, chosen, answerIndex, correct }) => ({ id, chosen, answerIndex, correct })),
    nextLessonId: passed ? (found?.nextLessonId ?? null) : null,
  };
}
