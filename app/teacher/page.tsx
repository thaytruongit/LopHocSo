'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Users,
  ClipboardCheck,
  PlusCircle,
  Lock,
  Unlock,
  CheckCircle2,
  Search,
  FileSpreadsheet,
  ShieldAlert,
  ArrowRight,
  Cloud,
  Trash2,
  Edit3,
  UserPlus,
  X,
  Check,
  Monitor,
} from 'lucide-react';
import { getCurrentUser, UserSession } from '@/lib/auth';
import {
  ClassItem,
  Exam,
  ExamResult,
  GradeLevel,
  OfficialGradeRow,
  Student,
} from '@/lib/domain/types';
import {
  createCustomExamForTenant,
  deleteClassForTenant,
  deleteStudentForTenant,
  getClassesByTenant,
  getExamResults,
  getGradebookRecords,
  getStudentsByTenant,
  getTenantExams,
  saveClassForTenant,
  saveGradebookRecord,
  saveStudentForTenant,
  setExamLockForTenant,
} from '@/lib/domain/data-repository';
import {
  buildBaselineGradeRow,
  computeClassGradeStats,
  updateGradeRowScores,
} from '@/lib/domain/grading-tt22';
import {
  getClassroomState,
  selectClassForClassroom,
  subscribeToClassroomState,
} from '@/lib/classroom-control';
import {
  getGasWebAppUrl,
  setGasWebAppUrl,
  testDriveOnlineConnection,
} from '@/lib/google-drive-service';
import { exportGradebookToExcel, exportStudentsToExcel } from '@/lib/export-excel';
import ClassroomCommandCenter, {
  ClassroomSubTab,
} from '@/components/classroom/ClassroomCommandCenter';

type TeacherTab = 'in-class' | 'class-roster' | 'exams' | 'gradebook';

function TeacherDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [user, setUser] = useState<UserSession | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(7);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TeacherTab>('in-class');
  const [subFeature, setSubFeature] = useState<ClassroomSubTab>('control');
  const [notice, setNotice] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Roster modals
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentDobInput, setStudentDobInput] = useState('2012-05-15');
  const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState<string | null>(null);

  // Exams
  const [exams, setExams] = useState<Exam[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDuration, setNewExamDuration] = useState<number>(45);
  const [newExamType, setNewExamType] = useState<'thường xuyên' | 'giữa kỳ' | 'cuối kỳ'>('giữa kỳ');

  // Gradebook + Drive GAS
  const [semester, setSemester] = useState<'hk1' | 'hk2' | 'year'>('hk1');
  const [savedGrades, setSavedGrades] = useState<Record<string, OfficialGradeRow>>({});
  const [editingGradeCode, setEditingGradeCode] = useState<string | null>(null);
  const [draftScores, setDraftScores] = useState<Partial<OfficialGradeRow>>({});
  const [gasUrl, setGasUrl] = useState<string>('');
  const [gasStatus, setGasStatus] = useState<string>('');

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  useEffect(() => {
    const current = getCurrentUser();
    setUser(current);
    setGasUrl(getGasWebAppUrl(current.tenantId));

    const roomState = getClassroomState(current.tenantId, current.roomId);
    if (roomState.activeGrade) setSelectedGrade(roomState.activeGrade);
    if (roomState.activeClassId) setSelectedClassId(roomState.activeClassId);

    Promise.all([
      getClassesByTenant(current.tenantId),
      getStudentsByTenant(current.tenantId),
      getTenantExams(current.tenantId),
      getExamResults(current.tenantId),
    ]).then(([clsList, stList, exList, resList]) => {
      setClasses(clsList);
      setStudents(stList);
      setExams(exList);
      setExamResults(resList);
      if (!roomState.activeClassId && clsList[0]) {
        setSelectedClassId(clsList[0].id);
        setSelectedGrade(clsList[0].grade);
      }
    });

    const unsub = subscribeToClassroomState(
      (st) => {
        if (st.activeClassId) setSelectedClassId(st.activeClassId);
        if (st.activeGrade) setSelectedGrade(st.activeGrade);
      },
      current.tenantId,
      current.roomId
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    getGradebookRecords(user.tenantId, semester).then(setSavedGrades).catch(() => {});
  }, [user, semester]);

  useEffect(() => {
    const t = searchParams.get('tab');
    const s = searchParams.get('sub') as ClassroomSubTab | null;
    if (t === 'class-roster' || t === 'exams' || t === 'gradebook' || t === 'in-class') {
      setActiveTab(t);
    }
    if (s) setSubFeature(s);
  }, [searchParams]);

  useEffect(() => {
    const onTabSwitch = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === 'class-roster' || detail === 'exams' || detail === 'gradebook' || detail === 'in-class') {
        setActiveTab(detail);
      }
    };
    window.addEventListener('thso_tab_switch', onTabSwitch);
    return () => window.removeEventListener('thso_tab_switch', onTabSwitch);
  }, []);

  const currentClass = useMemo(() => {
    return (
      classes.find((c) => c.id === selectedClassId) ||
      classes.find((c) => c.grade === selectedGrade) ||
      classes[0]
    );
  }, [classes, selectedClassId, selectedGrade]);

  const classStudents = useMemo(() => {
    if (!currentClass) return [];
    return students.filter((s) => s.classId === currentClass.id);
  }, [students, currentClass]);

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return classStudents;
    return classStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        (s.dob && s.dob.includes(q))
    );
  }, [classStudents, searchTerm]);

  const gradebookRows = useMemo(() => {
    return classStudents.map(
      (st) => savedGrades[st.studentCode] || buildBaselineGradeRow(st, semester)
    );
  }, [classStudents, savedGrades, semester]);

  const gradeStats = useMemo(() => computeClassGradeStats(gradebookRows), [gradebookRows]);

  if (user && user.role === 'student') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Khu Vực Dành Riêng Cho Giáo Viên
        </h1>
        <p className="text-xs text-slate-600">
          Tài khoản học sinh <strong>{user.studentName}</strong> chỉ thao tác trong Không gian Lớp Học Số.
        </p>
        <Link
          href="/in-class"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold"
        >
          <span>Quay về Lớp Học Số</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (!currentClass || !user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-xs text-slate-500">
        Đang tải dữ liệu giáo viên...
      </div>
    );
  }

  const switchTab = (tab: TeacherTab) => {
    setActiveTab(tab);
    router.push(`/teacher?tab=${tab}`, { scroll: false });
  };

  const handleSelectClass = async (cls: ClassItem) => {
    setSelectedClassId(cls.id);
    setSelectedGrade(cls.grade);
    await selectClassForClassroom(cls.id, cls.name, cls.grade);
    showToast(`Đã chuyển điều phối sang ${cls.name} (Khối ${cls.grade}).`);
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const formatted = newClassName.trim().startsWith('Lớp')
      ? newClassName.trim()
      : `Lớp ${newClassName.trim()}`;
    const newCls: ClassItem = {
      id: `${user.tenantId}-${Date.now()}`,
      tenantId: user.tenantId,
      grade: selectedGrade,
      name: formatted,
      classCode: formatted.replace('Lớp ', ''),
      studentCount: 0,
    };
    const updated = await saveClassForTenant(newCls);
    setClasses(updated);
    setShowAddClass(false);
    setNewClassName('');
    await handleSelectClass(newCls);
  };

  const handleDeleteClass = async () => {
    if (classes.length <= 1) return;
    const remaining = await deleteClassForTenant(user.tenantId, currentClass.id);
    setClasses(remaining);
    if (remaining[0]) await handleSelectClass(remaining[0]);
    showToast(`Đã xóa ${currentClass.name}.`);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNameInput.trim()) return;

    if (editingStudent) {
      const updatedSt: Student = {
        ...editingStudent,
        fullName: studentNameInput.trim(),
        dob: studentDobInput,
      };
      const all = await saveStudentForTenant(updatedSt);
      setStudents(all);
      setEditingStudent(null);
      showToast(`Đã cập nhật ${updatedSt.fullName}.`);
    } else {
      const nextNum = classStudents.length + 1;
      const code = `${currentClass.classCode}${String(nextNum).padStart(2, '0')}`;
      const created: Student = {
        id: `${user.tenantId}-st-${Date.now()}`,
        tenantId: user.tenantId,
        classId: currentClass.id,
        className: currentClass.name,
        studentCode: code,
        fullName: studentNameInput.trim(),
        dob: studentDobInput,
        totalXp: 100,
        level: 1,
        streakDays: 1,
        completedTasks: 0,
        averageGrade: 8.5,
        progressScore: 8.5,
        contributionScore: 8.0,
        badgesCount: 1,
      };
      const all = await saveStudentForTenant(created);
      setStudents(all);
      await saveClassForTenant({
        ...currentClass,
        studentCount: classStudents.length + 1,
      });
      setShowAddStudent(false);
      showToast(`Đã thêm học sinh ${created.fullName} (Mã ${created.studentCode}).`);
    }
    setStudentNameInput('');
  };

  const handleDeleteStudent = async (st: Student) => {
    const all = await deleteStudentForTenant(user.tenantId, st.id);
    setStudents(all);
    setConfirmDeleteStudentId(null);
    showToast(`Đã xóa ${st.fullName} khỏi ${currentClass.name}.`);
  };

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim()) return;
    const newEx: Exam = {
      id: `exam-${Date.now()}`,
      grade: selectedGrade,
      title: newExamTitle.trim(),
      examType: newExamType,
      durationMin: newExamDuration,
      questionsCount: 20,
      questions: [],
      isLocked: false,
    };
    createCustomExamForTenant(user.tenantId, newEx);
    setExams((prev) => [newEx, ...prev]);
    setShowCreateExam(false);
    setNewExamTitle('');
    showToast(`Đã tạo đề "${newEx.title}".`);
  };

  const handleSaveGradeRow = async (orig: OfficialGradeRow) => {
    const updated = updateGradeRowScores(orig, {
      tx1: draftScores.tx1 ?? orig.tx1,
      tx2: draftScores.tx2 ?? orig.tx2,
      tx3: draftScores.tx3 ?? orig.tx3,
      tx4: draftScores.tx4 ?? orig.tx4,
      gk: draftScores.gk ?? orig.gk,
      ck: draftScores.ck ?? orig.ck,
    });
    await saveGradebookRecord(updated);
    setSavedGrades((prev) => ({ ...prev, [updated.studentCode]: updated }));
    setEditingGradeCode(null);
    showToast(`Đã lưu điểm TT22 của ${updated.fullName} (${updated.dtb}đ - ${updated.rank}).`);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-5">
      {notice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* TOP TAB SWITCHER + QUICK CLASS BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'in-class', label: 'Lớp Học Số', icon: Monitor },
              { id: 'class-roster', label: 'Lớp & Học Sinh', icon: Users },
              { id: 'exams', label: 'Bài Kiểm Tra', icon: ClipboardCheck },
              { id: 'gradebook', label: 'Sổ Điểm & Drive', icon: FileSpreadsheet },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => switchTab(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  activeTab === t.id
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedGrade}
            onChange={(e) => {
              const g = Number(e.target.value) as GradeLevel;
              setSelectedGrade(g);
              const first = classes.find((c) => c.grade === g);
              if (first) handleSelectClass(first);
            }}
            className="px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
          >
            {[6, 7, 8, 9].map((g) => (
              <option key={g} value={g}>
                Khối {g}
              </option>
            ))}
          </select>

          <select
            value={currentClass.id}
            onChange={(e) => {
              const cls = classes.find((c) => c.id === e.target.value);
              if (cls) handleSelectClass(cls);
            }}
            className="px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
          >
            {classes
              .filter((c) => c.grade === selectedGrade)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* TAB 1: IN-CLASS COMMAND CENTER */}
      {activeTab === 'in-class' && (
        <ClassroomCommandCenter
          currentClass={currentClass}
          classStudents={classStudents}
          initialSubFeature={subFeature}
        />
      )}

      {/* TAB 2: CLASS & ROSTER MANAGEMENT */}
      {activeTab === 'class-roster' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Danh Sách Học Sinh {currentClass.name} ({classStudents.length} HS)
              </h2>
              <p className="text-xs text-slate-500">
                {user.tenantName} · Mật khẩu mặc định phòng máy: 123
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowAddClass(true)}
                className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-700" />
                <span>Thêm lớp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingStudent(null);
                  setStudentNameInput('');
                  setShowAddStudent(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Thêm học sinh</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportStudentsToExcel(
                    classStudents,
                    `Danh_Sach_${currentClass.name}.xls`,
                    user.tenantName,
                    user.teacherName
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xuất Excel</span>
              </button>
              {classes.length > 1 && (
                <button
                  type="button"
                  onClick={handleDeleteClass}
                  className="px-3 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold"
                >
                  Xóa lớp
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên hoặc mã HS..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div className="text-xs text-slate-500 font-semibold">
                Hiển thị {filteredStudents.length} / {classStudents.length} học sinh
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">STT</th>
                    <th className="py-3 px-3">Mã HS</th>
                    <th className="py-3 px-4">Họ và Tên</th>
                    <th className="py-3 px-3 text-center">Ngày Sinh</th>
                    <th className="py-3 px-3 text-center">XP</th>
                    <th className="py-3 px-3 text-center">TB Môn</th>
                    <th className="py-3 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((st, idx) => (
                    <tr key={st.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                        {st.studentCode}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{st.fullName}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                        {st.dob || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600 tabular-nums">
                        {st.totalXp}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-extrabold text-emerald-700 tabular-nums">
                        {st.averageGrade}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {confirmDeleteStudentId === st.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(st)}
                              className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold"
                            >
                              Xác nhận xóa
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteStudentId(null)}
                              className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-[10px] font-bold"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStudent(st);
                                setStudentNameInput(st.fullName);
                                setStudentDobInput(st.dob || '2012-05-15');
                                setShowAddStudent(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-700"
                              title="Chỉnh sửa"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteStudentId(st.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXAMS */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Ngân Hàng Đề Kiểm Tra · Khối {selectedGrade}
              </h2>
              <p className="text-xs text-slate-500">
                Khóa/mở quyền làm bài trực tuyến và theo dõi kết quả đã nộp.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateExam(true)}
              className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tạo đề kiểm tra mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams
              .filter((e) => e.grade === selectedGrade)
              .map((ex) => (
                <div
                  key={ex.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-[11px] font-bold text-purple-700 uppercase">
                      {ex.examType} · {ex.durationMin} phút · {ex.questionsCount} câu
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">{ex.title}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextLock = !ex.isLocked;
                      setExamLockForTenant(user.tenantId, ex.id, nextLock);
                      setExams((prev) =>
                        prev.map((item) =>
                          item.id === ex.id ? { ...item, isLocked: nextLock } : item
                        )
                      );
                      showToast(`Đã ${nextLock ? 'KHÓA' : 'MỞ'} đề "${ex.title}".`);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                      ex.isLocked
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {ex.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{ex.isLocked ? 'Đang khóa' : 'Đang mở'}</span>
                  </button>
                </div>
              ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">
              Kết Quả Nộp Bài Kiểm Tra Gần Đây ({examResults.length})
            </h3>
            {examResults.length === 0 ? (
              <p className="text-xs text-slate-500">Chưa có bài kiểm tra nào được nộp.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {examResults.slice(0, 15).map((r) => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-slate-900">{r.studentName}</span>{' '}
                      <span className="text-slate-500">({r.className})</span> ·{' '}
                      <span className="text-blue-700 font-semibold">{r.examTitle}</span>
                    </div>
                    <div className="font-mono font-extrabold text-emerald-700 tabular-nums">
                      {r.score}đ ({r.correctCount}/{r.totalQuestions})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: GRADEBOOK & DRIVE CONFIG */}
      {activeTab === 'gradebook' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-blue-700" />
                  <span>Cầu Nối Lưu Trữ Google Drive / Apps Script (Miễn Phí 0 Đồng)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Mỗi trường có thể gắn URL Web App Apps Script riêng để tự động phân loại bài nộp theo thư mục trường.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 text-xs">
              <input
                type="url"
                value={gasUrl}
                onChange={(e) => setGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono"
              />
              <button
                type="button"
                onClick={async () => {
                  setGasWebAppUrl(gasUrl, user.tenantId);
                  const res = await testDriveOnlineConnection(gasUrl);
                  setGasStatus(res.message);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold shrink-0"
              >
                Lưu &amp; Kiểm Tra Kết Nối
              </button>
            </div>
            {gasStatus && (
              <div className="text-xs font-semibold text-blue-700">{gasStatus}</div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Sổ Điểm TT22 · {currentClass.name} (ĐTB: {gradeStats.avgDtb})
                </h3>
                <p className="text-xs text-slate-500">
                  Tốt: {gradeStats.tot} · Khá: {gradeStats.kha} · Đạt: {gradeStats.dat} · Chưa đạt:{' '}
                  {gradeStats.chuaDat}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {(['hk1', 'hk2', 'year'] as const).map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setSemester(sem)}
                    className={`px-3 py-1.5 rounded-xl font-bold ${
                      semester === sem
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {sem === 'hk1' ? 'HK I' : sem === 'hk2' ? 'HK II' : 'Cả năm'}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    exportGradebookToExcel(
                      gradebookRows,
                      `So_Diem_${currentClass.name}_${semester}.xls`,
                      user.tenantName,
                      user.teacherName,
                      currentClass.name
                    )
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-teal-700 text-white font-bold flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Xuất Excel</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Mã HS</th>
                    <th className="py-2.5 px-4">Họ và Tên</th>
                    <th className="py-2.5 px-2 text-center">TX1</th>
                    <th className="py-2.5 px-2 text-center">TX2</th>
                    <th className="py-2.5 px-2 text-center">TX3</th>
                    <th className="py-2.5 px-2 text-center">TX4</th>
                    <th className="py-2.5 px-2 text-center">GK</th>
                    <th className="py-2.5 px-2 text-center">CK</th>
                    <th className="py-2.5 px-3 text-center">ĐTB</th>
                    <th className="py-2.5 px-3 text-center">Loại</th>
                    <th className="py-2.5 px-3 text-right">Sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradebookRows.map((r) => {
                    const editing = editingGradeCode === r.studentCode;
                    return (
                      <tr key={r.studentCode} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                          {r.studentCode}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{r.fullName}</td>
                        {(['tx1', 'tx2', 'tx3', 'tx4', 'gk', 'ck'] as const).map((f) => (
                          <td key={f} className="py-2.5 px-2 text-center font-mono tabular-nums">
                            {editing ? (
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="10"
                                value={draftScores[f] ?? r[f]}
                                onChange={(e) =>
                                  setDraftScores((p) => ({
                                    ...p,
                                    [f]: Number(e.target.value),
                                  }))
                                }
                                className="w-12 px-1 py-0.5 rounded border border-blue-400 text-center"
                              />
                            ) : (
                              r[f]
                            )}
                          </td>
                        ))}
                        <td className="py-2.5 px-3 text-center font-mono font-extrabold tabular-nums">
                          {r.dtb}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">{r.rank}</td>
                        <td className="py-2.5 px-3 text-right">
                          {editing ? (
                            <button
                              type="button"
                              onClick={() => handleSaveGradeRow(r)}
                              className="p-1 rounded bg-emerald-600 text-white"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGradeCode(r.studentCode);
                                setDraftScores(r);
                              }}
                              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-700"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADD CLASS MODAL */}
      {showAddClass && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          onClick={() => setShowAddClass(false)}
        >
          <form
            onSubmit={handleAddClass}
            className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900">
                Thêm Lớp Mới (Khối {selectedGrade})
              </h3>
              <button type="button" onClick={() => setShowAddClass(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <input
              type="text"
              required
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder={`Ví dụ: ${selectedGrade}A15`}
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddClass(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 font-bold"
              >
                Hủy
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold">
                Lưu lớp
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD / EDIT STUDENT MODAL */}
      {showAddStudent && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          onClick={() => setShowAddStudent(false)}
        >
          <form
            onSubmit={handleSaveStudent}
            className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900">
                {editingStudent ? 'Sửa Học Sinh' : `Thêm Học Sinh Vào ${currentClass.name}`}
              </h3>
              <button type="button" onClick={() => setShowAddStudent(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <input
              type="text"
              required
              value={studentNameInput}
              onChange={(e) => setStudentNameInput(e.target.value)}
              placeholder="Họ và tên học sinh..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
            <input
              type="date"
              value={studentDobInput}
              onChange={(e) => setStudentDobInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddStudent(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 font-bold"
              >
                Hủy
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-blue-700 text-white font-bold">
                Lưu thông tin
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE EXAM MODAL */}
      {showCreateExam && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          onClick={() => setShowCreateExam(false)}
        >
          <form
            onSubmit={handleCreateExam}
            className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900">
                Tạo Đề Kiểm Tra (Khối {selectedGrade})
              </h3>
              <button type="button" onClick={() => setShowCreateExam(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <input
              type="text"
              required
              value={newExamTitle}
              onChange={(e) => setNewExamTitle(e.target.value)}
              placeholder="Tên đề kiểm tra..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newExamType}
                onChange={(e) => setNewExamType(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-300"
              >
                <option value="thường xuyên">Thường xuyên</option>
                <option value="giữa kỳ">Giữa kỳ</option>
                <option value="cuối kỳ">Cuối kỳ</option>
              </select>
              <input
                type="number"
                min={5}
                max={90}
                value={newExamDuration}
                onChange={(e) => setNewExamDuration(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-slate-300 font-mono"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateExam(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 font-bold"
              >
                Hủy
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-purple-700 text-white font-bold">
                Tạo đề
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function TeacherPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-16 text-center text-xs text-slate-500">
          Đang mở Bàn Điều Hành Giáo Viên...
        </div>
      }
    >
      <TeacherDashboardContent />
    </Suspense>
  );
}
