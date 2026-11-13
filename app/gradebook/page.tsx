'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Edit3,
  Check,
  X,
  Download,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { getCurrentUser, UserSession } from '@/lib/auth';
import {
  getClassesByTenant,
  getStudentsByTenant,
  getGradebookRecords,
  saveGradebookRecord,
} from '@/lib/domain/data-repository';
import {
  buildBaselineGradeRow,
  computeClassGradeStats,
  updateGradeRowScores,
} from '@/lib/domain/grading-tt22';
import {
  filterAccessibleClassesForUser,
  isTeacherUser,
} from '@/lib/domain/access-control';
import { exportGradebookToExcel } from '@/lib/export-excel';
import { ClassItem, GradeLevel, OfficialGradeRow, Student } from '@/lib/domain/types';
import StudentAuthGate from '@/components/StudentAuthGate';

export default function GradebookPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserSession | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(7);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [semester, setSemester] = useState<'hk1' | 'hk2' | 'year'>('hk1');
  const [savedOverrides, setSavedOverrides] = useState<Record<string, OfficialGradeRow>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draftScores, setDraftScores] = useState<Partial<OfficialGradeRow>>({});

  useEffect(() => {
    setMounted(true);
    const loadForSession = () => {
      const current = getCurrentUser();
      setUser(current);
      if (!current.isLoggedIn) {
        setClasses([]);
        setStudents([]);
        return;
      }

      Promise.all([
        getClassesByTenant(current.tenantId),
        getStudentsByTenant(current.tenantId),
      ]).then(([clsList, stList]) => {
        const accessible = filterAccessibleClassesForUser(current, clsList);
        setClasses(accessible);
        setStudents(stList);

        if (current.role === 'student' && current.studentGrade) {
          setSelectedGrade(current.studentGrade);
          if (accessible[0]) {
            setSelectedClassId(accessible[0].id);
          }
        } else {
          const def = accessible.find((c) => c.grade === 7) || accessible[0];
          if (def) {
            setSelectedGrade(def.grade);
            setSelectedClassId(def.id);
          }
        }
      });
    };

    loadForSession();
    window.addEventListener('thso_session_change', loadForSession);
    return () => window.removeEventListener('thso_session_change', loadForSession);
  }, []);

  useEffect(() => {
    if (!user || !user.isLoggedIn) return;
    getGradebookRecords(user.tenantId, semester).then(setSavedOverrides).catch(() => {});
  }, [user, semester]);

  const classesInGrade = useMemo(
    () => classes.filter((c) => c.grade === selectedGrade),
    [classes, selectedGrade]
  );

  useEffect(() => {
    if (classesInGrade.length > 0 && !classesInGrade.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(classesInGrade[0].id);
    }
  }, [classesInGrade, selectedClassId]);

  const currentClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || classesInGrade[0] || classes[0],
    [classes, selectedClassId, classesInGrade]
  );

  const allClassRows: OfficialGradeRow[] = useMemo(() => {
    if (!currentClass?.id) return [];
    const classStudents = students.filter((s) => s.classId === currentClass.id);
    return classStudents.map(
      (st) => savedOverrides[st.studentCode] || buildBaselineGradeRow(st, semester)
    );
  }, [students, currentClass?.id, savedOverrides, semester]);

  const rows: OfficialGradeRow[] = useMemo(() => {
    const teacher = isTeacherUser(user);
    return allClassRows.filter((r) => {
      if (!teacher) {
        const isSelf = user?.studentCode === r.studentCode;
        const isPartner = Boolean(user?.partnerCode && user.partnerCode === r.studentCode);
        if (!isSelf && !isPartner) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.studentCode.toLowerCase().includes(q)
      );
    });
  }, [allClassRows, user, searchQuery]);

  const stats = useMemo(() => computeClassGradeStats(allClassRows), [allClassRows]);

  const handleSaveRow = async (orig: OfficialGradeRow) => {
    const updated = updateGradeRowScores(orig, {
      tx1: draftScores.tx1 !== undefined ? Number(draftScores.tx1) : orig.tx1,
      tx2: draftScores.tx2 !== undefined ? Number(draftScores.tx2) : orig.tx2,
      tx3: draftScores.tx3 !== undefined ? Number(draftScores.tx3) : orig.tx3,
      tx4: draftScores.tx4 !== undefined ? Number(draftScores.tx4) : orig.tx4,
      gk: draftScores.gk !== undefined ? Number(draftScores.gk) : orig.gk,
      ck: draftScores.ck !== undefined ? Number(draftScores.ck) : orig.ck,
    });
    await saveGradebookRecord(updated);
    setSavedOverrides((prev) => ({ ...prev, [updated.studentCode]: updated }));
    setEditingCode(null);
  };

  const isTeacher = isTeacherUser(user);

  if (!mounted || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-slate-500 font-semibold">
        Đang tải sổ điểm...
      </div>
    );
  }

  if (!user.isLoggedIn) {
    return (
      <StudentAuthGate
        title="Sổ Điểm Môn Tin Học"
        description="Vui lòng đăng nhập tài khoản học sinh hoặc giáo viên để xem bảng điểm theo đúng lớp học của em."
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold text-teal-700 uppercase tracking-wider">
            {user?.tenantName} · Thông tư 22/2021/TT-BGDĐT
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-teal-700" />
            <span>SỔ ĐIỂM MÔN TIN HỌC · {currentClass?.name || user?.studentClass || 'CHỌN LỚP'}</span>
          </h1>
          <p className="text-xs text-slate-600">
            Công thức ĐTBmhk = (TX1 + TX2 + TX3 + TX4 + 2×GK + 3×CK) / 9 · Phụ trách: {user?.teacherName}
          </p>
        </div>

        {isTeacher && (
          <button
            type="button"
            onClick={() =>
              exportGradebookToExcel(
                rows,
                `So_Diem_TT22_${currentClass?.name || 'Lop'}_${semester}.xls`,
                user?.tenantName,
                user?.teacherName,
                currentClass?.name
              )
            }
            className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 self-start lg:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Sổ Điểm Excel</span>
          </button>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[11px] font-semibold text-slate-500">Sĩ số</div>
          <div className="text-xl font-extrabold font-mono text-slate-900 tabular-nums">{stats.total}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[11px] font-semibold text-slate-500">ĐTB Lớp</div>
          <div className="text-xl font-extrabold font-mono text-blue-700 tabular-nums">{stats.avgDtb}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[11px] font-semibold text-emerald-700">Mức Tốt</div>
          <div className="text-xl font-extrabold font-mono text-emerald-700 tabular-nums">{stats.tot}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[11px] font-semibold text-blue-700">Mức Khá</div>
          <div className="text-xl font-extrabold font-mono text-blue-700 tabular-nums">{stats.kha}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-[11px] font-semibold text-amber-700">Đạt / CĐ</div>
          <div className="text-xl font-extrabold font-mono text-amber-700 tabular-nums">
            {stats.dat} / {stats.chuaDat}
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {isTeacher ? (
            <>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(Number(e.target.value) as GradeLevel)}
                className="px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
              >
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
                {classesInGrade.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <span className="px-3 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Khóa theo {currentClass?.name || user?.studentClass}</span>
            </span>
          )}

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl font-bold">
            {(
              [
                { id: 'hk1', label: 'Học kỳ I' },
                { id: 'hk2', label: 'Học kỳ II' },
                { id: 'year', label: 'Cả năm' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSemester(s.id)}
                className={`px-3 py-1 rounded-lg ${
                  semester === s.id ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {isTeacher ? (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm học sinh..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300"
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
            <span>Chế độ bảo mật điểm cá nhân · Chỉ hiển thị bảng điểm của em</span>
          </div>
        )}
      </div>

      {/* GRADEBOOK TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">STT</th>
                <th className="py-3 px-3">Mã HS</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-2 text-center">TX1</th>
                <th className="py-3 px-2 text-center">TX2</th>
                <th className="py-3 px-2 text-center">TX3</th>
                <th className="py-3 px-2 text-center">TX4</th>
                <th className="py-3 px-2 text-center">GK (×2)</th>
                <th className="py-3 px-2 text-center">CK (×3)</th>
                <th className="py-3 px-3 text-center">ĐTB</th>
                <th className="py-3 px-3 text-center">Xếp Loại</th>
                {isTeacher && <th className="py-3 px-3 text-right">Sửa</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, idx) => {
                const editing = editingCode === r.studentCode;
                const isSelf = user?.studentCode === r.studentCode;
                return (
                  <tr
                    key={r.studentCode}
                    className={isSelf ? 'bg-blue-50/70' : 'hover:bg-slate-50/80'}
                  >
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                      {r.studentCode}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{r.fullName}</td>
                    {(['tx1', 'tx2', 'tx3', 'tx4', 'gk', 'ck'] as const).map((field) => (
                      <td key={field} className="py-2.5 px-2 text-center font-mono tabular-nums">
                        {editing ? (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="10"
                            value={draftScores[field] ?? r[field]}
                            onChange={(e) =>
                              setDraftScores((prev) => ({
                                ...prev,
                                [field]: Number(e.target.value),
                              }))
                            }
                            className="w-12 px-1 py-0.5 rounded border border-blue-400 text-center font-mono"
                          />
                        ) : (
                          r[field]
                        )}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center font-mono font-extrabold text-slate-900 tabular-nums">
                      {r.dtb}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          r.rank === 'Tốt'
                            ? 'bg-emerald-50 text-emerald-700'
                            : r.rank === 'Khá'
                            ? 'bg-blue-50 text-blue-700'
                            : r.rank === 'Đạt'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {r.rank}
                      </span>
                    </td>
                    {isTeacher && (
                      <td className="py-2.5 px-3 text-right">
                        {editing ? (
                          <div className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveRow(r)}
                              className="p-1 rounded bg-emerald-600 text-white"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCode(null)}
                              className="p-1 rounded bg-slate-200 text-slate-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCode(r.studentCode);
                              setDraftScores(r);
                            }}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-700"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
