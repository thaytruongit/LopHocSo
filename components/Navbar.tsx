'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileCheck2,
  Users,
  LogOut,
  Menu,
  X,
  UserCheck,
  Monitor,
  School,
  BookOpen,
  PlayCircle,
  Trophy,
  FileSpreadsheet,
  ChevronDown,
  Check,
  PlusCircle,
  Building2,
} from 'lucide-react';
import {
  getCurrentUser,
  UserSession,
  logout,
} from '@/lib/auth';
import { ClassItem, CurriculumPeriod, GradeLevel } from '@/lib/domain/types';
import {
  getClassroomState,
  selectClassForClassroom,
  selectPeriodForClassroom,
  subscribeToClassroomState,
} from '@/lib/classroom-control';
import {
  getClassesByTenant,
  getCurriculumByGrade,
  saveClassForTenant,
} from '@/lib/domain/data-repository';
import { getAssetUrl } from '@/lib/asset-path';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTabQuery, setCurrentTabQuery] = useState<string>('');

  // Active class/period for Teacher 2-step selector
  const [activeClassName, setActiveClassName] = useState<string>('Lớp 7A11');
  const [activeClassId, setActiveClassId] = useState<string>('c-7a11');
  const [activeGrade, setActiveGrade] = useState<GradeLevel>(7);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'class' | 'period'>('class');
  const [selectedModalGrade, setSelectedModalGrade] = useState<GradeLevel>(7);
  const [selectedPeriodModal, setSelectedPeriodModal] = useState<number>(1);
  const [autoLiveOnConfirm, setAutoLiveOnConfirm] = useState<boolean>(true);
  const [periodFilterText, setPeriodFilterText] = useState<string>('');

  const [availableClasses, setAvailableClasses] = useState<ClassItem[]>([]);
  const [gradeCurriculum, setGradeCurriculum] = useState<CurriculumPeriod[]>([]);
  const [showAddClassInline, setShowAddClassInline] = useState(false);
  const [newClassNameInput, setNewClassNameInput] = useState('');

  useEffect(() => {
    setMounted(true);

    const refreshAll = async () => {
      const current = getCurrentUser();
      setUser(current);

      const clsState = getClassroomState(current.tenantId, current.roomId);
      setActiveClassName(clsState.activeClassName || 'Lớp 7A11');
      setActiveClassId(clsState.activeClassId || 'c-7a11');
      setActiveGrade(clsState.activeGrade || 7);
      setSelectedModalGrade(clsState.activeGrade || 7);
      if (clsState.activePeriod > 0) setSelectedPeriodModal(clsState.activePeriod);

      const [classes, periods] = await Promise.all([
        getClassesByTenant(current.tenantId),
        getCurriculumByGrade(clsState.activeGrade || 7),
      ]);
      setAvailableClasses(classes);
      setGradeCurriculum(periods);
    };

    refreshAll();

    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      setCurrentTabQuery(sp.get('tab') || 'in-class');
    }

    const onSession = () => {
      refreshAll();
    };
    window.addEventListener('thso_session_change', onSession);

    return () => {
      window.removeEventListener('thso_session_change', onSession);
    };
  }, [pathname]);

  const userTenantId = user?.tenantId;
  const userRoomId = user?.roomId;

  useEffect(() => {
    if (!userTenantId || !userRoomId) return;
    const unsub = subscribeToClassroomState(
      (st) => {
        if (st.activeClassName) setActiveClassName(st.activeClassName);
        if (st.activeClassId) setActiveClassId(st.activeClassId);
        if (st.activeGrade) setActiveGrade(st.activeGrade);
        if (st.activePeriod > 0) setSelectedPeriodModal(st.activePeriod);
      },
      userTenantId,
      userRoomId
    );
    return () => unsub();
  }, [userTenantId, userRoomId]);

  useEffect(() => {
    getCurriculumByGrade(selectedModalGrade)
      .then(setGradeCurriculum)
      .catch(() => {});
  }, [selectedModalGrade]);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    router.push('/');
  };

  const studentMenus = [
    { title: 'Lớp Học Số', href: '/in-class', icon: Monitor },
    { title: 'BTVN', href: '/homework', icon: BookOpen },
    { title: 'Tự Học', href: '/self-study', icon: PlayCircle },
    { title: 'Kiểm Tra', href: '/exams', icon: FileCheck2 },
    { title: 'Thành Tích', href: '/achievements', icon: Trophy },
    { title: 'Bảng Điểm', href: '/gradebook', icon: FileSpreadsheet },
  ];

  const teacherMenus = [
    { title: 'Lớp Học Số', href: '/teacher?tab=in-class', icon: Monitor },
    { title: 'Lớp & Học Sinh', href: '/teacher?tab=class-roster', icon: Users },
    { title: 'Bài Kiểm Tra', href: '/teacher?tab=exams', icon: FileCheck2 },
    { title: 'Bảng Điểm', href: '/teacher?tab=gradebook', icon: FileSpreadsheet },
    { title: 'Quản Trị', href: '/admin', icon: Building2 },
  ];

  const activeMenus =
    !mounted || !user || user.role === 'guest'
      ? []
      : user.role === 'teacher'
      ? teacherMenus
      : studentMenus;

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* ZONE 1: BRANDING */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <img
                src={getAssetUrl('/images/tin_hoc_so_logo.jpg')}
                alt="Logo Tin học số"
                className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight whitespace-nowrap">
                    TIN HỌC SỐ
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium block whitespace-nowrap max-w-[155px] sm:max-w-[280px] truncate">
                  {user?.tenantName || 'Trường THCS Mão Điền'} · {user?.roomName || 'Phòng Tin học 1'}
                </span>
              </div>
            </Link>

            {/* ZONE 2: NAV & TEACHER CLASS PICKER */}
            <div className="hidden lg:flex items-center gap-2 min-w-0">
              {mounted && user?.role === 'teacher' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModalGrade(activeGrade);
                    setShowAddClassInline(false);
                    setModalStep('class');
                    setIsClassModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-500 text-teal-950 font-bold text-xs shrink-0 transition-colors"
                >
                  <School className="w-3.5 h-3.5 text-teal-700" />
                  <span className="whitespace-nowrap">{activeClassName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-teal-700" />
                </button>
              )}

              <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                {activeMenus.map((item) => {
                  const Icon = item.icon;
                  const isTeacherTab =
                    user?.role === 'teacher' &&
                    pathname === '/teacher' &&
                    item.href.startsWith('/teacher?tab=') &&
                    item.href.endsWith(`tab=${currentTabQuery}`);
                  const isActive =
                    isTeacherTab ||
                    (!item.href.includes('?') && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => {
                        if (item.href.includes('tab=')) {
                          const tabPart = item.href.split('tab=')[1] || 'in-class';
                          setCurrentTabQuery(tabPart);
                          window.dispatchEvent(
                            new CustomEvent('thso_tab_switch', { detail: tabPart })
                          );
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                        isActive
                          ? 'bg-blue-700 text-white'
                          : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* ZONE 3: SESSION STATUS & ACTIONS */}
            <div className="flex items-center gap-2 shrink-0">
              {!mounted ? (
                <div className="w-24 h-8 rounded-xl bg-slate-100 animate-pulse" />
              ) : !user?.isLoggedIn ? (
                <Link
                  href="/login"
                  className="px-3 sm:px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold whitespace-nowrap transition-colors"
                >
                  <span className="sm:hidden">Đăng nhập</span>
                  <span className="hidden sm:inline">Đăng nhập phòng máy</span>
                </Link>
              ) : user.role === 'teacher' ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                    <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="font-bold text-slate-900 whitespace-nowrap">
                      {user.teacherName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Đăng xuất"
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs">
                    <span className="px-1.5 py-0.5 rounded-md bg-blue-700 text-white font-mono font-bold text-[11px] tabular-nums">
                      M{String(user.machineId || 1).padStart(2, '0')}
                    </span>
                    <div className="text-left max-w-[150px] truncate hidden sm:block">
                      <span className="block font-bold text-slate-900 truncate">
                        {user.pairNames || user.studentName}
                      </span>
                      <span className="text-[10px] text-blue-700 font-medium block truncate">
                        {user.studentClass}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Đăng xuất"
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {activeMenus.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label="Mở menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && activeMenus.length > 0 && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
            {user?.role === 'teacher' && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSelectedModalGrade(activeGrade);
                  setModalStep('class');
                  setIsClassModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-teal-50 border border-teal-500 text-teal-950 font-bold text-xs"
              >
                <span>Lớp đang dạy: {activeClassName} (Khối {activeGrade})</span>
                <span className="text-teal-700">Đổi lớp ▾</span>
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              {activeMenus.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold"
                  >
                    <Icon className="w-4 h-4 text-blue-700 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* POPUP 2 BƯỚC CHỌN LỚP & TIẾT HỌC */}
      {mounted &&
        isClassModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center"
            onClick={() => setIsClassModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 sm:p-6 w-full max-w-2xl space-y-4 max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {modalStep === 'class'
                      ? 'Bước 1: Chọn Lớp Giảng Dạy'
                      : 'Bước 2: Chọn Tiết Học Trong PPCT (1–29)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {user?.tenantName} · {user?.roomName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalStep === 'class' ? (
                <div className="grid grid-cols-12 gap-3 overflow-y-auto">
                  <div className="col-span-4 space-y-1.5">
                    {([6, 7, 8, 9] as GradeLevel[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setSelectedModalGrade(g)}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-between ${
                          selectedModalGrade === g
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span>Khối {g}</span>
                        {selectedModalGrade === g && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>

                  <div className="col-span-8 space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                    {availableClasses
                      .filter((c) => c.grade === selectedModalGrade)
                      .map((cls) => (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={async () => {
                            await selectClassForClassroom(cls.id, cls.name, cls.grade);
                            setActiveClassId(cls.id);
                            setActiveClassName(cls.name);
                            setActiveGrade(cls.grade);
                            setModalStep('period');
                          }}
                          className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs border ${
                            activeClassId === cls.id
                              ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold'
                              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 font-semibold'
                          }`}
                        >
                          <span>{cls.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {cls.studentCount} HS →
                          </span>
                        </button>
                      ))}

                    {!showAddClassInline ? (
                      <button
                        type="button"
                        onClick={() => setShowAddClassInline(true)}
                        className="w-full py-2 px-3 rounded-xl border border-dashed border-teal-400 text-teal-700 text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Thêm lớp Khối {selectedModalGrade}</span>
                      </button>
                    ) : (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newClassNameInput.trim() || !user) return;
                          const name = newClassNameInput.trim().startsWith('Lớp')
                            ? newClassNameInput.trim()
                            : `Lớp ${newClassNameInput.trim()}`;
                          const newCls: ClassItem = {
                            id: `${user.tenantId}-${Date.now()}`,
                            tenantId: user.tenantId,
                            grade: selectedModalGrade,
                            name,
                            classCode: name.replace('Lớp ', ''),
                            studentCount: 0,
                          };
                          const next = await saveClassForTenant(newCls);
                          setAvailableClasses(next);
                          await selectClassForClassroom(newCls.id, newCls.name, newCls.grade);
                          setActiveClassId(newCls.id);
                          setActiveClassName(newCls.name);
                          setActiveGrade(newCls.grade);
                          setNewClassNameInput('');
                          setShowAddClassInline(false);
                          setModalStep('period');
                        }}
                        className="p-2.5 bg-slate-50 border border-teal-200 rounded-xl space-y-2"
                      >
                        <input
                          type="text"
                          placeholder={`Ví dụ: ${selectedModalGrade}A14`}
                          value={newClassNameInput}
                          onChange={(e) => setNewClassNameInput(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                          autoFocus
                        />
                        <div className="flex gap-1.5">
                          <button
                            type="submit"
                            className="px-3 py-1 rounded-lg bg-teal-600 text-white font-bold text-xs"
                          >
                            Tạo &amp; Chọn
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddClassInline(false)}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold"
                          >
                            Hủy
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setModalStep('class')}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                    >
                      ← Đổi lớp ({activeClassName})
                    </button>
                    <input
                      type="text"
                      placeholder="Tìm tên bài hoặc số tiết..."
                      value={periodFilterText}
                      onChange={(e) => setPeriodFilterText(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 w-52"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-1">
                    {gradeCurriculum
                      .filter(
                        (p) =>
                          !periodFilterText.trim() ||
                          p.title.toLowerCase().includes(periodFilterText.toLowerCase()) ||
                          String(p.period) === periodFilterText.trim()
                      )
                      .map((p) => {
                        const selected = selectedPeriodModal === p.period;
                        return (
                          <button
                            key={p.period}
                            type="button"
                            onClick={() => setSelectedPeriodModal(p.period)}
                            className={`p-2.5 rounded-xl text-left border flex items-start justify-between gap-2 text-xs ${
                              selected
                                ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold'
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold text-teal-700">
                                Tiết {p.period} · {p.isPractice ? 'Thực hành' : 'Lý thuyết'}
                              </div>
                              <div className="font-semibold text-slate-800 truncate">{p.title}</div>
                            </div>
                            {selected && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                          </button>
                        );
                      })}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoLiveOnConfirm}
                        onChange={(e) => setAutoLiveOnConfirm(e.target.checked)}
                        className="w-4 h-4 accent-teal-600 rounded"
                      />
                      <span>Mở phát trực tiếp ngay khi bắt đầu</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const lesson =
                          gradeCurriculum.find((l) => l.period === selectedPeriodModal) ||
                          gradeCurriculum[0];
                        selectPeriodForClassroom({
                          period: selectedPeriodModal,
                          lessonTitle: lesson?.title || `Tiết ${selectedPeriodModal}`,
                          grade: selectedModalGrade,
                          isPractical: Boolean(lesson?.isPractice || lesson?.practicalTask),
                          classId: activeClassId,
                          className: activeClassName,
                          autoLive: autoLiveOnConfirm,
                        });
                        setIsClassModalOpen(false);
                        router.push('/teacher?tab=in-class', { scroll: false });
                      }}
                      className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                    >
                      Xác nhận &amp; Vào tiết dạy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
