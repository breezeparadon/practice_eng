"use client";

import { useSyncExternalStore } from "react";
import { applyQuizResult, parseProgress, type Progress } from "./progress-core";

/** localStorage-backed progress with a React hook. Returns null until the browser has read it. */

const KEY = "wordbook:progress:v1";
const listeners = new Set<() => void>();
let rawCache: string | null | undefined;
let parsedCache: Progress | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function snapshot(): Progress {
  const raw = readRaw();
  if (raw !== rawCache || !parsedCache) {
    rawCache = raw;
    parsedCache = parseProgress(raw);
  }
  return parsedCache;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) fn();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

export function useProgress(): Progress | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

export function saveQuizResult(
  lessonId: string,
  percent: number,
  passed: boolean,
  answers: { wordId: string; correct: boolean }[],
): boolean {
  const next = applyQuizResult(snapshot(), lessonId, percent, passed, answers, new Date());
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    // Ask the browser not to evict our data under storage pressure (best effort).
    void navigator.storage?.persist?.();
  } catch {
    return false;
  }
  for (const fn of listeners) fn();
  return true;
}
