'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Monitor,
  Clock,
  Lock,
  CheckCircle2,
  Sparkles,
  UploadCloud,
  Download,
  BookOpen,
  PlayCircle,
  FileCheck2,
  ArrowRight,
  Laptop,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getCurrentUser, UserSession } from '@/lib/auth';
import {
  ClassroomControlState,
  CurriculumPeriod,
  GradeLevel,
  PracticeFile,
} from '@/lib/domain/types';
import {
  getClassroomState,
  subscribeToClassroomState,
  updateMachineScore,
} from '@/lib/classroom-control';
import { gradePracticeQuiz } from '@/lib/domain/classroom-engine';
import { formatCountdown } from '@/lib/domain/exam-engine';
import {
  getCurriculumByGrade,
  getResources,
  savePracticalSubmission,
  updateStudentStats,
} from '@/lib/domain/data-repository';
import { uploadPracticalToDriveOnline } from '@/lib/google-drive-service';
import { getAssetUrl } from '@/lib/asset-path';
import InteractiveDiscoveryPair from '@/components/InteractiveDiscoveryPair';
import StudentAuthGate from '@/components/StudentAuthGate';

function InClassContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserSession | null>(null);
  const [roomState, setRoomState] = useState<ClassroomControlState | null>(null);
  const [periodData, setPeriodData] = useState<CurriculumPeriod | null>(null);
  const [practiceFiles, setPracticeFiles] = useState<PracticeFile[]>([]);
  const [activeTab, setActiveTab] = useState<'discovery' | 'practice' | 'lab'>('discovery');
  const [timerSec, setTimerSec] = useState<number>(0);

  // Activity 2: 7-question quiz
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<{
    score: number;
    correctCount: number;
    totalQuestions: number;
  } | null>(null);

  // Activity 3: practical file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadNotice, setUploadNotice] = useState<string>('');

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let unsubRoom = () => {};

    const syncSession = () => {
      unsubRoom();
      const current = getCurrentUser();
      setUser(current);
      const initial = getClassroomState(current.tenantId, current.roomId);
      setRoomState(initial);
      unsubRoom = subscribeToClassroomState(
        (st) => setRoomState(st),
        current.tenantId,
        current.roomId
      );
    };

    syncSession();
    getResources()
      .then((res) => setPracticeFiles(res.practiceFiles || []))
      .catch(() => {});

    window.addEventListener('thso_session_change', syncSession);
    return () => {
      unsubRoom();
      window.removeEventListener('thso_session_change', syncSession);
    };
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'reinforcement' || tabParam === 'practice') {
      setActiveTab('practice');
    } else if (tabParam === 'lab') {
      setActiveTab('lab');
    } else if (tabParam === 'worksheet') {
      setActiveTab('discovery');
    }
  }, [searchParams]);

  const hasRoomState = Boolean(roomState);
  const activeGrade = roomState?.activeGrade;
  const activePeriod = roomState?.activePeriod;
  const studentGrade = user?.studentGrade;
  const isTimerRunning = roomState?.isTimerRunning;
  const timerEndTimestamp = roomState?.timerEndTimestamp;
  const timerRemainingSeconds = roomState?.timerRemainingSeconds;

  useEffect(() => {
    if (!hasRoomState) return;
    const targetGrade = (activeGrade || studentGrade || 7) as GradeLevel;
    const targetPeriodNum = activePeriod && activePeriod > 0 ? activePeriod : 1;

    getCurriculumByGrade(targetGrade)
      .then((periods) => {
        const match = periods.find((p) => p.period === targetPeriodNum) || periods[0] || null;
        setPeriodData(match);
        setQuizAnswers({});
        setQuizResult(null);
      })
      .catch(() => {});
  }, [hasRoomState, activeGrade, activePeriod, studentGrade]);

  useEffect(() => {
    if (!hasRoomState) return;
    const tick = () => {
      if (isTimerRunning && timerEndTimestamp && timerEndTimestamp > 0) {
        setTimerSec(Math.max(0, Math.floor((timerEndTimestamp - Date.now()) / 1000)));
      } else {
        setTimerSec(timerRemainingSeconds || 0);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hasRoomState, isTimerRunning, timerEndTimestamp, timerRemainingSeconds]);

  if (!mounted || !user || !roomState) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-xs text-slate-500 font-semibold">
        Đang kết nối tín hiệu phòng máy...
      </div>
    );
  }

  if (!user.isLoggedIn) {
    return (
      <StudentAuthGate
        title="Lớp Học Số Trực Tiếp"
        description="Vui lòng đăng nhập tài khoản học sinh hoặc giáo viên để kết nối phòng máy thực hành."
      />
    );
  }

  const machineId = user.machineId || 1;
  const studentDisplay = user.pairNames || user.studentName || 'Học sinh phòng máy';

  // WAITING WHITEBOARD WHEN TEACHER HAS NOT GONE LIVE OR WRONG GRADE FOR THIS STUDENT
  const isWrongLiveGrade =
    roomState.isLive &&
    user.role === 'student' &&
    Boolean(user.studentGrade) &&
    roomState.activeGrade !== user.studentGrade;

  if (!roomState.isLive || isWrongLiveGrade) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mx-auto">
            {isWrongLiveGrade ? <Lock className="w-8 h-8" /> : <Monitor className="w-8 h-8" />}
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              {user.tenantName} · {user.roomName} · Máy {String(machineId).padStart(2, '0')}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {isWrongLiveGrade
                ? 'Phòng Máy Đang Dạy Khối Lớp Khác'
                : 'Bảng Chờ Tín Hiệu Tiết Học Trực Tiếp'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              {isWrongLiveGrade ? (
                <>
                  Xin chào <strong>{studentDisplay}</strong> ({user.studentClass} · Khối{' '}
                  {user.studentGrade}). Hiện tại phòng máy đang phát tiết học của{' '}
                  <strong>
                    {roomState.activeClassName} (Khối {roomState.activeGrade})
                  </strong>
                  , không thuộc khối lớp của em. Em có thể học đúng tài liệu khối của mình bên
                  dưới.
                </>
              ) : (
                <>
                  Xin chào <strong>{studentDisplay}</strong> (
                  {user.studentClass || roomState.activeClassName}). Hiện tại giáo viên{' '}
                  <strong>{user.teacherName}</strong> chưa bật phát trực tiếp bài dạy mới. Trong
                  lúc chờ, em có thể ôn tập hoặc hoàn thành Bài tập về nhà.
                </>
              )}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-lg mx-auto text-xs text-slate-600">
            <strong>Thông báo phòng máy:</strong> {roomState.broadcastMessage}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 max-w-2xl mx-auto text-left">
            <Link
              href="/homework"
              className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 transition-colors space-y-1"
            >
              <BookOpen className="w-5 h-5 text-blue-700" />
              <div className="font-bold text-xs text-slate-900">Nộp Bài Tập Về Nhà</div>
              <div className="text-[11px] text-slate-500">Chụp ảnh vở hoặc gửi file</div>
            </Link>
            <Link
              href="/self-study"
              className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 transition-colors space-y-1"
            >
              <PlayCircle className="w-5 h-5 text-emerald-700" />
              <div className="font-bold text-xs text-slate-900">Kho Tự Học Theo Khối</div>
              <div className="text-[11px] text-slate-500">Video &amp; bài học khối của em</div>
            </Link>
            <Link
              href="/exams"
              className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 transition-colors space-y-1"
            >
              <FileCheck2 className="w-5 h-5 text-purple-700" />
              <div className="font-bold text-xs text-slate-900">Kiểm Tra Định Kỳ</div>
              <div className="text-[11px] text-slate-500">Đề chuẩn GD&amp;ĐT đúng khối</div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleCompleteDiscovery = async (score: number) => {
    updateMachineScore(machineId, 'discovery', score);
    if (user.studentCode) {
      await updateStudentStats(user.tenantId, user.studentCode, 50);
    }
    if (user.partnerCode) {
      await updateStudentStats(user.tenantId, user.partnerCode, 50);
    }
    if (score >= 8) {
      confetti({ particleCount: 55, spread: 60, origin: { y: 0.7 } });
    }
  };

  const handleSubmitPracticeQuiz = async () => {
    if (!periodData) return;
    const res = gradePracticeQuiz(periodData, quizAnswers);
    setQuizResult(res);
    updateMachineScore(machineId, 'practice', res.score);
    const xp = Math.round(res.score * 5);
    if (user.studentCode) await updateStudentStats(user.tenantId, user.studentCode, xp);
    if (user.partnerCode) await updateStudentStats(user.tenantId, user.partnerCode, xp);
    if (res.score >= 8) {
      confetti({ particleCount: 50, spread: 55, origin: { y: 0.7 } });
    }
  };

  const handlePracticalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !periodData) return;
    setUploading(true);
    setUploadNotice('');
    try {
      let fileDataUrl: string | undefined;
      if (selectedFile.size <= 512 * 1024) {
        fileDataUrl = await new Promise<string | undefined>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(selectedFile);
        });
      }

      const driveRes = await uploadPracticalToDriveOnline({
        file: selectedFile,
        grade: periodData.grade,
        period: periodData.period,
        className: user.studentClass || roomState.activeClassName,
        studentId: user.studentCode || `M${machineId}`,
        studentName: studentDisplay,
        taskTitle: periodData.practicalTask?.title || periodData.title,
        tenantId: user.tenantId,
      });

      await savePracticalSubmission({
        id: `prac-${Date.now()}`,
        tenantId: user.tenantId,
        submissionCode: `M${String(machineId).padStart(2, '0')}-T${periodData.period}`,
        studentCode: user.studentCode || `M${machineId}`,
        studentName: studentDisplay,
        classId: roomState.activeClassId,
        className: user.studentClass || roomState.activeClassName,
        grade: periodData.grade as GradeLevel,
        roomId: user.roomId,
        machineId,
        period: periodData.period,
        assignmentTitle: periodData.practicalTask?.title || periodData.title,
        fileName: selectedFile.name,
        fileSize: `${Math.max(1, Math.round(selectedFile.size / 1024))} KB`,
        fileType: selectedFile.type || selectedFile.name.split('.').pop(),
        fileDataUrl,
        submittedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        submittedTimestamp: Date.now(),
        fileUrl: driveRes.fileUrl,
        score: 9.5,
        status: 'submitted',
      });

      updateMachineScore(machineId, 'lab', 9.5, selectedFile.name);
      if (user.studentCode) await updateStudentStats(user.tenantId, user.studentCode, 60);
      setUploadNotice(
        `Đã nộp sản phẩm "${selectedFile.name}" thành công! ${driveRes.message}`
      );
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const relevantPracticeFiles = practiceFiles.filter(
    (pf) => pf.grade === (periodData?.grade || roomState.activeGrade)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* LIVE CLASSROOM HEADER */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Đang học trực tiếp · {roomState.activeClassName} · Máy {String(machineId).padStart(2, '0')}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Tiết {roomState.activePeriod}: {periodData?.title || roomState.lessonTitle}
          </h1>
          <p className="text-xs text-slate-300">
            Cặp đôi: <strong>{studentDisplay}</strong> · Phụ trách: {user.teacherName}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="font-mono font-extrabold text-base tabular-nums">
              {formatCountdown(timerSec)}
            </span>
          </div>
        </div>
      </div>

      {/* 3 ACTIVITY TABS */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {(
          [
            {
              key: 'discovery' as const,
              title: '1. Khám Phá Cặp Đôi',
              unlocked: roomState.activityLocks.discovery,
            },
            {
              key: 'practice' as const,
              title: '2. Luyện Tập 7 Câu',
              unlocked: roomState.activityLocks.practice,
            },
            {
              key: 'lab' as const,
              title: '3. Thực Hành Phòng Máy',
              unlocked: roomState.activityLocks.lab,
            },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`p-3 sm:p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                active
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
              }`}
            >
              <span className="text-xs sm:text-sm font-extrabold truncate">{tab.title}</span>
              {!tab.unlocked && <Lock className="w-3.5 h-3.5 shrink-0 opacity-75" />}
            </button>
          );
        })}
      </div>

      {/* ACTIVITY 1: DISCOVERY WORKSHEET */}
      {activeTab === 'discovery' && periodData && (
        <InteractiveDiscoveryPair
          currentPeriod={periodData}
          student1Name={user.studentName || 'Học sinh 1'}
          student2Name={user.partnerName}
          isLocked={!roomState.activityLocks.discovery}
          onComplete={handleCompleteDiscovery}
        />
      )}

      {/* ACTIVITY 2: 7-QUESTION REINFORCEMENT */}
      {activeTab === 'practice' && periodData && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Bài Tập Củng Cố 7 Câu ({periodData.reinforcement.matrix})
              </h2>
              <p className="text-xs text-slate-500">
                Hệ thống tự động chấm điểm ngay và cộng XP cho cặp đôi.
              </p>
            </div>
            {!roomState.activityLocks.practice && (
              <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Giáo viên đang tạm khóa</span>
              </span>
            )}
          </div>

          <div className="space-y-4">
            {periodData.reinforcement.questions.map((q, idx) => {
              const selected = quizAnswers[q.id];
              return (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-bold text-slate-900">
                      Câu {idx + 1}: {q.question}
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold shrink-0">
                      {q.level}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => {
                      const chosen = selected === oIdx;
                      const isCorrectOpt = q.correctIndex === oIdx;
                      let cls =
                        'bg-white border-slate-200 text-slate-700 hover:border-blue-400';
                      if (quizResult) {
                        if (isCorrectOpt)
                          cls = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                        else if (chosen)
                          cls = 'bg-rose-50 border-rose-400 text-rose-800';
                      } else if (chosen) {
                        cls = 'bg-blue-700 border-blue-700 text-white font-bold';
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          disabled={Boolean(quizResult) || !roomState.activityLocks.practice}
                          onClick={() =>
                            setQuizAnswers((prev) => ({ ...prev, [q.id]: oIdx }))
                          }
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

                  {quizResult && (
                    <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                      <strong>Giải thích:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
            {quizResult ? (
              <div className="flex items-center gap-3 text-sm font-extrabold text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  Kết quả: {quizResult.correctCount}/{quizResult.totalQuestions} câu đúng ·{' '}
                  <span className="font-mono">{quizResult.score} / 10 điểm</span>
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500">
                Đã trả lời: {Object.keys(quizAnswers).length} /{' '}
                {periodData.reinforcement.questions.length} câu
              </span>
            )}

            {!quizResult && (
              <button
                type="button"
                disabled={!roomState.activityLocks.practice}
                onClick={handleSubmitPracticeQuiz}
                className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Nộp Bài Luyện Tập</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ACTIVITY 3: PRACTICAL TASK */}
      {activeTab === 'lab' && periodData && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Laptop className="w-5 h-5 text-purple-700" />
                <span>
                  {periodData.practicalTask?.title ||
                    `Thực hành vận dụng Tiết ${periodData.period}`}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tải tệp mẫu (nếu có), thực hiện theo các bước chuẩn và nộp sản phẩm về bàn giáo viên.
              </p>
            </div>
            {!roomState.activityLocks.lab && (
              <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Chưa mở nộp thực hành</span>
              </span>
            )}
          </div>

          {periodData.practicalTask && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 uppercase text-[11px]">
                  Các bước thực hành chuẩn:
                </div>
                <ol className="space-y-1.5 list-decimal list-inside text-slate-700">
                  {periodData.practicalTask.steps.map((st, idx) => (
                    <li key={idx}>{st}</li>
                  ))}
                </ol>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2">
                <div className="font-bold text-purple-950 uppercase text-[11px]">
                  Tệp dữ liệu mẫu thực hành:
                </div>
                {relevantPracticeFiles.length > 0 ? (
                  <div className="space-y-2">
                    {relevantPracticeFiles.slice(0, 2).map((pf) => (
                      <a
                        key={pf.id}
                        href={getAssetUrl(pf.fileUrl)}
                        download
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-purple-200 hover:border-purple-400 text-slate-800 font-semibold"
                      >
                        <span className="truncate">{pf.title}</span>
                        <Download className="w-4 h-4 text-purple-700 shrink-0" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600">
                    Sử dụng phần mềm văn phòng / trình duyệt trên máy trạm theo hướng dẫn.
                  </p>
                )}
              </div>
            </div>
          )}

          {uploadNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadNotice}</span>
            </div>
          )}

          <form onSubmit={handlePracticalSubmit} className="space-y-3 text-xs">
            <label className="block p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 text-center cursor-pointer transition-colors">
              <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="font-bold text-slate-900">
                {selectedFile
                  ? `Đã chọn: ${selectedFile.name} (${Math.max(1, Math.round(selectedFile.size / 1024))} KB)`
                  : 'Chọn tệp sản phẩm (.xlsx, .docx, .pptx, .jpg, .png)'}
              </div>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.docx,.doc,.pptx,.ppt,.pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!selectedFile || uploading || !roomState.activityLocks.lab}
                className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{uploading ? 'Đang gửi bài...' : 'Nộp Sản Phẩm Thực Hành'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function InClassPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-16 text-center text-xs text-slate-500">
          Đang mở Lớp Học Số...
        </div>
      }
    >
      <InClassContent />
    </Suspense>
  );
}