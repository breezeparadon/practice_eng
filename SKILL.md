---
name: book-reader-ui
description: Design and build the Wordbook UI so it feels like reading a printed book, with a poster-style lesson page, tap-to-hear words, and swipe or tap page turning. Use this skill for ANY frontend work in this project, including the lesson poster page, tap-to-hear pronunciation, the sentences and closing pages, dashboard, quiz screens, colors, fonts, dark mode, animations, gestures, keyboard navigation, accessibility and Thai text rendering, even if the request never says "book", "swipe" or "audio".
---

# Book reader UI

The product is vocabulary learning, but the experience should feel like holding a well-made book: paper, ink, a ribbon bookmark, page numbers, turning pages. Everything else stays quiet so the page turn is the one memorable moment.

## Design tokens

Put these in `src/app/globals.css` (Tailwind v4 `@theme`; if the project uses Tailwind v3, map them in `tailwind.config`). Do not substitute a cream-and-terracotta palette or a generic serif; the green desk, blue-black ink and crimson ribbon are deliberate.

```css
@import "tailwindcss";

@theme {
  --color-desk: #2e4a47;         /* the table the book lies on */
  --color-paper: #f1ebdd;
  --color-paper-shade: #e2d9c3;  /* page edges, gutter, dividers */
  --color-ink: #26252d;          /* blue-black, never pure black */
  --color-ink-soft: #5b5866;
  --color-ribbon: #9e2b3c;       /* bookmark and primary action */
  --color-ok: #3f7d5a;
  --color-miss: #8c2f39;

  --font-serif: var(--font-literata), var(--font-noto-serif-thai), Georgia, serif;
  --font-ui: var(--font-sarabun), system-ui, sans-serif;
  --font-phonetic: var(--font-gentium), var(--font-literata), serif;
}

/* Night reading: follow the system unless the user chose a theme */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-desk: #121416; --color-paper: #24222a; --color-paper-shade: #34313c;
    --color-ink: #e9e2d0; --color-ink-soft: #a9a496; --color-ribbon: #c4495b;
    --color-ok: #6fb58a; --color-miss: #d9707d;
  }
}
:root[data-theme="dark"] {
  --color-desk: #121416; --color-paper: #24222a; --color-paper-shade: #34313c;
  --color-ink: #e9e2d0; --color-ink-soft: #a9a496; --color-ribbon: #c4495b;
  --color-ok: #6fb58a; --color-miss: #d9707d;
}
```

Paper grain (inline SVG, no network request, roughly 5% opacity):

```css
.paper {
  background-color: var(--color-paper);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .05 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
.ribbon { clip-path: polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 10px), 0 100%); }
```

## Typography

Load with `next/font/google`, `display: "swap"`, subsets `latin` and `thai` where offered.

| Role | Font | Notes |
|---|---|---|
| Poster title, item words, English body | **Literata** | Made for long reading. Poster title weight 700, `clamp(2.25rem, 9vw, 3.5rem)`, line-height 1.05, sentence case. Item words 600 at 15px. Sentences 1.125rem, line-height 1.7 |
| Thai meanings and examples | **Noto Serif Thai** | Line-height 1.8 or more; Thai needs more air. Always set `lang="th"` on Thai text |
| Phonetic (IPA) | **Gentium Plus** | Built for IPA. Check that symbols such as ʃ, ə, ɪ render; if not, pick another IPA-capable face |
| UI controls, folio, running head | **Sarabun** | Supports Thai and Latin |

Rules: line length under 60 characters; left-aligned (never justified: Thai and English justify badly on narrow pages); sentence case everywhere; no all-caps labels; no accent on a single word in a heading.

## Layout: the poster page

Each lesson opens on a **poster page**, modeled on a printed vocabulary poster the owner likes: a big title at the top centre, one large scene in the middle, and 12 to 20 items spread around it. It is a layout idea only; never copy that book's artwork, wording or word choices. Poster pages are one page on every screen size. On desktop the page sits centered at about 760px wide, with more items per row.

