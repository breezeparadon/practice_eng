"use client";

import { Eye, EyeOff, Lightbulb, Play, Square, Volume2 } from "lucide-react";
import { useState } from "react";
import { SpeechProvider, useSpeechApi } from "@/components/speech/SpeechContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { WordView } from "@/lib/catalog";
import { cn } from "@/lib/utils";


function Toolbar({ words, showMeaning, onToggle }: { words: WordView[]; showMeaning: boolean; onToggle: () => void }) {
  const { supported, readingAll, readAll, stop, taps, lastWasSlow } = useSpeechApi();
  const hint =
    supported === false
      ? "อุปกรณ์นี้ยังไม่รองรับการอ่านออกเสียง"
      : taps === 0
        ? "แตะคำเพื่อฟังเสียง"
        : !lastWasSlow && taps < 4
          ? "แตะอีกครั้งเพื่อฟังช้า"
          : "";
  return (
    <div className="sticky top-14 z-10 -mx-4 flex flex-wrap items-center gap-2 border-b bg-background/80 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {supported ? (
        <Button
          variant={readingAll ? "secondary" : "default"}
          className="h-9"
          onClick={() => (readingAll ? stop() : readAll(words.map((w) => ({ id: w.id, text: w.headword }))))}
        >
          {readingAll ? <Square /> : <Play />}
          {readingAll ? "หยุด" : "ฟังเสียงทั้งหน้า"}
        </Button>
      ) : null}
      <Button variant="outline" className="h-9" aria-pressed={!showMeaning} onClick={onToggle}>
        {showMeaning ? <EyeOff /> : <Eye />}
        {showMeaning ? "ซ่อนคำแปล" : "แสดงคำแปล"}
      </Button>
      <span className="text-xs text-muted-foreground" lang="th" aria-live="polite">
        {hint}
      </span>
    </div>
  );
}

function WordCard({ word, showMeaning }: { word: WordView; showMeaning: boolean }) {
  const { speakingId, tap } = useSpeechApi();
  const exampleId = `${word.id}#ex`;
  const wordActive = speakingId === word.id;
  const exampleActive = speakingId === exampleId;
  return (
    <li>
      <Card
        size="sm"
        className={cn("h-full gap-3 transition-shadow", (wordActive || exampleActive) && "ring-2 ring-primary/40")}
      >
        <button
          type="button"
          onClick={() => tap(word.id, word.headword)}
          aria-label={`ฟังเสียง ${word.headword}`}
          className="flex items-start gap-3 px-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl"
          >
            {word.emoji ?? ""}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2">
              <span lang="en" className="text-lg leading-tight font-semibold tracking-tight">
                {word.headword}
              </span>
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {word.pos}
              </Badge>
            </span>
            <span className="text-sm text-muted-foreground">
              <span className="font-phonetic">{word.phonetic}</span>
              <span lang="th"> · {word.readingTh}</span>
            </span>
            {showMeaning ? (
              <span className="font-thai font-medium" lang="th">
                {word.meaningTh}
              </span>
            ) : null}
          </span>
          <Volume2
            aria-hidden="true"
            className={cn("mt-1 size-4 shrink-0", wordActive ? "animate-pulse text-primary" : "text-muted-foreground/60")}
          />
        </button>

        <div className="px-3">
          <button
            type="button"
            onClick={() => tap(exampleId, word.exampleEn)}
            aria-label={`ฟังเสียงประโยค ${word.exampleEn}`}
            className={cn(
              "flex w-full flex-col gap-0.5 rounded-md border-l-2 bg-muted/50 px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
              exampleActive ? "border-primary" : "border-border",
            )}
          >
            <span lang="en">{word.exampleEn}</span>
            {showMeaning ? (
              <span className="font-thai text-xs text-muted-foreground" lang="th">
                {word.exampleTh}
              </span>
            ) : null}
          </button>
          {word.noteEn ? (
            <p className="mt-2 flex gap-1.5 text-xs text-muted-foreground" lang="en">
              <Lightbulb className="size-3.5 shrink-0" />
              {word.noteEn}
            </p>
          ) : null}
        </div>
      </Card>
    </li>
  );
}

export function WordList({ words }: { words: WordView[] }) {
  const [showMeaning, setShowMeaning] = useState(true);
  return (
    <SpeechProvider>
      <Toolbar words={words} showMeaning={showMeaning} onToggle={() => setShowMeaning((v) => !v)} />
      <ul className="grid gap-3 sm:grid-cols-2">
        {words.map((w) => (
          <WordCard key={w.id} word={w} showMeaning={showMeaning} />
        ))}
      </ul>
    </SpeechProvider>
  );
}
