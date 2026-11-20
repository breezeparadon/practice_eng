import { notFound } from "next/navigation";
import { LessonGate } from "@/components/lesson/LessonGate";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { allLessonIds, getLesson } from "@/lib/catalog";

export const dynamicParams = false;
export function generateStaticParams() {
  return allLessonIds().map((id) => ({ id }));
}

export default async function QuizPage({ params }: PageProps<"/quiz/[id]">) {
  const { id } = await params;
  const lesson = getLesson(id);
  if (!lesson) notFound();
  return (
    <LessonGate lessonId={lesson.id} siblingIds={lesson.siblingIds}>
      <QuizRunner
        lessonId={lesson.id}
        lessonTitle={lesson.titleEn}
        backHref={`/?level=${lesson.level.id}`}
        nextLessonId={lesson.nextLessonId}
        words={lesson.words.map(({ id: wid, headword, meaningTh, exampleEn, exampleTh, emoji }) => ({
          id: wid,
          headword,
          meaningTh,
          exampleEn,
          exampleTh,
          emoji,
        }))}
      />
    </LessonGate>
  );
}
