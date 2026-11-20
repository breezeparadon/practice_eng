"use client";

import { BookOpen, Check, ChevronLeft, ChevronRight, LayoutGrid, RotateCcw, Volume2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SpeechProvider, useSpeechApi } from "@/components/speech/SpeechContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LESSON_PASS_PERCENT } from "@/lib/config";
import { saveQuizResult } from "@/lib/progress-store";
import { buildQuiz, gradeQuiz, type Question, type QuizWord } from "@/lib/quiz";
import { cn } from "@/lib/utils";

type Props = {
  lessonId: string;
  lessonTitle: string;
  backHref: string;
  nextLessonId: string | null;
  words: QuizWord[];
};
type Result = {
  percent: number;
  correct: number;
  total: number;
  passed: boolean;
  passPercent: number;
  review: { id: string; chosen: number | null; answerIndex: number; correct: boolean }[];
  nextLessonId: string | null;
  saved: boolean;
};

const INSTRUCTIONS: Record<Question["type"], string> = {
  pic_to_word: "รูปนี้คือคำไหน",
  word_to_meaning: "คำนี้แปลว่าอะไร",
  meaning_to_word: "คำภาษาอังกฤษของคำนี้คืออะไร",
  fill_blank: "เลือกคำที่เติมในช่องว่างได้ถูกต้อง",
  listen: "ฟังแล้วเลือกคำที่ได้ยิน",
};

function SpeakButton({ id, text, label }: { id: string; text: string; label: string }) {
  const { supported, speakingId, tap } = useSpeechApi();
  if (!supported) return null;
  return (
    <Button variant={speakingId === id ? "default" : "outline"} className="h-10 px-4" onClick={() => tap(id, text)}>
      <Volume2 className={cn(speakingId === id && "animate-pulse")} />
      {label}
    </Button>
  );
}

function Prompt({ q }: { q: Question }) {
  const { supported } = useSpeechApi();
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/40 p-5 text-center">
      {q.type === "pic_to_word" ? (
        <span className="text-6xl" role="img" aria-label="รูปภาพ">
          {q.prompt.text}
        </span>
      ) : null}
      {q.type === "word_to_meaning" ? (
        <span className="text-3xl font-semibold tracking-tight" lang="en">
          {q.prompt.text}
        </span>
      ) : null}
      {q.type === "meaning_to_word" ? (
        <span className="font-thai text-2xl font-semibold" lang="th">
          {q.prompt.text}
        </span>
      ) : null}
      {q.type === "fill_blank" ? (
        <>
          <span className="text-xl" lang="en">
            {q.prompt.text}
          </span>
          <span className="font-thai text-sm text-muted-foreground" lang="th">
            {q.prompt.hint}
          </span>
        </>
      ) : null}
      {q.prompt.speak && (q.type === "listen" || q.type === "word_to_meaning") ? (
        <SpeakButton id={`${q.id}-prompt`} text={q.prompt.speak} label={q.type === "listen" ? "ฟังเสียง" : "ฟัง"} />
      ) : null}
      {q.type === "listen" && supported === false ? (
        <span className="text-sm text-destructive" lang="th">
          อุปกรณ์นี้ยังไม่รองรับการอ่านออกเสียง ข้ามข้อนี้ได้
        </span>
      ) : null}
    </div>
  );
}

