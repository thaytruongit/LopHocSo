'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Lock,
  ShieldAlert,
  Maximize2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getCurrentUser, UserSession } from '@/lib/auth';
import {
  getTenantExams,
  saveExamResult,
  updateStudentStats,
} from '@/lib/domain/data-repository';
import {
  ExamGradingSummary,
  formatCountdown,
  gradeExamSubmission,
} from '@/lib/domain/exam-engine';
import { Exam } from '@/lib/domain/types';

export default function ExamClient() {
  const params = useParams();
  const examId = String(params?.id || '');

  const [user, setUser] = useState<UserSession | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [started, setStarted] = useState<boolean>(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeftSec, setTimeLeftSec] = useState<number>(2700);
  const [tabSwitches, setTabSwitches] = useState<number>(0);
  const [tabWarning, setTabWarning] = useState<boolean>(false);
  const [grading, setGrading] = useState<ExamGradingSummary | null>(null);

  useEffect(() => {
    const current = getCurrentUser();
    setUser(current);
    getTenantExams(current.tenantId)
      .then((all) => {
        const found = all.find((e) => e.id === examId) || null;
        setExam(found);
        if (found) setTimeLeftSec(found.durationMin * 60);
      })
      .finally(() => setLoading(false));
  }, [examId]);

  const handleSubmitExam = useCallback(async () => {
    if (!exam || grading) return;
    const summary = gradeExamSubmission(exam, answers);
    setGrading(summary);

    const activeUser = user || getCurrentUser();
    await saveExamResult({
      id: `res-${Date.now()}`,
      tenantId: activeUser.tenantId,
      examId: exam.id,
      examTitle: exam.title,
      studentCode: activeUser.studentCode || 'GUEST',
      studentName: activeUser.pairNames || activeUser.studentName || 'Học sinh',
      className: activeUser.studentClass || `Khối ${exam.grade}`,
      grade: exam.grade,
      score: summary.score,
      maxScore: summary.maxScore,
      correctCount: summary.correctCount,
      totalQuestions: summary.totalQuestions,
      durationSec: exam.durationMin * 60 - timeLeftSec,
      tabSwitches,
      answers,
      submittedAt: new Date().toISOString(),
    });

    if (activeUser.studentCode) {
      await updateStudentStats(activeUser.tenantId, activeUser.studentCode, summary.xpEarned);
    }

    if (summary.score >= 8) {
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.65 } });
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [exam, grading, answers, user, timeLeftSec, tabSwitches]);

  // Countdown timer
  useEffect(() => {
    if (!started || grading) return;
    if (timeLeftSec <= 0) {
      handleSubmitExam();
      return;
    }
    const id = setInterval(() => setTimeLeftSec((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(id);
  }, [started, grading, timeLeftSec, handleSubmitExam]);

  // Anti-cheat tab switch detector
  useEffect(() => {
    if (!started || grading) return;
    const onVisibility = () => {
      if (document.hidden) {
        setTabSwitches((c) => c + 1);
        setTabWarning(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [started, grading]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-xs text-slate-500">
        Đang tải đề kiểm tra...
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-extrabold text-slate-900">Không tìm thấy đề kiểm tra</h1>
        <Link
          href="/exams"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách đề</span>
        </Link>
      </div>
    );
  }

  if (exam.isLocked) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Đề kiểm tra đang khóa</h1>
        <p className="text-xs text-slate-600">
          Vui lòng chờ giáo viên mở khóa đề &ldquo;{exam.title}&rdquo;.
        </p>
        <Link
          href="/exams"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </Link>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-5">
          <div className="text-xs font-bold text-purple-700 uppercase">
            Khối {exam.grade} · {exam.examType} · {user?.tenantName}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{exam.title}</h1>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 font-semibold">Thời gian</div>
              <div className="font-mono font-extrabold text-slate-900 text-base">
                {exam.durationMin} phút
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 font-semibold">Số câu hỏi</div>
              <div className="font-mono font-extrabold text-slate-900 text-base">
                {exam.questions.length}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-slate-500 font-semibold">Giám sát</div>
              <div className="font-bold text-emerald-700 text-sm">Chống rời tab</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              Trong thời gian làm bài, không chuyển sang tab/cửa sổ khác. Hệ thống tự động ghi nhận số lần rời màn hình thi vào kết quả nộp.
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              href="/exams"
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setStarted(true);
                document.documentElement.requestFullscreen?.().catch(() => {});
              }}
              className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Bắt đầu làm bài ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="sticky top-20 z-30 bg-slate-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div>
          <div className="text-[11px] font-bold text-purple-300 uppercase">
            {user?.studentName || 'Thí sinh'} · {user?.studentClass || `Khối ${exam.grade}`}
          </div>
          <div className="text-sm font-extrabold">{exam.title}</div>
        </div>
        <div className="flex items-center gap-3">
          {tabSwitches > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-mono text-xs font-bold tabular-nums">
              Rời tab: {tabSwitches}
            </span>
          )}
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-2 font-mono font-extrabold text-sm tabular-nums">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{formatCountdown(timeLeftSec)}</span>
          </div>
        </div>
      </div>

      {tabWarning && !grading && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Cảnh báo: Em vừa rời màn hình làm bài (tổng {tabSwitches} lần).</span>
          </div>
          <button
            type="button"
            onClick={() => setTabWarning(false)}
            className="text-rose-700 underline"
          >
            Đã hiểu
          </button>
        </div>
      )}

      {grading && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-lg">
              <CheckCircle2 className="w-6 h-6" />
              <span>Đã Nộp Bài Thành Công: {grading.score} / 10 điểm</span>
            </div>
            <p className="text-xs text-emerald-900">
              Đúng {grading.correctCount}/{grading.totalQuestions} câu · Thưởng +{grading.xpEarned} XP · Số lần rời tab: {tabSwitches}
            </p>
          </div>
          <Link
            href="/exams"
            className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold self-start sm:self-auto"
          >
            Quay về danh sách đề
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {exam.questions.map((q, idx) => {
          const selected = answers[q.id];
          const detail = grading?.details.find((d) => d.questionId === q.id);

          return (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-bold text-slate-900">
                  Câu {idx + 1}: {q.content}
                </div>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                  {q.level || 'Nhận biết'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(q.options || []).map((opt, oIdx) => {
                  const chosen = selected === oIdx;
                  const isCorrect = detail?.correctIndex === oIdx;

                  let cls = 'bg-slate-50 border-slate-200 text-slate-700 hover:border-purple-400';
                  if (grading) {
                    if (isCorrect)
                      cls = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                    else if (chosen)
                      cls = 'bg-rose-50 border-rose-400 text-rose-800';
                  } else if (chosen) {
                    cls = 'bg-purple-700 border-purple-700 text-white font-bold';
                  }

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      disabled={Boolean(grading)}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oIdx }))}
                      className={`p-3 rounded-xl border text-left text-xs transition-colors ${cls}`}
                    >
                      <span className="font-mono font-bold mr-2">
                        {String.fromCharCode(65 + oIdx)}.
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!grading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-semibold">
            Đã trả lời: {Object.keys(answers).length} / {exam.questions.length} câu
          </span>
          <button
            type="button"
            onClick={handleSubmitExam}
            className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold"
          >
            Nộp Bài &amp; Chấm Điểm Ngay
          </button>
        </div>
      )}
    </div>
  );
}
