# Wordbook: English vocabulary, read like a book

> **Update 2026-11-20 (owner decision):** the book / page-turn / poster layout is dropped. The app is a plain mobile-first site: dashboard → lesson word cards (tap to hear) → 10-question lesson quiz. Current structure, CSV columns, unlock rule and auth setup are in `docs/decisions.md`; they override the older sections below where they differ. Local dev: `docker compose up -d` → http://localhost:3640 (Postgres on 5440).

Working name: **Wordbook** (rename freely). A personal web app for learning everyday and workplace English vocabulary, ordered from basic to expert. Each lesson is an illustrated **poster page**: a big title and a scene in the middle, with small pictures and words spread around it. **Tap any word to hear it spoken**, like the speaker button in Google Translate. Lessons are pages in a book you turn by swiping. Progress, quiz scores and a TOEIC-readiness estimate are saved per user.

Single owner, own use. The learner is Thai: meanings and UI instructions are in Thai, vocabulary is English.

## Hard constraints

- **Zero running cost.** Free tiers only. Never add a paid service, a paid API key, or a dependency that needs a card. If something needs billing, stop and ask.
- Free-tier limits change. Before relying on one (Gemini image quota, Neon or Supabase storage, Vercel Hobby limits, Cloudflare R2), read the provider's current docs and record the number and date in `docs/limits.md`.
- Never commit secrets. `.env.local` is gitignored; keep `.env.example` current.
- Reply to the owner in Thai. Code, identifiers, comments and commit messages in English. When showing code in chat, print complete files, not diffs.

## Stack

- Next.js (latest stable, App Router), TypeScript `strict`, Tailwind CSS
- Postgres on a free tier (Neon or Supabase) with Prisma
- Auth.js (next-auth v5): Google provider, JWT sessions. Check the current official docs before installing, because package status and setup steps may have changed
- Zod for all input validation; Server Components by default; Server Actions for mutations
- `motion` package for the page turn
- Vitest for pure logic (`srs`, `readiness`, `quiz`, `poster-layout`); Playwright optional for the reader
- Images: transparent WebP files in object storage (Cloudflare R2 free tier or Supabase Storage), URLs in the DB. **Not in git.**
- **Pronunciation: the browser's Web Speech API (`speechSynthesis`) only.** No paid TTS, no recorded audio files.
- Deploy: Vercel Hobby

## Skills (read before working on these areas)

- `.claude/skills/book-reader-ui/SKILL.md`: any UI work. Visual design, poster page, tap-to-hear, page turn, swipe, typography, accessibility.
- `.claude/skills/vocab-content-pipeline/SKILL.md`: word CSVs, seeding, image generation, background removal, review and upload.

## Commands (create these npm scripts in Phase 1)

```
npm run dev            # next dev
npm run build          # must pass before any phase is "done"
npm run lint
npm run test           # vitest
npm run db:migrate     # prisma migrate dev
npm run db:seed        # import data/ CSVs
npm run words:check    # validate CSVs against the Zod schema
npm run images:gen     # generate images (resumable, rate-limited)
npm run images:process # cut out, resize to WebP, upload, write URLs to DB
```

## Structure

```
src/
  app/
    (auth)/login/
    (app)/dashboard/  learn/[level]/  lesson/[id]/  quiz/[id]/
          review/  progress/  placement/  mock-toeic/
    admin/images/             # approve or reject generated images (owner only)
    api/auth/[...nextauth]/
  components/book/            # PageBook, PosterPage, PosterItem, SentencesPage, ClosingPage, Ribbon, Folio
  components/quiz/
  hooks/useSpeech.ts          # the only place that touches speechSynthesis
  lib/                        # config.ts srs.ts readiness.ts quiz.ts poster-layout.ts db.ts auth.ts
  server/actions/
prisma/   schema.prisma  seed.ts
scripts/  import-words.ts  generate-images.ts  fetch-pexels.ts  process-images.ts
data/     lessons/*.csv  words/*.csv     # CSV files are the source of truth for content
docs/     limits.md  decisions.md
```

## Lesson page: the poster

