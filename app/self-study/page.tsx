'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  PlayCircle,
  BookOpen,
  Search,
  Sparkles,
  CheckCircle2,
  Download,
  Lock,
} from 'lucide-react';
import { getCurrentUser, UserSession } from '@/lib/auth';
import { getCurriculumByGrade, getResources } from '@/lib/domain/data-repository';
import { getEffectiveGrade, isTeacherUser } from '@/lib/domain/access-control';
import {
  CurriculumPeriod,
  GradeLevel,
  PracticeFile,
  VideoLecture,
} from '@/lib/domain/types';
import { getAssetUrl } from '@/lib/asset-path';
import CurriculumPeriodModal from '@/components/CurriculumPeriodModal';
import StudentAuthGate from '@/components/StudentAuthGate';

export default function SelfStudyPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(7);
  const [periods, setPeriods] = useState<CurriculumPeriod[]>([]);
  const [videos, setVideos] = useState<VideoLecture[]>([]);
  const [practiceFiles, setPracticeFiles] = useState<PracticeFile[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeVideo, setActiveVideo] = useState<VideoLecture | null>(null);
  const [modalPeriod, setModalPeriod] = useState<CurriculumPeriod | null>(null);

  useEffect(() => {
    setMounted(true);
    const syncUser = () => {
      const u = getCurrentUser();
      setUser(u);
      if (u.studentGrade) setSelectedGrade(u.studentGrade);
    };
    syncUser();

    getResources()
      .then((res) => {
        setVideos(res.videos || []);
        setPracticeFiles(res.practiceFiles || []);
      })
      .catch(() => {});

    window.addEventListener('thso_session_change', syncUser);
    return () => window.removeEventListener('thso_session_change', syncUser);
  }, []);

  const isTeacher = isTeacherUser(user);
  const effectiveGrade = getEffectiveGrade(user, selectedGrade);

  useEffect(() => {
    if (!effectiveGrade) {
      setPeriods([]);
      return;
    }
    getCurriculumByGrade(effectiveGrade).then(setPeriods).catch(() => {});
  }, [effectiveGrade]);

  const filteredPeriods = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return periods;
    return periods.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.topic.toLowerCase().includes(q) ||
        String(p.period) === q
    );
  }, [periods, searchTerm]);

  const gradeVideos = useMemo(() => {
    if (!effectiveGrade) return [];
    if (isTeacher) return videos;
    const direct = videos.filter((v) => v.grade === effectiveGrade);
    if (direct.length > 0) return direct;
    return videos.filter((v) => v.id === 'vid-2' || v.id === 'vid-4');
  }, [videos, effectiveGrade, isTeacher]);

  const currentVideo = useMemo(() => {
    if (gradeVideos.length === 0) return null;
    if (activeVideo && gradeVideos.some((v) => v.id === activeVideo.id)) {
      return activeVideo;
    }
    return gradeVideos[0];
  }, [gradeVideos, activeVideo]);

  const gradePracticeFiles = useMemo(() => {
    if (!effectiveGrade) return [];
    if (isTeacher) return practiceFiles;
    return practiceFiles.filter((pf) => pf.grade === effectiveGrade);
  }, [practiceFiles, effectiveGrade, isTeacher]);

  if (!mounted || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-slate-500 font-semibold">
        Đang tải kho học liệu tự học...
      </div>
    );
  }

  if (!user.isLoggedIn || !effectiveGrade) {
    return (
      <StudentAuthGate
        title="Kho Học Liệu Tự Học Theo Khối"
        description="Vui lòng đăng nhập tài khoản học sinh hoặc giáo viên để mở đúng 29 tiết học, video và tệp thực hành của khối lớp em."
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            {isTeacher
              ? 'Kho Học Liệu Tự Học · 116 Tiết (Khối 6–9) · 812 Câu Hỏi'
              : `${user.tenantName} · Tài Liệu Khối ${effectiveGrade} (29 Tiết)`}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {isTeacher
              ? 'TỰ HỌC VIDEO & TRỌNG TÂM 116 TIẾT'
              : `TỰ HỌC VIDEO & TRỌNG TÂM KHỐI ${effectiveGrade}`}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Xem lại video bài giảng trực quan, tải tệp Excel thực hành và ôn luyện trọn bộ 29 tiết theo đúng khối lớp.
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

      {/* VIDEO PLAYER SECTION */}
      {currentVideo && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6">
          <div className="lg:col-span-7 space-y-3">
            <div className="aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
              <video
                key={currentVideo.videoUrl}
                controls
                className="w-full h-full object-contain"
                src={getAssetUrl(currentVideo.videoUrl)}
              />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-700">
                Khối {currentVideo.grade} · {currentVideo.topic} · {currentVideo.duration}
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                {currentVideo.title}
              </h2>
              <p className="text-xs text-slate-600 mt-1">{currentVideo.description}</p>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Danh Sách Video Bài Giảng ({gradeVideos.length})
              </h3>
              <div className="space-y-2">
                {gradeVideos.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setActiveVideo(v)}
                    className={`w-full p-3 rounded-xl border text-left text-xs flex items-start gap-2.5 transition-colors ${
                      currentVideo.id === v.id
                        ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <PlayCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="truncate">{v.title}</div>
                      <div className="text-[11px] text-slate-500">
                        Khối {v.grade} · {v.duration}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="text-xs font-bold text-emerald-900">
                Tệp Thực Hành Mẫu {isTeacher ? '(Tất cả khối)' : `(Khối ${effectiveGrade})`}:
              </div>
              {gradePracticeFiles.length > 0 ? (
                <div className="space-y-1.5">
                  {gradePracticeFiles.map((pf) => (
                    <a
                      key={pf.id}
                      href={getAssetUrl(pf.fileUrl)}
                      download
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-white border border-emerald-200 hover:border-emerald-400 text-slate-800 font-semibold"
                    >
                      <span className="truncate">{pf.title}</span>
                      <Download className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-800">
                  Khối {effectiveGrade} thực hành trực tiếp theo hướng dẫn từng tiết trong chương trình 29 tiết bên dưới.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 29 PERIODS OF SELECTED GRADE */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-700" />
            <span>Chương Trình 29 Tiết · Khối {effectiveGrade}</span>
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tiết học hoặc chủ đề..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
        </div>

        {periods.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-semibold">
            Đang tải 29 tiết học Khối {effectiveGrade} từ kho CDN...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPeriods.map((p) => (
              <div
                key={p.id}
                onClick={() => setModalPeriod(p)}
                className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-white cursor-pointer transition-all flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-blue-700">
                      Tiết {p.period} · {p.isPractice ? 'Thực hành' : 'Lý thuyết'}
                    </span>
                    <span className="text-slate-500 font-mono">7 câu</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 line-clamp-2">{p.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{p.contentDesc}</p>
                </div>
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] font-bold text-blue-700">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Xem kiến thức &amp; 7 câu</span>
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CurriculumPeriodModal period={modalPeriod} onClose={() => setModalPeriod(null)} />
    </div>
  );
}
