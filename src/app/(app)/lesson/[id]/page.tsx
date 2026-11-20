import { ChevronLeft, ClipboardCheck, Lock, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WordList } from "@/components/lesson/WordList";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LESSON_PASS_PERCENT, QUIZ_QUESTIONS } from "@/lib/config";
import { getLessonForUser } from "@/server/queries";
import { requireUserId } from "@/server/session";

export default async function LessonPage({ params }: PageProps<"/lesson/[id]">) {
  const userId = await requireUserId();
  const { id } = await params;
  const found = await getLessonForUser(userId, id);
  if (!found) notFound();
  const { lesson, state } = found;
  const back = `/?level=${lesson.category.levelId}`;

  const backLink = (
    <Button asChild variant="ghost" size="sm" className="-ms-2 w-fit text-muted-foreground">
      <Link href={back}>
        <ChevronLeft />
        {lesson.category.level.nameTh} · {lesson.category.nameTh}
      </Link>
    </Button>
  );

  if (state === "locked") {
    return (
      <div className="flex flex-col gap-4">
        {backLink}
        <Alert>
          <Lock />
          <AlertTitle>บทนี้ยังล็อกอยู่</AlertTitle>
          <AlertDescription lang="th">ทำแบบทดสอบบทก่อนหน้าให้ได้ {LESSON_PASS_PERCENT}% ขึ้นไปก่อน</AlertDescription>
        </Alert>
      </div>
    );
  }

  const unreviewed = lesson.words.filter((w) => !w.reviewed).length;
  return (
    <article className="flex flex-col gap-4">
      {backLink}
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline">บทที่ {lesson.order}</Badge>
          <Badge variant="secondary">{lesson.words.length} คำ</Badge>
          {state === "passed" ? <Badge className="bg-success/15 text-success">ผ่านแล้ว</Badge> : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight" lang="en">
          {lesson.titleEn}
        </h1>
        <p className="font-thai text-muted-foreground" lang="th">
          {lesson.titleTh}
        </p>
      </header>

      {unreviewed > 0 ? (
        <Alert>
          <TriangleAlert />
          <AlertTitle>ฉบับร่าง</AlertTitle>
          <AlertDescription lang="th">{unreviewed} คำยังไม่ได้ตรวจคำแปลและคำอ่าน</AlertDescription>
        </Alert>
      ) : null}

      <WordList
        words={lesson.words.map((w) => ({
          id: w.id,
          headword: w.headword,
          pos: w.pos,
          phonetic: w.phonetic,
          readingTh: w.readingTh,
          meaningTh: w.meaningTh,
          exampleEn: w.exampleEn,
          exampleTh: w.exampleTh,
          noteEn: w.noteEn,
          emoji: w.emoji,
        }))}
      />

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
    </article>
  );
}
