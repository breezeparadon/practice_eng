import { loadContent } from "../src/lib/content";

// Usage: npm run words:check [-- L2-a L2-b]  (optional file-name prefixes)
const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const { lessons, words, errors, warnings } = loadContent(undefined, only.length > 0 ? only : undefined);
const byLevel = new Map<number, number>();
for (const w of words) byLevel.set(w.level, (byLevel.get(w.level) ?? 0) + 1);

console.log(`lessons: ${lessons.length}, words: ${words.length}, unreviewed: ${words.filter((w) => !w.reviewed).length}`);
for (const [level, n] of [...byLevel].sort((a, b) => a[0] - b[0])) console.log(`  level ${level}: ${n} words`);
for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`error ${e}`);
if (errors.length > 0) process.exit(1);
console.log("ok");
