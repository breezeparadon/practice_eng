/** All learning thresholds live here. Never hard-code them elsewhere. */
export const LESSON_PASS_PERCENT = 70;
export const LEVEL_PASS_PERCENT = 75;
export const QUIZ_QUESTIONS = 10;
export const QUIZ_CHOICES = 4;

export const LEVELS = [
  { id: 1, name: "Basic", nameTh: "พื้นฐาน", cefr: "A1" },
  { id: 2, name: "Elementary", nameTh: "เบื้องต้น", cefr: "A2" },
  { id: 3, name: "Intermediate", nameTh: "กลาง", cefr: "B1" },
  { id: 4, name: "Upper-intermediate", nameTh: "กลางค่อนสูง", cefr: "B2" },
  { id: 5, name: "Advanced", nameTh: "สูง", cefr: "C1" },
] as const;

/** SRS (simplified SM-2) */
export const SRS_MIN_EASE = 1.3;
export const SRS_MASTERED_INTERVAL_DAYS = 21;
export const SRS_MASTERED_STREAK = 3;
