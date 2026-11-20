import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import type { z } from "zod";
import { checkLessons, LessonRowSchema, WordRowSchema, type LessonRow, type WordRow } from "./schema";

/** Reads and validates every CSV under data/. Used by the seed and `words:check`, never at request time. */

function readCsv(file: string): Record<string, string>[] {
  const text = readFileSync(file, "utf8");
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    throw new Error(`${file}: ${parsed.errors.map((e) => `row ${e.row}: ${e.message}`).join("; ")}`);
  }
  return parsed.data;
}

function readDir<T>(
  dataDir: string,
  sub: string,
  schema: z.ZodType<T, unknown>,
  errors: string[],
  only?: string[],
): T[] {
  const dir = path.join(dataDir, sub);
  const out: T[] = [];
  const files = readdirSync(dir)
    .filter((x) => x.endsWith(".csv"))
    .filter((x) => !only || only.some((o) => x.startsWith(o)))
    .sort();
  for (const f of files) {
    readCsv(path.join(dir, f)).forEach((row, i) => {
      const r = schema.safeParse(row);
      if (r.success) out.push(r.data);
      else errors.push(`${sub}/${f} row ${i + 2}: ${r.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`);
    });
  }
  return out;
}

export type Content = { lessons: LessonRow[]; words: WordRow[]; errors: string[]; warnings: string[] };

/** `only` limits loading to CSV files whose name starts with one of the given prefixes (e.g. "L2-a"). */
export function loadContent(dataDir = path.join(process.cwd(), "data"), only?: string[]): Content {
  const errors: string[] = [];
  const lessons = readDir(dataDir, "lessons", LessonRowSchema, errors, only);
  const words = readDir(dataDir, "words", WordRowSchema, errors, only);
  const checked = checkLessons(lessons, words);
  return { lessons, words, errors: [...errors, ...checked.errors], warnings: checked.warnings };
}
