"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useSpeech } from "@/hooks/useSpeech";

type Item = { id: string; text: string };

type SpeechApi = {
  supported: boolean | null;
  speakingId: string | null;
  /** Text of the item playing now, for the aria-live region. */
  speakingText: string | null;
  readingAll: boolean;
  /** How many taps the learner has made, for first-time hints. */
  taps: number;
  lastWasSlow: boolean;
  tap: (id: string, text: string) => void;
  readAll: (items: Item[]) => void;
  stop: () => void;
};

const SpeechContext = createContext<SpeechApi | null>(null);

export function SpeechProvider({ children }: { children: ReactNode }) {
  const { supported, speakingId, lastWasSlow, speak, stop: stopSpeech } = useSpeech();
  const [readingAll, setReadingAll] = useState(false);
  const [taps, setTaps] = useState(0);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  // Each read-all chain gets a token; any other speech invalidates it so a
  // cancelled utterance's onend cannot advance a stale chain.
  const chain = useRef(0);

  const tap = useCallback(
    (id: string, text: string) => {
      chain.current++;
      setReadingAll(false);
      setTaps((n) => n + 1);
      setSpeakingText(text);
      speak(id, text);
    },
    [speak],
  );

  const readAll = useCallback(
    (items: Item[]) => {
      const token = ++chain.current;
      setReadingAll(true);
      const next = (i: number) => {
        if (chain.current !== token) return;
        const item = items[i];
        if (!item) {
          setReadingAll(false);
          setSpeakingText(null);
          return;
        }
        setSpeakingText(item.text);
        speak(item.id, item.text, { noSlowReplay: true, onEnd: () => setTimeout(() => next(i + 1), 250) });
      };
      next(0);
    },
    [speak],
  );

  const stop = useCallback(() => {
    chain.current++;
    setReadingAll(false);
    setSpeakingText(null);
    stopSpeech();
  }, [stopSpeech]);

  const value = useMemo(
    () => ({ supported, speakingId, speakingText, readingAll, taps, lastWasSlow, tap, readAll, stop }),
    [supported, speakingId, speakingText, readingAll, taps, lastWasSlow, tap, readAll, stop],
  );

  return (
    <SpeechContext.Provider value={value}>
      {children}
      <p className="sr-only" aria-live="polite">
        {speakingId && speakingText ? `กำลังเล่นเสียง ${speakingText}` : ""}
      </p>
    </SpeechContext.Provider>
  );
}

export function useSpeechApi(): SpeechApi {
  const ctx = useContext(SpeechContext);
  if (!ctx) throw new Error("useSpeechApi must be used inside <SpeechProvider>");
  return ctx;
}