```
Mobile (390px)
┌──────────────────────────┐
│ บทที่ 12              ▮  │ chapter chip left, ribbon right
│     Things in the office │ title: the biggest thing on the page
│       สิ่งของในออฟฟิศ     │
│      [ ฟังเสียงทั้งหน้า ]  │
│  item   ┌────────┐  item │
│  item   │  hero  │  item │ left column | scene | right column
│  item   │  scene │  item │
│  item   └────────┘  item │
│  item     item     item  │ bottom band, 3 columns
│  item     item     item  │
│            12            │ folio
└──────────────────────────┘
```

### Regions (data-driven, `lib/poster-layout.ts`)

- Regions: title block, hero scene, left column, right column, bottom band. Each word carries `region` (`LEFT`, `RIGHT`, `BOTTOM`) and `order`; the page is a CSS grid with those areas. Moving a word is a data edit.
- Column widths on mobile: about 30%, 40% (hero), 30%. Bottom band: 3 columns on mobile, 4 or 5 on desktop.
- Hand-placed feel: add a small deterministic offset per item (up to 8px in x and y, from a hash of the word id). No rotation; legibility comes first.
- If the content is taller than the screen, the page scrolls vertically inside itself. Never shrink the poster to fit.

```ts
// lib/poster-layout.ts
export function offsetFor(id: string, max = 8) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  const dx = ((h & 0xff) / 255 - 0.5) * 2 * max;
  const dy = (((h >> 8) & 0xff) / 255 - 0.5) * 2 * max;
  return { dx: Math.round(dx), dy: Math.round(dy) };
}
```

### One item

The whole item is a `<button type="button">` of at least 44px, centered text:

1. Picture: transparent cutout, about 56px on mobile and 72px on desktop (served from a 256px WebP). It is decorative inside the labelled button, so `alt=""`.
2. English word: Literata 600, 15px (16px desktop), line-height 1.25.
3. Thai reading in parentheses: Noto Serif Thai 12px, `--color-ribbon` (contrast about 6:1 on paper).
4. Thai meaning: Noto Serif Thai 700, 14px. Hidden when the user setting hides meanings.

`aria-label` is the English word with a Thai prefix: "ฟังเสียง negotiate". While speaking, the word gets a ribbon-colored underline **and** a small speaker glyph beside it (never color alone), and an `aria-live` region says which word is playing.

Abstract words use a picture metaphor or a small scene. Words with no honest picture are text only: same layout without the picture, never a broken-image icon.

### Other page types (in order after the poster)

1. **Sentences page.** One row per word: a 40px picture, the English example in Literata 18px, the Thai translation in Noto Serif Thai 15px below. Tapping a row speaks the sentence. Running head and folio like a book page.
2. **Closing page.** Words learned count and one primary action: "เริ่มทำแบบทดสอบ". The quiz itself lives at `/quiz/[id]`, not inside the book.

The poster is the chapter opener, so there is no separate opener page. The lesson number is a real sequence, so a numbered chip ("บทที่ 12") is fine.

### Book details (add all, keep each subtle)

- **Folio:** page number centered at the bottom of each page, in Sarabun, small.
- **Running head:** lesson title in italic at the top of the sentences and closing pages. The poster page uses its big title instead.
- **Page thickness:** stacked 1px offset `box-shadow` layers in `--color-paper-shade` on the outer edges. Right edge count is `min(8, pagesRemaining)`, left edge count is `min(8, pagesRead)`. It visibly thins as the learner reads.
- **Ribbon bookmark:** the crimson `.ribbon` hangs from the top edge. On the dashboard it marks the lesson to continue.
- **Gutter:** on desktop, a soft linear-gradient shadow along the center fold, `pointer-events: none`.
- **Pictures** are cutouts sitting directly on the paper: no frame, no card, no drop shadow.

Everything outside the book (dashboard, lesson map, quiz chrome) uses the same paper, ink and ribbon tokens on the green desk. Avoid identical rounded-card grids; lay the lesson map out like a table of contents (title, dotted leader, status), not like a SaaS card wall.

## Tap to hear

Tapping an item speaks the English word, like the speaker button in Google Translate. Free, in the browser, no audio files: Web Speech API only. All of it lives in `hooks/useSpeech.ts`.

