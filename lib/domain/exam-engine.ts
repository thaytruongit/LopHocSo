import { Exam, Question } from './types';

export interface GradedQuestionDetail {
  questionId: string;
  selectedIndex: number | undefined;
  correctIndex: number;
  isCorrect: boolean;
  level: string;
  pointsEarned: number;
  maxPoints: number;
}

export interface ExamGradingSummary {
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  xpEarned: number;
  details: GradedQuestionDetail[];
  byLevel: Record<string, { correct: number; total: number }>;
}

export function gradeExamSubmission(
  exam: Exam,
  answers: Record<string, number>
): ExamGradingSummary {
  let correctCount = 0;
  let rawPoints = 0;
  let totalWeight = 0;
  const details: GradedQuestionDetail[] = [];
  const byLevel: Record<string, { correct: number; total: number }> = {};

  for (const q of exam.questions) {
    const selectedIndex = answers[q.id];
    const correctIndex = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
    const isCorrect = selectedIndex === correctIndex;
    const weight = q.points || 1;
    const level = q.level || 'Nhận biết';

    if (!byLevel[level]) byLevel[level] = { correct: 0, total: 0 };
    byLevel[level].total += 1;

    totalWeight += weight;
    if (isCorrect) {
      correctCount += 1;
      rawPoints += weight;
      byLevel[level].correct += 1;
    }

    details.push({
      questionId: q.id,
      selectedIndex,
      correctIndex,
      isCorrect,
      level,
      pointsEarned: isCorrect ? weight : 0,
      maxPoints: weight,
    });
  }

  const normalizedScore =
    totalWeight > 0 ? Number(((rawPoints / totalWeight) * 10).toFixed(1)) : 0;

  const xpEarned = Math.round(normalizedScore * 12) + (correctCount === exam.questions.length ? 30 : 0);

  return {
    score: normalizedScore,
    maxScore: 10,
    correctCount,
    totalQuestions: exam.questions.length,
    xpEarned,
    details,
    byLevel,
  };
}

export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function sanitizeExamForStudent(exam: Exam): Omit<Exam, 'questions'> & {
  questions: Omit<Question, 'correctAnswer' | 'explanation'>[];
} {
  return {
    ...exam,
    questions: exam.questions.map(({ correctAnswer: _ca, explanation: _ex, ...rest }) => rest),
  };
}