The owner chose this layout from a printed vocabulary poster: the title is big and sits at the top centre, one large scene fills the middle, and **12 to 20 items** (small picture, English word, Thai reading in red, Thai meaning in bold) are spread around the scene. Use it as a layout idea only. **Do not copy that book's artwork, wording, word choices or its exact page.** Visual details live in the `book-reader-ui` skill.

- **Region-based layout, driven by data.** Regions: title block, hero scene, left column, right column, bottom band. Each word has `region` and `order`; the renderer adds a small deterministic offset per item (based on the word id) so it feels hand-placed. Re-arranging a lesson is a data edit, not a code change. Put the placement logic in `lib/poster-layout.ts` and unit-test it.
- **Mobile first.** At 360 to 430px wide, text stays at 13px or more and every item is a touch target of at least 44px. If the poster is taller than the screen, scroll vertically inside the page. Never shrink the whole poster to fit.
- **Abstract words** get a picture metaphor or a small scene (for example a heart with a lotus for "merit"). A function word with no honest picture can be text only.
- **Pages in a lesson, in order:** poster page (title, scene and items), sentences page (each word's example sentence in English and Thai, tap a sentence to hear it), closing page ("เริ่มทำแบบทดสอบ").
- The Thai meaning is visible by default. A user setting can hide it so the learner guesses from the picture first; tapping to hear works either way.

### Tap to hear (`hooks/useSpeech.ts`)

- Tap an item: speak its English headword and highlight the item while it plays. Tap the same item again within 4 seconds: replay slowly (rate about 0.6; normal is about 0.95), like the slow button in Google Translate.
- A "ฟังเสียงทั้งหน้า" button reads every item on the page in order, highlighting each as it plays, and can be stopped.
- Use `speechSynthesis` after a user tap (iOS requires that). Cancel the current utterance before starting another. Choose an English voice after the `voiceschanged` event, preferring `en-US`. Feature-detect: if unsupported, show a short Thai message and keep the rest of the page working.
- Voice quality and accent depend on the device. Test on a real iPhone and a real Android phone, and do not promise identical voices. A US or UK accent setting can come in Phase 7.
- Listening questions in quizzes ("listen and choose") reuse the same hook.

## Learning model

| Level | Name | CEFR | Rough TOEIC |
|---|---|---|---|
| 1 | Basic | A1 | under 250 |
| 2 | Elementary | A2 | 250 to 400 |
| 3 | Intermediate | B1 | 400 to 600 |
| 4 | Upper-intermediate | B2 | 600 to 800 |
| 5 | Advanced | C1 | 800 and up |

- Each level has categories, each category has lessons, each lesson (one poster) has **12 to 20 words**. About 5,000 words is roughly 300 lessons, so plan content one level at a time.
- Category families: **Daily life** (shopping, travel, food, health, home) and **Workplace** (email, meetings, HR, finance, negotiation, logistics, office things).
- **Placement test** after sign-up: 5 questions per level starting at level 2. Move up while the score is at least 60%. Start at the highest level passed.
- **Lesson flow:** read the poster, read the sentences page, then take the lesson quiz.
- **Lesson quiz:** 10 questions (4 picture to word, 3 word to Thai meaning, 3 fill the blank; listening questions may replace some). Pass at **70%** to unlock the next lesson. Every attempt is stored.
- **Level exam:** opens when all lessons in the level are passed. Pass at **75%** to unlock the next level.
- All thresholds live in `src/lib/config.ts`. Never hard-code them elsewhere.

### Spaced repetition (`lib/srs.ts`)

Simplified SM-2 as a pure, tested function. Wrong answer: `nextReview = now`, interval reset. Right answer: interval grows by the ease factor. A word is **mastered** when interval is at least 21 days and it has 3 consecutive correct answers. Review cards also use tap to hear.

### Readiness score (`lib/readiness.ts`)

`readiness = 100 * (0.40 * masteredRatioLevels3to5 + 0.25 * accuracyLast10Quizzes + 0.35 * examScore)`

- `examScore` is the mean of best level-exam scores and mock Part 5 accuracy. If a factor has no data, drop it and renormalise the weights. Under 3 quizzes: show "not enough data yet".
- Map the score to a range via a table in `config.ts` (starting guess: 0 to 25 below 400, 25 to 50 for 400 to 600, 50 to 70 for 600 to 750, 70 to 85 for 750 to 850, above 85 for 850 and up).
- This measures vocabulary only. Always label it as an estimate, never as a TOEIC score, and never imply it predicts listening or reading results. The mapping is an unvalidated heuristic; say so in the UI.

## Data model (write `schema.prisma` in Phase 1)

| Model | Key fields |
|---|---|
| Auth.js models | User, Account, VerificationToken (per Prisma adapter docs) |
| Level | number, name, cefr |
| Category | levelId, family (DAILY or WORK), name, order |
| Lesson | categoryId, order, titleEn, titleTh, heroImageUrl?, heroAlt?, heroStatus |
| Word | lessonId, order, region (LEFT, RIGHT, BOTTOM), headword, pos, phonetic, readingTh, meaningTh, exampleEn, exampleTh, noteEn?, imageUrl?, imageAlt?, imageType, imageStatus, reviewed |
| UserLessonProgress | userId, lessonId, status, bestScore, lastPage, updatedAt |
| UserWordState | userId, wordId, ease, intervalDays, streak, nextReview, mastered |
| QuizAttempt | userId, kind (LESSON, LEVEL, PLACEMENT, MOCK), refId, score, answers Json, createdAt |
| UserStats | userId, currentLevel, readiness, streakDays, lastActiveDate |

Rules: **score on the server only**; the client sends answers, never a score. Unique constraints on `(userId, lessonId)` and `(userId, wordId)`. `readingTh` is an approximate Thai spelling of the sound and must be reviewed by a human before `reviewed = true`.

## Routes

`/login` · `/placement` · `/dashboard` (level, progress, readiness, streak, ribbon on the last lesson read) · `/learn/[level]` (lesson map) · `/lesson/[id]` (poster, sentences, closing pages) · `/quiz/[id]` · `/review` · `/progress` (score history chart) · `/mock-toeic` · `/admin/images`

## Phases and acceptance

Do one phase at a time. A phase is done only when `npm run build` and `npm run test` pass and the acceptance line is true.

1. **Setup.** App boots, fonts and design tokens in place, schema migrated, Google sign-in and sign-out work, `(app)` routes are protected.
2. **Content sample.** CSV schemas validated; one level-1 office lesson with about 16 words seeded; item images and a hero scene generated, cut out, reviewed and uploaded; image style decision written to `docs/decisions.md`.
3. **Poster reader.** One lesson readable on a real phone: poster page laid out around the scene, tap speaks, second tap speaks slowly, "ฟังเสียงทั้งหน้า" works, swipe or buttons move between pages, resumes at the last page. Reduced-motion users get a fade instead of the turn. Desktop shows the poster as one centered page.
4. **Quiz.** Lesson quiz scored on the server, attempts saved, next lesson unlocks at 70%.
5. **Progress.** Dashboard, level exam, readiness score with unit tests.
6. **Review and placement.** SRS queue at `/review`; placement test sets the starting level.
7. **Polish and scale.** Mock TOEIC Part 5, accent setting, accessibility pass, Vercel deploy, then add content one level at a time.

## Open decisions (ask the owner, then record in `docs/decisions.md`)

- **Image style.** The owner likes bright, friendly illustrated objects on a plain background. Candidates: soft gouache (matches the paper look) or a clean cartoon style. Item pictures must be **cutouts with transparent backgrounds** so they sit on the paper in light and dark mode. Test about 20 words per style, then lock one.
- **Word source.** Write the list yourself or generate with AI and review. Either way, Thai meanings, Thai readings and examples need human review.
- **Hide Thai meaning by default?** Currently visible by default.

## Do not

- Calculate scores, unlock lessons or readiness on the client.
- Call an image API at request time. Images are generated once, offline, then stored.
- Use paid or cloud TTS, or ship audio files. Pronunciation is `speechSynthesis` only.
- Copy artwork, text or word lists from the reference poster book or any textbook, or hot-link third-party images. If using an open frequency list, check its license first and record it.
- Store progress in `localStorage`. The database is the source of truth.
- Use `any`, skip Zod validation on server actions, or leave an item with a broken image: fall back to a text-only item.
