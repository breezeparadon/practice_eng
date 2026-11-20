---
name: vocab-content-pipeline
description: Create, validate, seed and illustrate the Wordbook vocabulary content. Use this skill whenever the task involves word lists, lesson CSVs in data/lessons or data/words, poster regions, Thai meanings or Thai readings, example sentences, image prompts, generating or fetching word pictures or lesson hero scenes, background removal, the image approval page, resizing and uploading images, or seeding the database, even if the request only says "add more words" or "make pictures for level 2".
---

# Vocabulary content pipeline

Content is the biggest job in this project (about 5,000 words, roughly 300 poster lessons, each with a hero scene and item pictures) and the whole thing must cost nothing. Everything is generated **once, offline, in small resumable batches**, reviewed, then stored. The app never calls an image API while a user is browsing.

The lesson page is a poster: a title and a hero scene in the middle, 12 to 20 picture-and-word items around it, tap an item to hear it (see the `book-reader-ui` skill). That shapes the content below.

## Source of truth: two CSV kinds

Git tracks the CSVs; images are not in git.

### Lessons: `data/lessons/L1-daily.csv`

| Column | Meaning |
|---|---|
| `level` | 1 to 5 |
| `family` | `DAILY` or `WORK` |
| `category` | e.g. `shopping`, `office` |
| `lesson` | lesson order within the category |
| `title_en` | poster title, sentence case, e.g. `Things in the office` |
| `title_th` | Thai title |
| `hero_prompt` | the big scene for the middle of the poster |
| `hero_alt` | what the scene shows, for a screen reader |

### Words: `data/words/L1-daily.csv`

| Column | Meaning |
|---|---|
| `level`, `family`, `category`, `lesson` | which lesson the word belongs to (must match a lessons row) |
| `order` | order within the lesson |
| `region` | `LEFT`, `RIGHT` or `BOTTOM`: where the item sits around the scene |
| `headword` | the English word or short phrase, lowercase unless a proper noun; this is what gets spoken |
| `pos` | `noun`, `verb`, `adj`, `adv`, `phrase`... |
| `phonetic` | IPA, e.g. `/ˈsteɪplər/` |
| `reading_th` | approximate Thai spelling of the sound, e.g. `สเตเพลอร์` (the page adds the brackets) |
| `meaning_th` | natural Thai meaning, not a literal gloss |
| `example_en` | one sentence, 8 to 14 words (shown on the sentences page) |
| `example_th` | Thai translation of the sentence |
| `note_en` | optional: easily confused word or usage tip |
| `image_mode` | `ai`, `stock`, or `none` (text-only item) |
| `image_prompt` | subject description for `ai`, search query for `stock` |
| `image_alt` | what the picture shows (used for the quiz and admin page; the poster item itself is labelled by its word) |
| `reviewed` | `true` only after a human checked the Thai meaning, Thai reading and example |

Validate with Zod in `scripts/import-words.ts`. `npm run words:check` fails on: missing fields, duplicate `(level, headword, pos)`, a lesson with fewer than 12 or more than 20 words, a word whose lesson is missing from the lessons CSV, a region other than the three allowed, more than 8 words in one column region, example sentences outside 6 to 18 words, or an `ai` row with an empty prompt.

Region guide for 16 words: about 4 in `LEFT`, 4 in `RIGHT`, 8 in `BOTTOM` (mobile shows the bottom band in 3 columns, so 6 or 9 fit best). Put the words with the most recognisable pictures in the columns beside the scene.

## Writing entries

- **Level fit.** The example sentence must use easier vocabulary than the target word, so the learner only has to decode one new thing.
- **Daily versus workplace.** Daily examples are about real situations (ordering, commuting, a pharmacy). Workplace examples are about real tasks (rescheduling a meeting, approving an invoice). Prefer TOEIC-style business contexts at levels 3 to 5.
- **Thai meaning.** Give the most common sense first. If a word has several unrelated senses, make separate rows instead of cramming them into one.
- **Thai reading.** It is only a rough guide to the sound; there is no single standard. Keep it short, consistent across the project, and mark it for human review.
- **Groups that look good on a poster.** One lesson is one scene or one situation (an office, a kitchen, a pharmacy counter, a meeting room). Words that are easy to picture go beside the scene; abstract words need a metaphor picture (see below).
- **No brand names, real people or politically loaded examples** in sentences or prompts.
- **AI-drafted content is a draft.** Anything the model wrote starts as `reviewed = false`. The reader may show unreviewed words during development, but do not call a level "done" while it has unreviewed rows; report the count.
- **Word sources.** Write your own list. If using an open frequency list as a seed, confirm its license first and record it in `docs/decisions.md`. Do not import official TOEIC lists, textbook vocabulary, or the word choices of any commercial vocabulary poster book.

## Choosing how to illustrate a word

| Word type | Mode | Why |
|---|---|---|
| Concrete noun (stapler, luggage, receipt) | `stock` first, `ai` if no good match | Real photos are accurate and free, but need a cutout step |
| Verb, adjective, abstract or workplace term (negotiate, deadline, reimburse) | `ai`, as a **metaphor or small scene** | Two people at a table with papers for *negotiate*; a calendar with a red circle for *deadline* |
| Function words, words with no honest picture | `none` | A forced picture teaches the wrong thing; the item is text only |

