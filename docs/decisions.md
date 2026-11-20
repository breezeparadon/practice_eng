# Decisions

## 2026-11-20

- **No book / page-flip UI.** A page-curl prototype (StPageFlip) was tried and dropped by the owner. The app is a plain, mobile-first web app: dashboard → lesson (word cards) → quiz. The `book-reader-ui` skill's page-turn and poster sections no longer apply; its tokens, fonts, tap-to-hear and accessibility rules still do.
- **Content size.** ~5,000 words. Organised as 5 levels × 16 categories (8 daily-life, 8 workplace), each category having ~4 lessons of 16 words per level (~310 lessons total). Categories reuse the same slug across levels.
- **CSV columns simplified** for now: no poster `region`, no image columns. `emoji` is an optional placeholder picture. Real images can be added later through the image pipeline.
- **Unlock rule.** Inside a category, lesson 1 is open and each next lesson unlocks when the previous lesson's quiz is passed (70%). All categories and all levels can be started freely, so the learner picks the topic. (Level exams and the placement test are planned, not built.)
- **Quiz.** 10 questions per lesson built on the server (picture→word, word→meaning, meaning→word, fill the blank, listen and choose). The answer key is stored in `QuizAttempt.questions`; the client only receives questions and sends choice indexes; the server scores. Every attempt is stored. Each answer also updates the word's SRS state.
- **Auth.** Auth.js v5 (beta, `next-auth@5.0.0-beta.32`), Google provider, JWT sessions, no DB adapter: our own `User` row is upserted by email on sign-in. Only emails in `ALLOWED_EMAILS` may sign in. A password-less "dev" login exists only when `NODE_ENV=development` and `DEV_LOGIN=true`.
- **Database.** Prisma 7 (`prisma-client` generator, `@prisma/adapter-pg`). Local dev: Postgres 17 in Docker (port 5440). Production: Supabase Postgres (free tier) + Vercel Hobby.
- **Word source.** Words are AI-drafted by Claude for this project (not copied from any book or official list) and start with `reviewed=false`; Thai meanings and readings need the owner's review.
- **Local ports.** App 3640, Postgres 5440 (others are used by other local projects).

## UI style: shadcn/ui (2026-11-20)

Owner asked for a shadcn look. `shadcn init` (radix base, neutral palette) added `components.json`,
`src/components/ui/*` (button, card, badge, progress, tabs, separator, radio-group, alert, switch, skeleton)
and the theme variables in `globals.css`. Paper/ink/ribbon tokens were removed.

- Fonts: Geist (Latin), IBM Plex Sans Thai (Thai), Geist Mono (numbers, labels), Gentium Plus (IPA only).
- Dark mode follows the system (`@custom-variant dark` uses `prefers-color-scheme`). One extra token: `--success`.
- Icons: lucide-react.
- The CLI wrote `cn` (an unrelated npm package) as the `cn()` source. Replaced with the standard
  `clsx` + `tailwind-merge` helper in `src/lib/utils.ts` and removed the `cn` package.

## Content size v2 (2026-11-20)

Owner asked for more categories and variety. Plan:

- Level 1 (A1): the original 16 categories × 4 lessons × 16 words, plus 8 new categories (`L1-e`) × 3 lessons × 14 words.
- Levels 2–5 (A2–C1): 24 categories each (12 daily, 12 work) × 3 lessons × 14 words, in batches `L<n>-a/b/c`.
- Total about 5,400 words. Category list per batch lives in the batch's `data/lessons/L<n>-<x>.csv`.
- Batch rules for writers: `docs/content-brief.md`.
- `words:check` now accepts file-name prefixes (`npm run words:check -- L3-b`) and warns when the same
  headword+pos appears in more than one level.
