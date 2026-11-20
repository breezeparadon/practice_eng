-- CreateEnum
CREATE TYPE "Family" AS ENUM ('DAILY', 'WORK');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('STARTED', 'PASSED');

-- CreateEnum
CREATE TYPE "QuizKind" AS ENUM ('LESSON', 'LEVEL', 'PLACEMENT', 'MOCK');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "cefr" TEXT NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "levelId" INTEGER NOT NULL,
    "family" "Family" NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleTh" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "headword" TEXT NOT NULL,
    "pos" TEXT NOT NULL,
    "phonetic" TEXT NOT NULL,
    "readingTh" TEXT NOT NULL,
    "meaningTh" TEXT NOT NULL,
    "exampleEn" TEXT NOT NULL,
    "exampleTh" TEXT NOT NULL,
    "noteEn" TEXT,
    "emoji" TEXT,
    "imageUrl" TEXT,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'STARTED',
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWordState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "nextReview" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mastered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserWordState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "QuizKind" NOT NULL,
    "refId" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "answers" JSONB,
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_levelId_slug_key" ON "Category"("levelId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_categoryId_order_key" ON "Lesson"("categoryId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Word_lessonId_headword_pos_key" ON "Word"("lessonId", "headword", "pos");

-- CreateIndex
CREATE UNIQUE INDEX "UserLessonProgress_userId_lessonId_key" ON "UserLessonProgress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "UserWordState_userId_nextReview_idx" ON "UserWordState"("userId", "nextReview");

-- CreateIndex
CREATE UNIQUE INDEX "UserWordState_userId_wordId_key" ON "UserWordState"("userId", "wordId");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_kind_refId_idx" ON "QuizAttempt"("userId", "kind", "refId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWordState" ADD CONSTRAINT "UserWordState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWordState" ADD CONSTRAINT "UserWordState_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
