'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  Search,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  PlusCircle,
  RefreshCw,
  BookOpen,
  Layers,
  X,
} from 'lucide-react';
import { getActiveTenantContext, setActiveTenantContext } from '@/lib/auth';
import {
  getAllExams,
  getClassesByTenant,
  getCurriculumByGrade,
  getStudentsByTenant,
  getTenants,
  resetTenantDemoState,
  saveClassForTenant,
  saveTenant,
} from '@/lib/domain/data-repository';
import { exportStudentsToExcel } from '@/lib/export-excel';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getAssetUrl } from '@/lib/asset-path';
import { ClassItem, GradeLevel, SchoolTenant, Student } from '@/lib/domain/types';

export default function AdminPage() {
  const [tenants, setTenants] = useState<SchoolTenant[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string>('mao-dien');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [periodsCount, setPeriodsCount] = useState<number>(116);
  const [questionsCount, setQuestionsCount] = useState<number>(812);
  const [examsCount, setExamsCount] = useState<number>(8);

  const [selectedGrade, setSelectedGrade] = useState<'all' | GradeLevel>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notice, setNotice] = useState<string>('');

  // Create Tenant Modal
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [province, setProvince] = useState('Bắc Ninh');

  const notify = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  const loadTenantData = async (tId: string) => {
    const [clsList, stList] = await Promise.all([
      getClassesByTenant(tId),
      getStudentsByTenant(tId),
    ]);
    setClasses(clsList);
    setStudents(stList);
  };

  useEffect(() => {
    const ctx = getActiveTenantContext();
    setActiveTenantId(ctx.tenantId);

    getTenants().then(setTenants);
    loadTenantData(ctx.tenantId);

    Promise.all([
      getCurriculumByGrade(6),
      getCurriculumByGrade(7),
      getCurriculumByGrade(8),
      getCurriculumByGrade(9),
      getAllExams(),
    ]).then(([c6, c7, c8, c9, ex]) => {
      const allP = [...c6, ...c7, ...c8, ...c9];
      setPeriodsCount(allP.length);
      setQuestionsCount(
        allP.reduce((acc, p) => acc + (p.reinforcement?.questions?.length || 0), 0)
      );
      setExamsCount(ex.length);
    });
  }, []);

  const activeTenant = useMemo(
    () => tenants.find((t) => t.id === activeTenantId) || tenants[0],
    [tenants, activeTenantId]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      if (selectedGrade !== 'all') {
        const matchCls = classes.find((c) => c.id === st.classId);
        if (!matchCls || matchCls.grade !== selectedGrade) return false;
      }
      if (selectedClassId !== 'all' && st.classId !== selectedClassId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          st.fullName.toLowerCase().includes(q) ||
          st.studentCode.toLowerCase().includes(q) ||
          st.className.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, classes, selectedGrade, selectedClassId, searchQuery]);

  const handleSwitchTenant = async (t: SchoolTenant) => {
    setActiveTenantId(t.id);
    setActiveTenantContext(t, t.rooms[0]?.id);
    setSelectedClassId('all');
    await loadTenantData(t.id);
    notify(`Đã chuyển không gian quản trị sang ${t.name}.`);
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim() || !teacherName.trim()) return;
    const slug =
      schoolName
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `school-${Date.now()}`;

    const newT: SchoolTenant = {
      id: slug,
      code: slug.toUpperCase().slice(0, 8),
      name: schoolName.trim(),
      shortName: schoolName.trim().replace(/^Trường\s+/i, ''),
      province: province.trim() || 'Việt Nam',
      teacherName: teacherName.trim(),
      teacherEmail: '',
      academicYear: '2025-2026',
      rooms: [{ id: 'pm-1', name: 'Phòng Tin học 1', capacity: 24 }],
      studentDefaultPass: '123',
      teacherPasscode: '666',
      studentCount: 0,
      classCount: 4,
    };

    const next = await saveTenant(newT);
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
    setTenants(next);
    setShowCreateTenant(false);
    setSchoolName('');
    setTeacherName('');
    await handleSwitchTenant(newT);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* ADMIN HEADER BANNER WITH LOGO */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={getAssetUrl('/images/tin_hoc_so_logo.jpg')}
            alt="Logo Tin học số"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-slate-700 shrink-0 bg-white"
          />
          <div className="space-y-1">
            <div className="text-xs font-bold text-blue-300 uppercase tracking-wider">
              Quản Trị Hệ Thống · Kiến Trúc Multi-Tenant Sư Phạm
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              TIN HỌC SỐ · {activeTenant?.name || 'ĐANG TẢI...'}
            </h1>
            <p className="text-xs text-slate-300">
              Phụ trách: <strong>{activeTenant?.teacherName}</strong> · Năm học{' '}
              {activeTenant?.academicYear || '2025-2026'} · {students.length} học sinh /{' '}
              {classes.length} lớp
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowCreateTenant(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Thêm Trường (Tenant)</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              await resetTenantDemoState(activeTenantId);
              await loadTenantData(activeTenantId);
              notify('Đã làm mới dữ liệu chuẩn từ CDN Shards vào IndexedDB.');
            }}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Đồng bộ lại CDN</span>
          </button>
        </div>
      </div>

      {/* INFRASTRUCTURE AUDIT KPI STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-700" />
            <span>Học Sinh Tenant Hiện Tại</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
            {students.length} HS
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{classes.length} lớp học 4 khối</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-emerald-700" />
            <span>Học Liệu PPCT Chuẩn</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
            {periodsCount} Tiết
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">29 tiết × 4 khối (6–9)</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-amber-600" />
            <span>Ngân Hàng Câu Hỏi</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
            {questionsCount} Câu
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">+ {examsCount} đề kiểm tra định kỳ</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-indigo-700" />
            <span>Hạ Tầng CSDL 0 Đồng</span>
          </div>
          <div className="text-lg font-extrabold text-indigo-700 mt-1">
            CDN Shard + IndexedDB
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Supabase Realtime: {isSupabaseConfigured ? 'Đã kích hoạt' : 'Chế độ cục bộ / GAS'}
          </div>
        </div>
      </div>

      {/* TENANT SWITCHER CARDS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-700" />
          <span>Danh Sách Trường Học Độc Lập (Tenants: {tenants.length})</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tenants.map((t) => {
            const active = t.id === activeTenantId;
            return (
              <div
                key={t.id}
                onClick={() => handleSwitchTenant(t)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  active
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-100'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">{t.name}</span>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {t.code}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {t.teacherName} · {t.province}
                </div>
                <div className="text-[11px] text-slate-500 mt-2 font-mono">
                  {t.rooms.length} phòng máy · {t.classCount} lớp · {t.studentCount} HS
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FULL STUDENT DIRECTORY */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Danh Bạ Học Sinh Toàn Trường ({filteredStudents.length} / {students.length} HS)
            </h2>
            <p className="text-xs text-slate-500">
              Hiển thị đồng bộ theo tenant <strong>{activeTenant?.shortName}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={selectedGrade}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedGrade(v === 'all' ? 'all' : (Number(v) as GradeLevel));
                setSelectedClassId('all');
              }}
              className="px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
            >
              <option value="all">Tất cả khối</option>
              {[6, 7, 8, 9].map((g) => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>

            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
            >
              <option value="all">Tất cả lớp</option>
              {classes
                .filter((c) => selectedGrade === 'all' || c.grade === selectedGrade)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>

            <div className="relative w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã HS hoặc tên..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                exportStudentsToExcel(
                  filteredStudents,
                  `Danh_Ba_${activeTenant?.code || 'THCS'}.xls`,
                  activeTenant?.name,
                  activeTenant?.teacherName
                )
              }
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[520px] overflow-y-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0">
              <tr>
                <th className="py-3 px-3 text-center w-14">STT</th>
                <th className="py-3 px-3">Mã HS</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-3">Lớp</th>
                <th className="py-3 px-3 text-center">Ngày Sinh</th>
                <th className="py-3 px-3 text-right">Điểm XP</th>
                <th className="py-3 px-4 text-right">TB Môn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((st, idx) => (
                <tr key={st.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-center font-mono text-slate-400 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                    {st.studentCode}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">{st.fullName}</td>
                  <td className="py-2.5 px-3">{st.className}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                    {st.dob || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600 tabular-nums">
                    {st.totalXp}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-extrabold text-emerald-700 tabular-nums">
                    {st.averageGrade}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE TENANT MODAL */}
      {showCreateTenant && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          onClick={() => setShowCreateTenant(false)}
        >
          <form
            onSubmit={handleCreateTenant}
            className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 text-xs border border-slate-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                Thêm Trường Mới (Multi-Tenant)
              </h3>
              <button type="button" onClick={() => setShowCreateTenant(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <input
              type="text"
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Tên trường (vd: Trường THCS Lê Quý Đôn)"
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
            <input
              type="text"
              required
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="Giáo viên phụ trách"
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
            <input
              type="text"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder="Tỉnh / Thành phố"
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateTenant(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 font-bold"
              >
                Hủy
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold">
                Khởi tạo Tenant
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