Every item picture must read clearly at **about 56px**, so ask for one bold subject with simple shapes, not a busy scene. The hero scene is the only detailed picture.

### Style lock (decide once, in Phase 2)

Test about 20 words in each candidate style (soft gouache, clean friendly cartoon), look at them at 56px on the paper color and on the dark theme, pick one, and write it to `docs/decisions.md`. Do not mix styles afterwards. Keep the templates in `scripts/image-style.ts` so every prompt uses the same one.

Item template (the picture becomes a cutout, so the background must be plain):

```
{subject}. {STYLE}. One single subject, centered, simple bold shapes, fully inside the frame.
Plain solid white background, no floor, no shadow on the background.
No text, no letters, no numbers, no logos, no watermark, no brand names.
```

Hero template:

```
{scene}. {STYLE}. Wide composition with the main building or scene in the middle, fully inside
the frame, generous empty margin around it. Plain solid white background.
No text, no letters, no numbers, no logos, no watermark.
```

The last line of each is the guard rail against garbled lettering, which image models often produce.

## Image generation script (`scripts/generate-images.ts`)

Free image quotas are small and change, so the script must be conservative and resumable.

1. **Check current limits first.** Read the provider's docs (Google AI Studio's Gemini API is the planned free option) for the free model name, requests per minute and requests per day. Write them with the date in `docs/limits.md`. Model names and quotas change; do not trust numbers copied from an old blog post.
2. Select rows where `image_mode = ai` and the image is not yet generated, plus lessons whose hero is missing. Use `data/image-state.json` (gitignored) as the record of what exists, keyed by `(level, headword, pos)` for words and `(level, category, lesson)` for heroes.
3. Respect the rate limit with a fixed delay between calls, and stop at a **daily cap set below the real quota**. Print how many remain. When the cap is hit, exit cleanly so the owner can run it again tomorrow.
4. Retry only on transient errors, with backoff; stop on quota or auth errors instead of looping.
5. Save raw output to `generated/{level}/{slug}.png` (gitignored) and set `imageStatus = GENERATED`.
6. Never log API keys. The key comes from `.env.local`.

With a free quota in the hundreds per day, roughly 5,300 images (words plus heroes) take weeks of daily runs. Work one level at a time so the app is usable early. Optional saving, to try only after the style is locked: ask for a small sheet of 6 to 9 items in one image, then crop them apart; this cuts the number of calls a lot but can drift in style and needs a careful review. Free-tier terms may allow the provider to use submitted prompts and outputs; never include personal data in prompts.

For `stock` rows, `scripts/fetch-pexels.ts` uses the Pexels API (free key). Save the photographer name and source URL in a `credit` field, take the first result only as a candidate, and send it through the same cutout and approval steps.

## Review and approval (`/admin/images`)

Owner-only page (check `session.user.email === process.env.ADMIN_EMAIL`). Show each picture **after cutout**, twice: on the paper color and on the dark theme color, at 56px and at full size, next to headword, meaning and prompt. Actions: **approve**, **reject and regenerate** (optionally with an edited prompt), **switch to text only**.

Reject when: the picture does not show the meaning; it is unclear at 56px; any letters or numbers appear; hands or faces look wrong; it shows a brand or real person; the style drifts from the locked one; the cutout leaves a pale halo or chops off part of the subject; the scene is culturally awkward for a Thai learner. Set `imageStatus` to `APPROVED` or `REJECTED`.

## Processing and upload (`scripts/process-images.ts`)

Only `APPROVED` images are processed.

1. **Cut out the subject.** Remove the plain background locally and for free (an open-source tool such as `rembg`; check its license and model terms before relying on it, and record the choice in `docs/decisions.md`). The result must have a real alpha channel. Trim transparent margins, then pad evenly.
2. **Resize and convert** with `sharp` to transparent **WebP**, quality about 80: items about **256px** on the long side (they are shown at 56 to 72px, so this stays sharp on phones), hero scenes about **768px**. Expect item files in the tens of KB and heroes under about 100KB; measure on the Phase 2 sample and report the real sizes.
3. Upload to the configured object storage (Cloudflare R2 or Supabase Storage) at `words/{level}/{slug}.webp` and `heroes/{level}/{category}-{lesson}.webp`. Check the free storage quota in `docs/limits.md` before the first upload; do not put images in the Git repo or in `public/` beyond the small Phase 2 sample.
4. Write `imageUrl`, `imageAlt`, `imageType` and `imageStatus = APPROVED` to the Word row (and `heroImageUrl`, `heroAlt` to the Lesson row). Uploads must be idempotent: running twice changes nothing.

## Seeding (`prisma/seed.ts`)

Upsert lessons by `(categoryId, order)` and words by `(lessonId, headword, pos)` so re-running the seed after editing a CSV updates rows instead of duplicating them. Create Level, Category and Lesson rows from the CSV columns. Never delete user progress during a seed; if a word is removed from a CSV, mark it inactive instead of deleting.

## Quality checklist per batch

1. `npm run words:check` passes.
2. Report: lessons and words added, rows with `reviewed = false`, images generated, approved, rejected, remaining, and the quota left today.
3. Open two random posters in the reader at phone width: pictures readable at 56px, no pale edges in dark mode, tapping a word speaks it, a text-only item looks intentional.
4. If a quota or license assumption turned out different from `docs/limits.md`, update that file before continuing.
