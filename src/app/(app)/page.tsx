import { Briefcase, Check, ChevronRight, House, Lock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LESSON_PASS_PERCENT } from "@/lib/config";
import { cn } from "@/lib/utils";
import { getLevelMap, getLevels, getStats, type CategorySummary, type LessonSummary } from "@/server/queries";
import { requireUserId } from "@/server/session";

function StateBadge({ lesson }: { lesson: LessonSummary }) {
  if (lesson.state === "passed") {
    return (
      <Badge className="bg-success/15 text-success">
        <Check data-icon="inline-start" />
        {lesson.bestScore}%
      </Badge>
    );
  }
  if (lesson.state === "locked") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <Lock data-icon="inline-start" />
        ล็อก
      </Badge>
    );
  }
  if (lesson.bestScore !== null) return <Badge variant="secondary">ลองใหม่ · {lesson.bestScore}%</Badge>;
  return <Badge>เริ่มเรียน</Badge>;
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-0.5">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

function CategoryCard({ c }: { c: CategorySummary }) {
  const passed = c.lessons.filter((l) => l.state === "passed").length;
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="border-b">
        <CardTitle className="font-thai font-semibold" lang="th">
          {c.nameTh}
        </CardTitle>
        <CardDescription className="flex items-center gap-3">
          <span lang="en">{c.nameEn}</span>
          <span className="ms-auto tabular-nums">
            {passed}/{c.lessons.length}
          </span>
        </CardDescription>
        <Progress value={(100 * passed) / Math.max(1, c.lessons.length)} className="mt-1 h-1" />
      </CardHeader>
      <ol className="divide-y">
        {c.lessons.map((l) => {
          const body = (
            <>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border text-xs tabular-nums text-muted-foreground">
                {l.order}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium" lang="en">
                  {l.titleEn}
                </span>
                <span className="truncate text-xs text-muted-foreground" lang="th">
                  {l.titleTh} · {l.wordCount} คำ
                </span>
              </span>
              <StateBadge lesson={l} />
              {l.state !== "locked" ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" /> : null}
            </>
          );
          const row = "flex min-h-14 items-center gap-3 px-4 py-2 text-sm";
          return (
            <li key={l.id}>
              {l.state === "locked" ? (
                <div className={cn(row, "opacity-50")}>{body}</div>
              ) : (
                <Link href={`/lesson/${l.id}`} className={cn(row, "transition-colors hover:bg-muted/50")}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export default async function Dashboard({ searchParams }: PageProps<"/">) {
  const userId = await requireUserId();
  const sp = await searchParams;
  const levels = await getLevels();
  const requested = Number(Array.isArray(sp.level) ? sp.level[0] : sp.level);
  const levelId = levels.some((l) => l.id === requested) ? requested : (levels[0]?.id ?? 1);
  const level = levels.find((l) => l.id === levelId);
  const rawFamily = Array.isArray(sp.family) ? sp.family[0] : sp.family;
  const family = rawFamily === "WORK" || rawFamily === "DAILY" ? rawFamily : null;
  const [categories, stats] = await Promise.all([getLevelMap(userId, levelId), getStats(userId)]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">บทเรียน</h1>
        <p className="text-sm text-muted-foreground" lang="th">
          ทุกบทมีแบบทดสอบท้ายบท ได้ {LESSON_PASS_PERCENT}% ขึ้นไปจะปลดล็อกบทถัดไปในหมวดนั้น
        </p>
      </div>

      <section aria-label="สรุป" className="grid grid-cols-3 gap-3">
        <Stat value={stats.passed} label="บทที่ผ่าน" />
        <Stat value={stats.learning} label="คำที่เรียนแล้ว" />
        <Stat value={stats.mastered} label="จำได้แม่น" />
      </section>

      <nav
        aria-label="ระดับ"
        className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="inline-flex h-10 items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground">
          {levels.map((l) => (
            <Link
              key={l.id}
              href={`/?level=${l.id}${family ? `&family=${family}` : ""}`}
              aria-current={l.id === levelId ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors hover:text-foreground",
                l.id === levelId && "bg-background text-foreground shadow-sm",
              )}
            >
              {l.nameTh}
              <span className="font-mono text-xs opacity-60">{l.cefr}</span>
            </Link>
          ))}
        </div>
      </nav>

      <nav aria-label="หมวด" className="flex gap-2">
        {(
          [
            [null, "ทั้งหมด"],
            ["WORK", "การทำงาน"],
            ["DAILY", "ชีวิตประจำวัน"],
          ] as const
        ).map(([f, label]) => (
          <Link
            key={label}
            href={`/?level=${levelId}${f ? `&family=${f}` : ""}`}
            aria-current={f === family ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3 text-sm transition-colors hover:bg-muted",
              f === family && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {categories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground" lang="th">
            ระดับ{level?.nameTh ?? ""}ยังไม่มีบทเรียน กำลังเพิ่มเนื้อหา
          </CardContent>
        </Card>
      ) : null}

      {(["WORK", "DAILY"] as const).map((fam) => {
        if (family && fam !== family) return null;
        const list = categories.filter((c) => c.family === fam);
        if (list.length === 0) return null;
        const Icon = fam === "WORK" ? Briefcase : House;
        return (
          <section key={fam} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Icon className="size-4 text-muted-foreground" />
              {fam === "WORK" ? "การทำงาน" : "ชีวิตประจำวัน"}
              <span className="text-sm font-normal text-muted-foreground">{list.length} หมวด</span>
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((c) => (
                <CategoryCard key={c.id} c={c} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
