# Content brief for vocabulary batches

Project: `/Users/cotacticstaff/Documents/practice_eng` (Wordbook, an English vocabulary app for a Thai adult learner).
Words are for **daily life and the workplace** (TOEIC-style office, business and service English).

## What one batch produces

Two CSV files with the batch id (for example `L3-b`):

- `data/lessons/<id>.csv`: one row per lesson for the batch's categories.
- `data/words/<id>.csv`: 14 words per lesson.

Each category has **3 lessons**, each lesson **14 words** (order 1..14). Lesson titles are short, concrete and distinct
(English + natural Thai), each lesson a clear sub-topic of the category.

### Lessons CSV header (exact)

```
level,family,category,category_en,category_th,category_order,lesson,title_en,title_th
```

### Words CSV header (exact)

```
level,category,lesson,order,headword,pos,phonetic,reading_th,meaning_th,example_en,example_th,note_en,emoji,reviewed
```

Look at `data/lessons/L1.csv` and `data/words/L1-c.csv` for the style already used.

## Rules per column

- `headword`: base form, lowercase unless a proper noun. Phrases allowed (`take notes`, `follow up`). Idioms allowed at C1.
- `pos`: one of noun, verb, adjective, adverb, phrase, phrasal verb, idiom, preposition, conjunction, pronoun, determiner, interjection, number.
- `phonetic`: US IPA in slashes, e.g. `/ɪnˈvɔɪs/`.
- `reading_th`: approximate Thai spelling of the US pronunciation, same style as L1 (e.g. `อินวอยซ์`). Spaces between words of a phrase.
- `meaning_th`: short, natural Thai meaning for the sense used in the example. No English in it.
- `example_en`: **6 to 18 words**, natural, about daily life or work, and it **must contain the headword** in base
  form or a regular inflection (-s, -es, -ed, -d, -ing, -er, consonant doubling, e-drop + ing, y→ies/ied, f→ves).
  Irregular forms (went, bought, children) do not count, so pick a sentence using the base or regular form.
  For a phrase, all words must appear in order (only the last word may be inflected).
- `example_th`: natural Thai translation of the example.
- `note_en`: optional, short usage note or common collocation (use for about a quarter of words at B1 and above). Leave empty otherwise.
- `emoji`: one emoji only when it clearly shows the word (concrete things, some actions). Empty for abstract words. Never guess.
- `reviewed`: always `false`.

## Level guide (CEFR)

| Level | CEFR | Pick words that are |
|---|---|---|
| 1 | A1 | very common, concrete, first 1000 words |
| 2 | A2 | common everyday and simple work words, first ~2000 |
| 3 | B1 | everyday abstract words, standard office/business vocabulary |
| 4 | B2 | precise, professional vocabulary, common collocations, TOEIC 600–800 |
| 5 | C1 | advanced, formal and nuanced vocabulary, idioms used by professionals; not obscure or archaic |

## Variety and duplicates

- No duplicate `headword`+`pos` inside your files.
- Do **not** reuse words that already exist in lower levels. Check with:
  `cut -d, -f5 data/words/L1*.csv data/words/L2*.csv | sort -u` (adjust to the levels below yours; files of your own
  level written by other batches may appear while you work, avoid those words too).
- Other batches are writing other categories of the same level at the same time. Prefer words specific to your
  categories over general words that another category might also pick.
- Mix parts of speech (nouns, verbs, adjectives, phrases), not only nouns.
- Write your own word lists and sentences. Do not copy from textbooks or published word lists.

## How to write the files

Generate the CSV with a Python script using the `csv` module (so commas and quotes are escaped correctly). Keep the
script in your own scratch folder, not in the project. Write only your two CSV files in the project.

## Validate

```
npm run words:check -- <id>
```

must end with `ok` and **no warnings** (a warning about the example not containing the word means fill-in-the-blank
will not work; fix the sentence). Then run the full `npm run words:check` and fix any cross-level warnings or duplicate
errors that involve **your** words (replace your word with a different one). Ignore problems in other batches' files.

## Report back (max 8 lines)

Files written, lesson count, word count, final check result, and any words you are unsure about.
