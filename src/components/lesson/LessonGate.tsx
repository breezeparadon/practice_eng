"use client";

import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LESSON_PASS_PERCENT } from "@/lib/config";
import { passedSet } from "@/lib/progress-core";
import { useProgress } from "@/lib/progress-store";
import { lessonStates, type LessonState } from "@/lib/unlock";

export function useLessonState(lessonId: string, siblingIds: string[]): LessonState | null {
  const saved = useProgress();
  if (!saved) return null;
  return lessonStates(siblingIds, passedSet(saved)).get(lessonId) ?? "locked";
}

/** Hides a lesson's content until the previous lesson in its category is passed. */
export function LessonGate({ lessonId, siblingIds, children }: { lessonId: string; siblingIds: string[]; children: ReactNode }) {
  const state = useLessonState(lessonId, siblingIds);
  if (state === null) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }
  if (state === "locked") {
    return (
      <Alert>
        <Lock />
        <AlertTitle>บทนี้ยังล็อกอยู่</AlertTitle>
        <AlertDescription lang="th">ทำแบบทดสอบบทก่อนหน้าให้ได้ {LESSON_PASS_PERCENT}% ขึ้นไปก่อน</AlertDescription>
      </Alert>
    );
  }
  return <>{children}</>;
}

export function PassedBadge({ lessonId, siblingIds }: { lessonId: string; siblingIds: string[] }) {
  return useLessonState(lessonId, siblingIds) === "passed" ? (
    <Badge className="bg-success/15 text-success">ผ่านแล้ว</Badge>
  ) : null;
}