function Choices({ q, chosen, onChoose }: { q: Question; chosen: number | null; onChoose: (i: number) => void }) {
  const thai = q.type === "word_to_meaning";
  return (
    <RadioGroup
      aria-label="ตัวเลือก"
      value={chosen === null ? "" : String(chosen)}
      onValueChange={(v) => onChoose(Number(v))}
      className="gap-2"
    >
      {q.choices.map((c, i) => {
        const id = `${q.id}-c${i}`;
        return (
          <label
            key={c}
            htmlFor={id}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 py-2 transition-colors hover:bg-muted/50",
              chosen === i && "border-primary bg-primary/5 ring-1 ring-primary",
            )}
          >
            <RadioGroupItem value={String(i)} id={id} />
            <span className="font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}</span>
            <span className={cn("text-base", thai && "font-thai")} lang={thai ? "th" : "en"}>
              {c}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

function Results({
  result,
  questions,
  answers,
  lessonId,
  backHref,
  onRetry,
}: {
  result: Result;
  questions: Question[];
  answers: Record<string, number | null>;
  lessonId: string;
  backHref: string;
  onRetry: () => void;
}) {
  const need = Math.ceil((result.passPercent * result.total) / 100);
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="items-center text-center">
          <span
            className={cn(
              "mx-auto flex size-12 items-center justify-center rounded-full",
              result.passed ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            {result.passed ? <Check className="size-6" /> : <X className="size-6" />}
          </span>
          <CardTitle className="text-5xl font-semibold tabular-nums tracking-tight">{result.percent}%</CardTitle>
          <CardDescription className="text-base" lang="th">
            {result.passed
              ? `ผ่านแล้ว ปลดล็อกบทถัดไป (ถูก ${result.correct} จาก ${result.total})`
              : `ได้ ${result.correct} จาก ${result.total} ต้องได้อย่างน้อย ${need} ลองอีกครั้งหรืออ่านบทเรียนทบทวน`}
          </CardDescription>
          <Progress value={result.percent} className="mt-2 h-2" />
        </CardHeader>
        <CardContent className="flex flex-wrap justify-center gap-2">
          {result.nextLessonId ? (
            <Button asChild className="h-10 px-4">
              <Link href={`/lesson/${result.nextLessonId}`}>
                ไปบทถัดไป
                <ChevronRight />
              </Link>
            </Button>
          ) : null}
          <Button variant={result.passed ? "outline" : "default"} className="h-10 px-4" onClick={onRetry}>
            <RotateCcw />
            ทำอีกครั้ง
          </Button>
          <Button asChild variant="outline" className="h-10 px-4">
            <Link href={`/lesson/${lessonId}`}>
              <BookOpen />
              อ่านบทเรียน
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-10 px-4">
            <Link href={backHref}>
              <LayoutGrid />
              หน้ารวมบทเรียน
            </Link>
          </Button>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">เฉลย</h2>
        <ol className="flex flex-col gap-2">
          {questions.map((q, i) => {
            const r = result.review.find((x) => x.id === q.id);
            const chosen = answers[q.id];
            const answeredWrong = !r?.correct && typeof chosen === "number";
            return (
              <li key={q.id}>
                <Card size="sm">
                  <CardContent className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                        r?.correct ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {r?.correct ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="text-xs text-muted-foreground">
                        ข้อ {i + 1} · {INSTRUCTIONS[q.type]}
                        {q.type === "listen" ? ` (${q.prompt.speak})` : ""}
                      </p>
                      {q.prompt.text ? <p>{q.prompt.text}</p> : null}
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {r ? <Badge className="bg-success/15 text-success">{q.choices[r.answerIndex]}</Badge> : null}
                        {answeredWrong ? (
                          <Badge variant="destructive" className="line-through">
                            {q.choices[chosen]}
                          </Badge>
                        ) : null}
                        {!r?.correct && !answeredWrong ? (
                          <span className="text-xs text-muted-foreground">ไม่ได้ตอบ</span>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

/**
 * Rendered only in the browser: the quiz page wraps it in LessonGate, which shows a skeleton
 * until saved progress is read, so the random seed never runs during server rendering.
 */
function Runner({ lessonId, lessonTitle, backHref, nextLessonId, words, onRetry }: Props & { onRetry: () => void }) {
  const [questions] = useState<Question[]>(() => buildQuiz(words, Math.floor(Math.random() * 2 ** 31)));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [result, setResult] = useState<Result | null>(null);
  const retry = onRetry;

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        {!result.saved ? (
          <Alert variant="destructive">
            <X />
            <AlertTitle>บันทึกผลไม่สำเร็จ</AlertTitle>
            <AlertDescription lang="th">เบราว์เซอร์นี้ไม่ให้เก็บข้อมูล (เช่นโหมดไม่ระบุตัวตน) ผลครั้งนี้จะไม่ถูกจำ</AlertDescription>
          </Alert>
        ) : null}
        <Results
          result={result}
          questions={questions}
          answers={answers}
          lessonId={lessonId}
          backHref={backHref}
          onRetry={retry}
        />
      </div>
    );
  }

  const q = questions[index];
  if (!q) return null;
  const total = questions.length;
  const isLast = index === total - 1;
  const answered = questions.filter((x) => typeof answers[x.id] === "number").length;

  const submit = () => {
    const graded = gradeQuiz(questions, answers);
    const passed = graded.percent >= LESSON_PASS_PERCENT;
    const saved = saveQuizResult(
      lessonId,
      graded.percent,
      passed,
      graded.graded.map((g) => ({ wordId: g.wordId, correct: g.correct })),
    );
    setResult({
      percent: graded.percent,
      correct: graded.correct,
      total: graded.total,
      passed,
      passPercent: LESSON_PASS_PERCENT,
      review: graded.graded.map(({ id, chosen, answerIndex, correct }) => ({ id, chosen, answerIndex, correct })),
      nextLessonId: passed ? nextLessonId : null,
      saved,
    });
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate text-muted-foreground" lang="en">
            แบบทดสอบ · {lessonTitle}
          </span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {index + 1}/{total}
          </span>
        </div>
        <Progress value={(answered / total) * 100} className="h-1.5" aria-label={`ตอบแล้ว ${answered} จาก ${total} ข้อ`} />
      </div>

      <Card>
        <CardHeader>
          <CardDescription>ข้อ {index + 1}</CardDescription>
          <CardTitle className="font-thai text-lg font-semibold" lang="th">
            {INSTRUCTIONS[q.type]}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Prompt q={q} />
          <Choices q={q} chosen={answers[q.id] ?? null} onChoose={(i) => setAnswers((a) => ({ ...a, [q.id]: i }))} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" className="h-10" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
          <ChevronLeft />
          ก่อนหน้า
        </Button>
        {isLast ? (
          <Button className="h-10 px-5" onClick={submit}>
            <Check />
            {`ส่งคำตอบ (${answered}/${total})`}
          </Button>
        ) : (
          <Button
            variant={typeof answers[q.id] === "number" ? "default" : "outline"}
            className="h-10 px-5"
            onClick={() => setIndex((i) => i + 1)}
          >
            {typeof answers[q.id] === "number" ? "ข้อถัดไป" : "ข้าม"}
            <ChevronRight />
          </Button>
        )}
      </div>
    </div>
  );
}

export function QuizRunner(props: Props) {
  const [run, setRun] = useState(0);
  return (
    <SpeechProvider>
      <Runner key={run} {...props} onRetry={() => setRun((n) => n + 1)} />
    </SpeechProvider>
  );
}
