'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Camera,
  FileText,
  UploadCloud,
  CheckCircle2,
  Type,
  Lock,
} from 'lucide-react';
import { getCurrentUser, UserSession } from '@/lib/auth';
import {
  getClassesByTenant,
  getCurriculumByGrade,
  getHomeworkSubmissions,
  saveHomeworkSubmission,
  updateStudentStats,
} from '@/lib/domain/data-repository';
import {
  getEffectiveGrade,
  isHomeworkPeriodUnlocked,
  isTeacherUser,
  matchesStudentClass,
} from '@/lib/domain/access-control';
import { subscribeToTaughtPeriods } from '@/lib/classroom-control';
import { compressImageFile } from '@/lib/image-compressor';
import { uploadHomeworkToDriveOnline } from '@/lib/google-drive-service';
import {
  CurriculumPeriod,
  GradeLevel,
  HomeworkSubmission,
} from '@/lib/domain/types';
import StudentAuthGate from '@/components/StudentAuthGate';

export default function HomeworkPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(7);
  const [periods, setPeriods] = useState<CurriculumPeriod[]>([]);
  const [selectedPeriodNum, setSelectedPeriodNum] = useState<number>(8);
  const [studentClassId, setStudentClassId] = useState<string>('');
  const [taughtPeriods, setTaughtPeriods] = useState<number[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);

  const [submitMode, setSubmitMode] = useState<'image' | 'file' | 'text'>('image');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [noteText, setNoteText] = useState<string>('');
  const [compressionStats, setCompressionStats] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    const syncUser = () => {
      const current = getCurrentUser();
      setUser(current);
      if (current.studentGrade) setSelectedGrade(current.studentGrade);
      if (current.isLoggedIn) {
        getHomeworkSubmissions(current.tenantId).then(setSubmissions).catch(() => {});
        getClassesByTenant(current.tenantId)
          .then((clsList) => {
            const matched =
              clsList.find((c) => matchesStudentClass(current.studentClass, c)) ||
              clsList.find((c) => c.grade === (current.studentGrade || 7)) ||
              clsList[0];
            setStudentClassId(matched?.id || '');
          })
          .catch(() => {});
      } else {
        setSubmissions([]);
        setStudentClassId('');
      }
    };

    syncUser();
    window.addEventListener('thso_session_change', syncUser);
    return () => window.removeEventListener('thso_session_change', syncUser);
  }, []);

  const isTeacher = isTeacherUser(user);
  const effectiveGrade = getEffectiveGrade(user, selectedGrade);
  const userTenantId = user?.tenantId;

  useEffect(() => {
    if (!userTenantId || !studentClassId) {
      setTaughtPeriods([]);
      return;
    }
    const unsub = subscribeToTaughtPeriods(userTenantId, studentClassId, (list) => {
      setTaughtPeriods(list);
    });
    return () => unsub();
  }, [userTenantId, studentClassId]);

  const hasAutoSelectedRef = useRef(false);

  useEffect(() => {
    if (hasAutoSelectedRef.current || isTeacher || taughtPeriods.length === 0) return;
    hasAutoSelectedRef.current = true;
    setSelectedPeriodNum((prev) =>
      taughtPeriods.includes(prev) ? prev : taughtPeriods[taughtPeriods.length - 1]
    );
  }, [isTeacher, taughtPeriods]);

  useEffect(() => {
    if (!effectiveGrade) {
      setPeriods([]);
      return;
    }
    getCurriculumByGrade(effectiveGrade).then(setPeriods).catch(() => {});
  }, [effectiveGrade]);

  const activePeriod = useMemo(
    () => periods.find((p) => p.period === selectedPeriodNum) || periods[0],
    [periods, selectedPeriodNum]
  );

  const activePeriodUnlock = useMemo(
    () =>
      activePeriod
        ? isHomeworkPeriodUnlocked(user, activePeriod.period, taughtPeriods)
        : { unlocked: false, reason: 'untaught' as const },
    [user, activePeriod, taughtPeriods]
  );

  const mySubmissions = useMemo(() => {
    if (!user?.studentCode) return submissions.slice(0, 8);
    return submissions.filter((s) => s.studentCode === user.studentCode);
  }, [submissions, user?.studentCode]);

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activePeriod) return;
    if (!isHomeworkPeriodUnlocked(user, activePeriod.period, taughtPeriods).unlocked) return;
    if (submitMode !== 'text' && !selectedFile) return;
    if (submitMode === 'text' && !noteText.trim()) return;

    setSubmitting(true);
    setSuccessMsg('');
    setCompressionStats('');

    try {
      let fileToUpload = selectedFile;
      let fileDataUrl: string | undefined;
      let fileSizeLabel = `${Math.max(1, noteText.length)} ký tự`;

      if (selectedFile && submitMode === 'image') {
        const comp = await compressImageFile(selectedFile, {
          maxWidth: 1400,
          maxHeight: 1400,
          quality: 0.78,
          mimeType: 'image/webp',
        });
        fileToUpload = comp.file;
        fileDataUrl = comp.dataUrl || undefined;
        fileSizeLabel = `${Math.max(1, Math.round(comp.compressedSize / 1024))} KB`;
        if (comp.isCompressed) {
          setCompressionStats(
            `Đã tối ưu dung lượng ảnh giảm ${comp.reductionPercent}% trước khi lưu.`
          );
        }
      } else if (selectedFile) {
        fileSizeLabel = `${Math.max(1, Math.round(selectedFile.size / 1024))} KB`;
      }

      let driveUrl: string | undefined;
      const targetGrade = effectiveGrade || 7;
      if (fileToUpload) {
        const driveRes = await uploadHomeworkToDriveOnline({
          file: fileToUpload,
          grade: targetGrade,
          period: activePeriod.period,
          className: user.studentClass || `Khối ${targetGrade}`,
          studentId: user.studentCode || 'GUEST',
          studentName: user.studentName || 'Học sinh',
          assignmentTitle: activePeriod.homework.title,
          note: noteText.trim(),
          tenantId: user.tenantId,
        });
        driveUrl = driveRes.fileUrl;
      }

      const newSub: HomeworkSubmission = {
        id: `hw-${Date.now()}`,
        tenantId: user.tenantId,
        homeworkId: activePeriod.id,
        homeworkTitle: activePeriod.homework.title,
        period: activePeriod.period,
        grade: targetGrade,
        studentCode: user.studentCode || 'HS-DEMO',
        studentName: user.studentName || 'Học sinh tự do',
        classId: user.studentClass ? `c-${user.studentClass.replace('Lớp ', '').toLowerCase()}` : 'c-7a11',
        className: user.studentClass || `Khối ${targetGrade}`,
        fileType:
          submitMode === 'image'
            ? 'image'
            : submitMode === 'text'
            ? 'text'
            : selectedFile?.name.endsWith('.xlsx')
            ? 'xlsx'
            : 'docx',
        fileName:
          fileToUpload?.name || `BaiLam_Tiet${activePeriod.period}_${user.studentCode || 'HS'}.txt`,
        fileSize: fileSizeLabel,
        fileDataUrl,
        driveUrl,
        note: noteText.trim() || undefined,
        submittedAt: new Date().toLocaleString('vi-VN'),
        status: 'submitted',
      };

      await saveHomeworkSubmission(newSub);
      if (user.studentCode) {
        await updateStudentStats(user.tenantId, user.studentCode, 40);
      }
      setSubmissions((prev) => [newSub, ...prev]);
      setSelectedFile(null);
      setNoteText('');
      setSuccessMsg(
        `Đã nộp Bài tập về nhà Tiết ${activePeriod.period} thành công (+40 XP)!`
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-slate-500 font-semibold">
        Đang tải cổng bài tập về nhà...
      </div>
    );
  }

  if (!user.isLoggedIn || !effectiveGrade) {
    return (
      <StudentAuthGate
        title="Cổng Nộp Bài Tập Về Nhà"
        description="Vui lòng đăng nhập tài khoản học sinh hoặc giáo viên để xem và nộp bài tập theo đúng khối lớp của em."
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            {user?.tenantName} · Cổng Nộp Bài Tập Về Nhà 29 Tiết
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            BÀI TẬP VỀ NHÀ THEO CHƯƠNG TRÌNH
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Hỗ trợ chụp ảnh vở (tự động nén WebP tiết kiệm băng thông), tải tệp Excel/Word hoặc gõ câu trả lời trực tiếp.
          </p>
        </div>

        {isTeacher ? (
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold self-start">
            {([6, 7, 8, 9] as GradeLevel[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGrade(g)}
                className={`px-3.5 py-2 rounded-xl transition-colors ${
                  effectiveGrade === g ? 'bg-blue-700 text-white' : 'text-slate-600'
                }`}
              >
                Khối {g}
              </button>
            ))}
          </div>
        ) : (
          <div className="px-4 py-2 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center gap-2 self-start">
            <Lock className="w-3.5 h-3.5" />
            <span>Khóa theo {user.studentClass || `Khối ${effectiveGrade}`}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: PERIOD LIST */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700" />
              <span>Chọn Tiết Học (Khối {effectiveGrade} · {periods.length} tiết)</span>
            </h2>
            {!isTeacher && (
              <span className="font-mono text-[11px] font-bold text-emerald-700">
                Đã mở {taughtPeriods.length}/{periods.length}
              </span>
            )}
          </div>
          <div className="space-y-1.5 max-h-[540px] overflow-y-auto pr-1">
            {periods.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-semibold">
                Đang tải 29 tiết học Khối {effectiveGrade}...
              </div>
            ) : (
              periods.map((p) => {
                const unlockState = isHomeworkPeriodUnlocked(user, p.period, taughtPeriods);
                const isTaught = taughtPeriods.includes(p.period);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPeriodNum(p.period)}
                    className={`w-full p-3 rounded-xl border text-left text-xs transition-colors flex items-center justify-between gap-2 ${
                      selectedPeriodNum === p.period
                        ? unlockState.unlocked
                          ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold'
                          : 'border-amber-500 bg-amber-50/70 text-slate-900 font-bold'
                        : unlockState.unlocked
                        ? 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        : 'border-slate-200 bg-slate-50/70 text-slate-500 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-blue-700">Tiết {p.period}</span>
                        {isTaught ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Đã dạy · Mở BTVN
                          </span>
                        ) : (
                          !isTeacher && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold">
                              Chưa dạy · Khóa
                            </span>
                          )
                        )}
                      </div>
                      <div className="truncate font-semibold">{p.homework.title}</div>
                    </div>
                    {unlockState.unlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: SUBMISSION FORM + HISTORY */}
        <div className="lg:col-span-7 space-y-5">
          {activePeriod && !activePeriodUnlock.unlocked && (
            <div className="bg-white rounded-2xl border border-amber-300 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div className="text-[11px] font-bold text-amber-700 uppercase">
                Tiết {activePeriod.period} · {user.studentClass || `Khối ${effectiveGrade}`} Đang Khóa
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Tiết Học Chưa Dạy — Bài Tập Về Nhà Chưa Mở
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Giáo viên chưa giảng dạy <strong>Tiết {activePeriod.period}</strong> cho lớp{' '}
                <strong>{user.studentClass || `Khối ${effectiveGrade}`}</strong>, nên nhiệm vụ{' '}
                <em>&ldquo;{activePeriod.homework.title}&rdquo;</em> đang tạm khóa. Em vui lòng hoàn thành các tiết đã đánh dấu{' '}
                <strong>Đã dạy</strong> hoặc quay lại sau khi thầy dạy xong tiết này trên lớp.
              </p>
            </div>
          )}

          {activePeriod && activePeriodUnlock.unlocked && (
            <form
              onSubmit={handleSubmitHomework}
              className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 text-xs"
            >
              <div className="space-y-1 pb-3 border-b border-slate-100">
                <div className="text-[11px] font-bold text-blue-700 uppercase">
                  Nhiệm vụ Tiết {activePeriod.period} · Khối {effectiveGrade}
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {activePeriod.homework.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {activePeriod.homework.description}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'image', label: 'Chụp ảnh vở', icon: Camera },
                    { id: 'file', label: 'Nộp file Office', icon: FileText },
                    { id: 'text', label: 'Gõ câu trả lời', icon: Type },
                  ] as const
                ).map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSubmitMode(m.id)}
                      className={`py-2.5 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 ${
                        submitMode === m.id
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {submitMode !== 'text' && (
                <label className="block p-5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 text-center cursor-pointer">
                  <UploadCloud className="w-7 h-7 text-blue-600 mx-auto mb-1.5" />
                  <div className="font-bold text-slate-800">
                    {selectedFile
                      ? `${selectedFile.name} (${Math.max(1, Math.round(selectedFile.size / 1024))} KB)`
                      : submitMode === 'image'
                      ? 'Chọn ảnh chụp vở ghi (.jpg, .png, .webp)'
                      : 'Chọn tệp bài làm (.xlsx, .docx, .pptx, .pdf)'}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept={
                      submitMode === 'image'
                        ? 'image/*'
                        : '.xlsx,.xls,.docx,.doc,.pptx,.ppt,.pdf'
                    }
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </label>
              )}

              <textarea
                rows={submitMode === 'text' ? 4 : 2}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={
                  submitMode === 'text'
                    ? 'Nhập nội dung lời giải bài tập về nhà của em...'
                    : 'Ghi chú gửi thầy (tùy chọn)...'
                }
                className="w-full rounded-xl border border-slate-300 p-3"
              />

              {compressionStats && (
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 font-semibold">
                  {compressionStats}
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold"
                >
                  {submitting ? 'Đang gửi bài...' : 'Nộp Bài Tập Về Nhà (+40 XP)'}
                </button>
              </div>
            </form>
          )}

          {/* SUBMISSION HISTORY */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">
              Lịch Sử Nộp Bài Của Em ({mySubmissions.length})
            </h3>
            <div className="divide-y divide-slate-100">
              {mySubmissions.slice(0, 6).map((sub) => (
                <div key={sub.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{sub.homeworkTitle}</div>
                    <div className="text-[11px] text-slate-500">
                      {sub.studentName} · {sub.fileName} ({sub.fileSize})
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 text-[11px] ${
                      sub.status === 'graded'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {sub.status === 'graded'
                      ? `${sub.tt22Rank || 'Đạt'} · ${sub.score ?? 9}đ`
                      : 'Đã nộp'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
