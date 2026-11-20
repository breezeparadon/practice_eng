import { notFound } from "next/navigation";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { getLessonForUser } from "@/server/queries";
import { requireUserId } from "@/server/session";

export default async function QuizPage({ params }: PageProps<"/quiz/[id]">) {
  const userId = await requireUserId();
  const { id } = await params;
  const found = await getLessonForUser(userId, id);
  if (!found) notFound();
  return (
    <QuizRunner
      lessonId={found.lesson.id}
      lessonTitle={found.lesson.titleEn}
      backHref={`/?level=${found.lesson.category.levelId}`}
    />
  );
}
