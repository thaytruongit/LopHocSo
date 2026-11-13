'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Monitor,
  Users,
  KeyRound,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  PlusCircle,
  X,
  CheckCircle2,
  Layers,
  Database,
  BookOpen,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  ClassItem,
  GradeLevel,
  SchoolTenant,
  Student,
} from '@/lib/domain/types';
import {
  getTenants,
  getClassesByTenant,
  getStudentsByTenant,
  saveTenant,
  saveClassForTenant,
} from '@/lib/domain/data-repository';
import {
  getActiveTenantContext,
  loginAsStudentSession,
  loginAsTeacherSession,
  setActiveTenantContext,
} from '@/lib/auth';
import { getAssetUrl } from '@/lib/asset-path';

export default function LoginPortal() {
  const router = useRouter();
  const [tenants, setTenants] = useState<SchoolTenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('mao-dien');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('pm-1');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [roleTab, setRoleTab] = useState<'student' | 'teacher'>('student');
  const [grade, setGrade] = useState<GradeLevel>(7);
  const [classId, setClassId] = useState<string>('c-7a11');
  const [machineId, setMachineId] = useState<number>(1);
  const [primaryStudentId, setPrimaryStudentId] = useState<string>('');
  const [partnerStudentId, setPartnerStudentId] = useState<string>('');
  const [studentPassword, setStudentPassword] = useState<string>('123');
  const [teacherPasscode, setTeacherPasscode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Modal Create Tenant
  const [showNewTenantModal, setShowNewTenantModal] = useState<boolean>(false);
  const [newSchoolName, setNewSchoolName] = useState<string>('');
  const [newTeacherName, setNewTeacherName] = useState<string>('');
  const [newProvince, setNewProvince] = useState<string>('Bắc Ninh');

  useEffect(() => {
    const init = async () => {
      try {
        const ctx = getActiveTenantContext();
        const allTenants = await getTenants();
        setTenants(allTenants);
        const activeT = allTenants.find((t) => t.id === ctx.tenantId) || allTenants[0];
        if (activeT) {
          setSelectedTenantId(activeT.id);
          setSelectedRoomId(
            activeT.rooms.some((r) => r.id === ctx.roomId) ? ctx.roomId : activeT.rooms[0]?.id || 'pm-1'
          );
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const activeTenant = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId) || tenants[0],
    [tenants, selectedTenantId]
  );

  useEffect(() => {
    if (!selectedTenantId) return;
    let cancelled = false;
    Promise.all([
      getClassesByTenant(selectedTenantId),
      getStudentsByTenant(selectedTenantId),
    ]).then(([clsList, stList]) => {
      if (cancelled) return;
      setClasses(clsList);
      setStudents(stList);
      setGrade((prevGrade) => {
        const matchGradeClass = clsList.find((c) => c.grade === prevGrade) || clsList[0];
        if (matchGradeClass) {
          setClassId(matchGradeClass.id);
          return matchGradeClass.grade;
        }
        return prevGrade;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedTenantId]);

  const classesInGrade = useMemo(
    () => classes.filter((c) => c.grade === grade),
    [classes, grade]
  );

  useEffect(() => {
    if (classesInGrade.length > 0 && !classesInGrade.some((c) => c.id === classId)) {
      setClassId(classesInGrade[0].id);
    }
  }, [classesInGrade, classId]);

  const classStudents = useMemo(
    () => students.filter((s) => s.classId === classId),
    [students, classId]
  );

  useEffect(() => {
    if (classStudents.length > 0) {
      setPrimaryStudentId(classStudents[0].id);
      setPartnerStudentId(classStudents[1]?.id || '');
    } else {
      setPrimaryStudentId('');
      setPartnerStudentId('');
    }
  }, [classId, classStudents]);

  const handleSelectTenant = (t: SchoolTenant) => {
    setSelectedTenantId(t.id);
    const firstRoom = t.rooms[0]?.id || 'pm-1';
    setSelectedRoomId(firstRoom);
    setActiveTenantContext(t, firstRoom);
    setErrorMsg('');
  };

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!activeTenant) return;
    if (studentPassword.trim() !== (activeTenant.studentDefaultPass || '123')) {
      setErrorMsg(`Mật khẩu không đúng. Mật khẩu mặc định của trường là "${activeTenant.studentDefaultPass || '123'}".`);
      return;
    }
    const primary = classStudents.find((s) => s.id === primaryStudentId);
    if (!primary) {
      setErrorMsg('Vui lòng chọn học sinh ngồi máy trước khi đăng nhập.');
      return;
    }
    const partner =
      partnerStudentId && partnerStudentId !== primaryStudentId
        ? classStudents.find((s) => s.id === partnerStudentId) || null
        : null;

    loginAsStudentSession({
      tenant: activeTenant,
      roomId: selectedRoomId,
      grade,
      machineId,
      primary: {
        id: primary.id,
        code: primary.studentCode,
        name: primary.fullName,
        className: primary.className,
      },
      partner: partner
        ? { id: partner.id, code: partner.studentCode, name: partner.fullName }
        : null,
    });
    router.push('/in-class');
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!activeTenant) return;
    const expected = activeTenant.teacherPasscode || '666';
    if (teacherPasscode.trim() !== expected) {
      setErrorMsg(`Mã khóa giáo viên chưa chính xác (mặc định của ${activeTenant.shortName}: ${expected}).`);
      return;
    }
    loginAsTeacherSession(activeTenant, selectedRoomId);
    router.push('/teacher');
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim() || !newTeacherName.trim()) return;
    const slug = newSchoolName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `school-${Date.now()}`;

    const newTenant: SchoolTenant = {
      id: slug,
      code: slug.toUpperCase().slice(0, 8),
      name: newSchoolName.trim(),
      shortName: newSchoolName.trim().replace(/^Trường\s+/i, ''),
      province: newProvince.trim() || 'Việt Nam',
      teacherName: newTeacherName.trim(),
      teacherEmail: '',
      academicYear: '2025-2026',
      rooms: [{ id: 'pm-1', name: 'Phòng Tin học 1', capacity: 24 }],
      studentDefaultPass: '123',
      teacherPasscode: '666',
      studentCount: 0,
      classCount: 4,
    };

    const updated = await saveTenant(newTenant);
    for (const g of [6, 7, 8, 9] as GradeLevel[]) {
      await saveClassForTenant({
        id: `${slug}-${g}a1`,
        tenantId: slug,
        grade: g,
        name: `Lớp ${g}A1`,
        classCode: `${g}A1`,
        studentCount: 0,
      });
    }
    setTenants(updated);
    handleSelectTenant(newTenant);
    setShowNewTenantModal(false);
    setNewSchoolName('');
    setNewTeacherName('');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] edu-grid-bg py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: PEDAGOGICAL ARCHITECTURE & TENANT PICKER */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="lg:col-span-6 space-y-5"
        >
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="flex items-center gap-3.5">
              <img
                src={getAssetUrl('/images/tin_hoc_so_logo.jpg')}
                alt="Logo Tin học số"
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
              />
              <div>
                <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  Kiến Trúc Multi-Tenant Sư Phạm Chuẩn Hóa
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  HỆ SINH THÁI TIN HỌC SỐ
                </h1>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Nền tảng điều phối phòng máy thực hành 24 máy và quản lý học tập Tin học THCS (Khối 6–9)
              với bộ dữ liệu đầy đủ <strong>116 tiết học</strong>, <strong>812 câu hỏi củng cố</strong> và
              <strong> 8 đề kiểm tra định kỳ</strong>, vận hành trên hạ tầng dữ liệu 0 đồng băng thông rộng.
            </p>

            {/* SYSTEM TELEMETRY STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Học sinh</span>
                </div>
                <div className="text-lg font-extrabold font-mono text-slate-900 mt-0.5 tabular-nums">
                  {activeTenant?.studentCount ?? 670}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PPCT 4 Khối</span>
                </div>
                <div className="text-lg font-extrabold font-mono text-slate-900 mt-0.5 tabular-nums">
                  116 Tiết
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ngân hàng</span>
                </div>
                <div className="text-lg font-extrabold font-mono text-slate-900 mt-0.5 tabular-nums">
                  812 Câu
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  <span>CSDL 0 đồng</span>
                </div>
                <div className="text-lg font-extrabold text-indigo-700 mt-0.5">CDN+IDB</div>
              </div>
            </div>

            {/* MULTI-TENANT SCHOOL PICKER */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-700" />
                  <span>1. Chọn Trường Học (Tenant) &amp; Phòng Máy</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewTenantModal(true)}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Thêm trường mới</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tenants.map((t) => {
                  const isActive = t.id === selectedTenantId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTenant(t)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isActive
                          ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-100'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs text-slate-900 truncate">
                          {t.shortName}
                        </span>
                        {isActive && <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {t.teacherName} · {t.classCount} lớp · {t.studentCount} HS
                      </div>
                    </button>
                  );
                })}
              </div>

              {activeTenant && (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[11px] font-bold text-slate-500">Phòng thực hành:</span>
                  {activeTenant.rooms.map((rm) => (
                    <button
                      key={rm.id}
                      type="button"
                      onClick={() => {
                        setSelectedRoomId(rm.id);
                        setActiveTenantContext(activeTenant, rm.id);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
                        selectedRoomId === rm.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {rm.name} ({rm.capacity} máy)
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: LOGIN CARD */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5"
        >
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100">
            <button
              type="button"
              onClick={() => {
                setRoleTab('student');
                setErrorMsg('');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                roleTab === 'student'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Học Sinh Phòng Máy</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleTab('teacher');
                setErrorMsg('');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                roleTab === 'teacher'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Giáo Viên Phụ Trách</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 font-semibold">
              Đang đồng bộ danh sách lớp học từ dữ liệu CDN...
            </div>
          ) : roleTab === 'student' ? (
            <form onSubmit={handleStudentLogin} className="space-y-4 text-xs">
              <div className="grid grid-cols-4 gap-2">
                {([6, 7, 8, 9] as GradeLevel[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={`py-2 rounded-xl font-extrabold border transition-colors ${
                      grade === g
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Khối {g}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Lớp học</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    {classesInGrade.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.studentCount} HS)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Vị trí máy thực hành</label>
                  <select
                    value={machineId}
                    onChange={(e) => setMachineId(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold"
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        Máy {String(m).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Học sinh 1 (Kỹ thuật viên thao tác máy)
                </label>
                <select
                  value={primaryStudentId}
                  onChange={(e) => setPrimaryStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                >
                  {classStudents.length === 0 ? (
                    <option value="">Chưa có học sinh trong lớp này</option>
                  ) : (
                    classStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.studentCode} — {s.fullName}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Học sinh 2 (Thư ký ngồi cùng cặp đôi · tùy chọn)
                </label>
                <select
                  value={partnerStudentId}
                  onChange={(e) => setPartnerStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
                >
                  <option value="">-- Học cá nhân (1 HS/máy) --</option>
                  {classStudents
                    .filter((s) => s.id !== primaryStudentId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.studentCode} — {s.fullName}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Mật khẩu phòng máy (Mặc định: {activeTenant?.studentDefaultPass || '123'})
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="Nhập 123"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Monitor className="w-4 h-4" />
                <span>Vào Lớp Học Số (Máy {String(machineId).padStart(2, '0')})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleTeacherLogin} className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                <div className="text-[11px] font-bold text-amber-800 uppercase">
                  Tài khoản điều hành trường học
                </div>
                <div className="text-sm font-extrabold text-slate-900">
                  {activeTenant?.teacherName}
                </div>
                <div className="text-slate-600">
                  {activeTenant?.name} · Mã trường:{' '}
                  <span className="font-mono font-bold">{activeTenant?.code}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  Mã khóa giáo viên (Mã thử nghiệm: {activeTenant?.teacherPasscode || '666'})
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={teacherPasscode}
                    onChange={(e) => setTeacherPasscode(e.target.value)}
                    placeholder="Nhập mã khóa 666"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Mở Bàn Điều Phối Giáo Viên</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </motion.div>
      </div>

      {/* CREATE NEW TENANT MODAL */}
      {showNewTenantModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowNewTenantModal(false)}
        >
          <form
            onSubmit={handleCreateTenant}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                Khởi Tạo Trường Mới (Multi-Tenant)
              </h3>
              <button
                type="button"
                onClick={() => setShowNewTenantModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Tên trường THCS</label>
              <input
                type="text"
                required
                value={newSchoolName}
                onChange={(e) => setNewSchoolName(e.target.value)}
                placeholder="Ví dụ: Trường THCS Nguyễn Du"
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Giáo viên phụ trách</label>
              <input
                type="text"
                required
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                placeholder="Ví dụ: Cô Trần Thu Hà"
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Tỉnh / Thành phố</label>
              <input
                type="text"
                value={newProvince}
                onChange={(e) => setNewProvince(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewTenantModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold"
              >
                Khởi tạo không gian trường
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
