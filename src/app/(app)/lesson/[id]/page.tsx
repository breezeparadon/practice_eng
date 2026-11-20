import { ChevronLeft, ClipboardCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonGate, PassedBadge } from "@/components/lesson/LessonGate";
import { WordList } from "@/components/lesson/WordList";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { allLessonIds, getLesson } from "@/lib/catalog";
import { LESSON_PASS_PERCENT, QUIZ_QUESTIONS } from "@/lib/config";

export const dynamicParams = false;
export function generateStaticParams() {
  return allLessonIds().map((id) => ({ id }));
}

export default async function LessonPage({ params }: PageProps<"/lesson/[id]">) {
  const { id } = await params;
  const lesson = getLesson(id);
  if (!lesson) notFound();
  const unreviewed = lesson.words.filter((w) => !w.reviewed).length;

  return (
    <article className="flex flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="-ms-2 w-fit text-muted-foreground">
        <Link href={`/?level=${lesson.level.id}`}>
          <ChevronLeft />
          {lesson.level.nameTh} · {lesson.category.nameTh}
        </Link>
      </Button>
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline">บทที่ {lesson.order}</Badge>
          <Badge variant="secondary">{lesson.words.length} คำ</Badge>
          <PassedBadge lessonId={lesson.id} siblingIds={lesson.siblingIds} />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight" lang="en">
          {lesson.titleEn}
        </h1>
        <p className="font-thai text-muted-foreground" lang="th">
          {lesson.titleTh}
        </p>
      </header>

      <LessonGate lessonId={lesson.id} siblingIds={lesson.siblingIds}>
        <div className="flex flex-col gap-4">
          {unreviewed > 0 ? (
            <Alert>
              <TriangleAlert />
              <AlertTitle>ฉบับร่าง</AlertTitle>
              <AlertDescription lang="th">{unreviewed} คำยังไม่ได้ตรวจคำแปลและคำอ่าน</AlertDescription>
            </Alert>
          ) : null}

          <WordList words={lesson.words} />

          <Card className="mt-4">
            <CardHeader className="items-center text-center">
              <CardTitle className="text-lg font-semibold">พร้อมทดสอบหรือยัง</CardTitle>
              <CardDescription lang="th">
                {QUIZ_QUESTIONS} ข้อ ได้ {LESSON_PASS_PERCENT}% ขึ้นไปเพื่อปลดล็อกบทถัดไป
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild size="lg" className="h-11 px-6">
                <Link href={`/quiz/${lesson.id}`}>
                  <ClipboardCheck />
                  เริ่มทำแบบทดสอบ
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </LessonGate>
    </article>
  );
}