- Tap: speak at normal rate (about 0.95). Tap the same item again within 4 seconds: speak slowly (about 0.6). Show a small hint the first time ("แตะอีกครั้งเพื่อฟังช้า").
- "ฟังเสียงทั้งหน้า" reads every item in order, highlighting each, and becomes "หยุด" while playing.
- Speak only from a tap (iOS requirement), cancel the current utterance before a new one, pick the voice after `voiceschanged`, prefer `en-US`.
- If `speechSynthesis` is missing, show one short Thai line ("อุปกรณ์นี้ยังไม่รองรับการอ่านออกเสียง") and keep everything else working.
- Items are buttons inside the swipeable book. A tap that barely moves speaks; a clear horizontal drag turns the page. Re-test on a real phone after wiring the drag handler.

```tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const voice = useRef<SpeechSynthesisVoice | null>(null);
  const last = useRef<{ id: string; at: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
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
    (id: string, text: string, opts?: { onEnd?: () => void }) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      const now = Date.now();
      const slow = last.current?.id === id && now - last.current.at < 4000;
      last.current = { id, at: now };
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice.current) u.voice = voice.current;
      u.lang = voice.current?.lang ?? "en-US";
      u.rate = slow ? 0.6 : 0.95;
      u.onstart = () => setSpeakingId(id);
      const done = () => {
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

  return { supported, speakingId, speak, stop };
}
```

"Read the whole page" chains `speak(id, text, { onEnd })` through the items in order; `stop()` ends the chain. Keep the chain logic out of the item component.

## Page turning

**Interaction spec**

- Swipe left: next page. Swipe right: previous page. Commit when the drag passes 80px or the velocity passes 500px/s; otherwise spring back.
- Visible prev and next buttons are always present. Swiping is an extra, never the only way.
- Keyboard: ArrowRight and ArrowLeft, ignored while focus is in an input, textarea or select.
- First page has no previous; the closing page has no next.
- Horizontal drag only. Vertical movement scrolls the page (`touch-action: pan-y`, `dragDirectionLock`).
- Ignore drags that start within 24px of the left screen edge (iOS Safari uses that edge for back navigation).
- Anything interactive that conflicts with dragging (audio scrubber, text inputs, practice widgets) gets `data-no-swipe`; the drag handler skips pointer-downs inside it.
- The turn animation is the only non-user-triggered motion in the whole app. No fade-in on each section, no hover lifts on cards.
- `prefers-reduced-motion`: replace the turn with a short cross-fade.
- Persist `lastPage` to `UserLessonProgress` through a debounced server action (at least 800ms between writes) and start from it on load.

**Reference implementation** (a starting point; adjust and test on real devices). Package: `motion`, imports from `motion/react`. Check current docs if the API has moved.

```tsx
"use client";

import {
  AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo,
} from "motion/react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type Props = {
  pages: ReactNode[];
  initialPage?: number;
  onPageChange?: (index: number) => void;
};

const SWIPE_DISTANCE = 80;   // px
const SWIPE_VELOCITY = 500;  // px/s
const EDGE_GUARD = 24;       // px, iOS back-swipe zone

export function PageBook({ pages, initialPage = 0, onPageChange }: Props) {
  const [[index, direction], setPage] = useState<[number, number]>([initialPage, 0]);
  const reduceMotion = useReducedMotion();
  const controls = useDragControls();
  const total = pages.length;

  const go = useCallback(
    (delta: 1 | -1) =>
      setPage(([i]) => {
        const next = Math.min(Math.max(i + delta, 0), total - 1);
        return next === i ? [i, 0] : [next, delta];
      }),
    [total],
  );

  useEffect(() => { onPageChange?.(index); }, [index, onPageChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) go(1);
    else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) go(-1);
  };

  const variants = reduceMotion
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        enter: (d: number) => ({ x: d > 0 ? "40%" : "-40%", rotateY: d > 0 ? 18 : -18, opacity: 0 }),
        center: { x: 0, rotateY: 0, opacity: 1 },
        exit: (d: number) => ({ x: d > 0 ? "-40%" : "40%", rotateY: d > 0 ? -18 : 18, opacity: 0 }),
      };

  return (
    <section
      aria-roledescription="book"
      aria-label="Lesson"
      className="relative mx-auto w-full max-w-5xl [perspective:1600px]"
    >
      <div className="relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={index}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
            drag="x"
            dragControls={controls}
            dragListener={false}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onPointerDown={(e) => {
              const el = e.target as HTMLElement;
              if (el.closest("[data-no-swipe]") || e.clientX < EDGE_GUARD) return;
              controls.start(e);
            }}
            onDragEnd={onDragEnd}
            style={{ touchAction: "pan-y", transformOrigin: "left center" }}
            role="group"
            aria-roledescription="page"
            aria-label={`Page ${index + 1} of ${total}`}
          >
            {pages[index]}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="mt-4 flex items-center justify-between font-ui">
        <button type="button" onClick={() => go(-1)} disabled={index === 0}>ก่อนหน้า</button>
        <span aria-hidden="true">{index + 1} / {total}</span>
        <button type="button" onClick={() => go(1)} disabled={index === total - 1}>ถัดไป</button>
      </nav>
      <p className="sr-only" aria-live="polite">Page {index + 1} of {total}</p>
    </section>
  );
}
```

