'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Clock,
  Lock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { getCurrentUser, UserSession } from '@/lib/auth';
import { getExamResults, getTenantExams } from '@/lib/domain/data-repository';
import { canAccessGrade, isTeacherUser } from '@/lib/domain/access-control';
import { Exam, ExamResult, GradeLevel } from '@/lib/domain/types';
import StudentAuthGate from '@/components/StudentAuthGate';

export default function ExamsListPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [gradeFilter, setGradeFilter] = useState<'all' | GradeLevel>('all');

  useEffect(() => {
    setMounted(true);
    const loadForSession = () => {
      const current = getCurrentUser();
      setUser(current);
      if (!current.isLoggedIn) {
        setExams([]);
        setResults([]);
        return;
      }
      if (current.role === 'student' && current.studentGrade) {
        setGradeFilter(current.studentGrade);
      }

      Promise.all([
        getTenantExams(current.tenantId),
        getExamResults(current.tenantId),
      ]).then(([ex, res]) => {
        setExams(ex);
        setResults(res);
      });
    };

    loadForSession();
    window.addEventListener('thso_session_change', loadForSession);
    return () => window.removeEventListener('thso_session_change', loadForSession);
  }, []);

  const isTeacher = isTeacherUser(user);

  const filteredExams = useMemo(() => {
    if (!user?.isLoggedIn) return [];
    if (!isTeacher) {
      return exams.filter((e) => canAccessGrade(user, e.grade));
    }
    if (gradeFilter === 'all') return exams;
    return exams.filter((e) => e.grade === gradeFilter);
  }, [exams, gradeFilter, user, isTeacher]);

  if (!mounted || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-slate-500 font-semibold">
        Đang tải danh sách kiểm tra...
      </div>
    );
  }

  if (!user.isLoggedIn) {
    return (
      <StudentAuthGate
        title="Hệ Thống Kiểm Tra Trực Tuyến"
        description="Vui lòng đăng nhập tài khoản học sinh hoặc giáo viên để làm bài kiểm tra định kỳ theo đúng khối lớp của em."
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold text-purple-700 uppercase tracking-wider">
            {user?.tenantName} · Đánh Giá Định Kỳ Chuẩn Thông Tư 22
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            HỆ THỐNG KIỂM TRA TRỰC TUYẾN
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Ma trận 4-3-2-1 (Biết · Hiểu · Vận dụng · Vận dụng cao), chấm điểm tự động và giám sát chuyển tab thi.
          </p>
        </div>

        {isTeacher ? (
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold self-start">
            {(['all', 6, 7, 8, 9] as const).map((g) => (
              <button
                key={String(g)}
                type="button"
                onClick={() => setGradeFilter(g)}
                className={`px-3.5 py-2 rounded-xl transition-colors ${
                  gradeFilter === g ? 'bg-purple-700 text-white' : 'text-slate-600'
                }`}
              >
                {g === 'all' ? 'Tất cả khối' : `Khối ${g}`}
              </button>
            ))}
          </div>
        ) : (
          <div className="px-4 py-2 rounded-2xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold flex items-center gap-2 self-start">
            <Lock className="w-3.5 h-3.5" />
            <span>Khóa theo {user.studentClass || `Khối ${user.studentGrade}`}</span>
          </div>
        )}
      </div>

      {exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500 font-semibold">
          Đang tải danh sách 8 đề kiểm tra định kỳ...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExams.map((exam) => {
          const myAttempt = results.find(
            (r) =>
              r.examId === exam.id &&
              (!user?.studentCode || r.studentCode === user.studentCode)
          );

          return (
            <div
              key={exam.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-purple-700 uppercase">
                    Khối {exam.grade} · {exam.examType}
                  </span>
                  <span className="font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{exam.durationMin} phút</span>
                  </span>
                </div>
                <h2 className="text-base font-extrabold text-slate-900">{exam.title}</h2>
                <div className="text-xs text-slate-500">
                  Số lượng: <strong className="text-slate-800">{exam.questionsCount} câu hỏi</strong>
                </div>
              </div>

              {myAttempt && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Điểm gần nhất</span>
                  </span>
                  <span className="font-mono font-extrabold tabular-nums">
                    {myAttempt.score} / 10
                  </span>
                </div>
              )}

              {exam.isLocked ? (
                <div className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Đang khóa bởi giáo viên</span>
                </div>
              ) : (
                <Link
                  href={`/exams/${exam.id}`}
                  className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Bắt đầu làm bài</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
