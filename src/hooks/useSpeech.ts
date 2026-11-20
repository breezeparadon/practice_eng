"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const NORMAL_RATE = 0.95;
export const SLOW_RATE = 0.6;
export const SLOW_REPLAY_WINDOW_MS = 4000;

type SpeakOptions = { onEnd?: () => void; noSlowReplay?: boolean };

/** The only place in the app that touches window.speechSynthesis. */
export function useSpeech() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [lastWasSlow, setLastWasSlow] = useState(false);
  const voice = useRef<SpeechSynthesisVoice | null>(null);
  const last = useRef<{ id: string; at: number } | null>(null);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "speechSynthesis" in window;
    // Feature detection must run on the client after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(ok);
    if (!ok) return;
    const synth = window.speechSynthesis;
    const pick = () => {
      const en = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
      voice.current =
        en.find((v) => v.lang === "en-US" && v.localService) ??
        en.find((v) => v.lang === "en-US") ??
        en[0] ??
        null;
    };
    pick();
    synth.addEventListener("voiceschanged", pick);
    return () => {
      synth.removeEventListener("voiceschanged", pick);
      synth.cancel();
    };
  }, []);

  const speak = useCallback(
    (id: string, text: string, opts?: SpeakOptions) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      const now = Date.now();
      const slow =
        !opts?.noSlowReplay && last.current?.id === id && now - last.current.at < SLOW_REPLAY_WINDOW_MS;
      last.current = { id, at: now };
      setLastWasSlow(slow);
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice.current) u.voice = voice.current;
      u.lang = voice.current?.lang ?? "en-US";
      u.rate = slow ? SLOW_RATE : NORMAL_RATE;
      // Highlight immediately: onstart is late or missing on some mobile browsers.
      setSpeakingId(id);
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        setSpeakingId((cur) => (cur === id ? null : cur));
        opts?.onEnd?.();
      };
      u.onend = done;
      u.onerror = done;
      synth.speak(u);
    },
    [supported],
  );

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, [supported]);

  return { supported, speakingId, lastWasSlow, speak, stop };
}