A fuller curl (the page bending as the finger drags) is optional polish for a later pass. Only attempt it after the spec above works on a real phone, and keep the reduced-motion fallback.

## Words on screen (Thai UI)

Plain verbs, sentence case, one job per element. An action keeps its name through the whole flow.

| Where | Text |
|---|---|
| Next and previous page | ถัดไป · ก่อนหน้า |
| First-time hint on a poster | แตะคำเพื่อฟังเสียง |
| Slow replay hint | แตะอีกครั้งเพื่อฟังช้า |
| Read the whole page | ฟังเสียงทั้งหน้า (while playing: หยุด) |
| Item accessible name | ฟังเสียง + the English word |
| End of lesson | เริ่มทำแบบทดสอบ |
| Quiz passed | ผ่านแล้ว ปลดล็อกบทถัดไป |
| Quiz not passed | ได้ 6 จาก 10 ต้องได้อย่างน้อย 7 ลองอีกครั้งหรืออ่านบทเรียนทบทวน |
| Readiness | ประมาณการจากคำศัพท์เท่านั้น ไม่ใช่คะแนน TOEIC จริง |

Errors say what happened and what to do next, without apologizing or blaming the user. Empty states point at the next action ("ยังไม่มีคำให้ทบทวน อ่านบทเรียนก่อนแล้วกลับมาที่นี่").

## Accessibility and quality floor

- Visible keyboard focus on every control; the book works with keyboard alone.
- Item pictures sit inside a labelled button, so they use `alt=""`; the hero scene uses `alt` from `heroAlt`. Decorative book chrome (ribbon, gutter, edges) is `aria-hidden`.
- Never use color alone for right and wrong in quizzes; pair color with text or an icon, and mark a wrong answer with a strikethrough as well.
- Contrast at least 4.5:1 for body text in both themes (check `--color-ink-soft` on `--color-paper`).
- Touch targets at least 44px.
- Thai text: set `lang="th"`, allow normal wrapping, never `letter-spacing`, never uppercase transforms.
- Use `next/image` with explicit `sizes`. Item pictures are transparent WebP at about 256px, the hero scene about 768px.

## Verify before calling UI work done

1. The poster at 360px and at 1280px: nothing clipped, no horizontal page scroll, body text 13px or more, every item at least 44px.
2. Tap speaks the word on a real iPhone (Safari) and a real Android phone (Chrome); a second tap within 4 seconds is slower; "ฟังเสียงทั้งหน้า" plays all items and can be stopped.
3. With `speechSynthesis` unavailable, the Thai message appears and the page still works.
4. Swipe turns the page, a plain tap on an item does not turn it, and vertical scroll inside a tall poster still works.
5. Keyboard only: reach every item and control, speak with Enter or Space, turn pages with arrow keys.
6. Reduced motion on: no turn animation, page still changes.
7. Night mode and light mode: cutout pictures show no pale halos around their edges; Thai text and IPA glyphs render.
8. An item with no picture renders as text only.
9. Closing a lesson mid-way and reopening returns to the same page.
