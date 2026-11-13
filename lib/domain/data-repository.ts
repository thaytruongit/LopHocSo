'use client';

import { getAssetUrl } from '@/lib/asset-path';
import {
  Badge,
  ClassItem,
  CurriculumPeriod,
  Exam,
  ExamResult,
  GradeLevel,
  HomeworkSubmission,
  OfficialGradeRow,
  PracticalSubmission,
  PracticeFile,
  SchoolTenant,
  Student,
  VideoLecture,
} from './types';
import { idbBulkPut, idbDelete, idbGet, idbGetAll, idbPut } from '@/lib/storage/indexed-db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

const SEED_VERSION = '2026-mt-v3';

// In-memory hot cache for sub-millisecond reads after initial shard fetch
let tenantsCache: SchoolTenant[] | null = null;
let classesCache: ClassItem[] | null = null;
let studentsCache: Student[] | null = null;
const curriculumCache = new Map<GradeLevel, CurriculumPeriod[]>();
let examsCache: Exam[] | null = null;
let resourcesCache: {
  badges: Badge[];
  practiceFiles: PracticeFile[];
  videos: VideoLecture[];
  homeworkSubmissions: HomeworkSubmission[];
} | null = null;
let seedingPromise: Promise<void> | null = null;

async function fetchJson<T>(publicPath: string): Promise<T> {
  const res = await fetch(getAssetUrl(publicPath));
  if (!res.ok) {
    throw new Error(`Không thể tải dữ liệu tĩnh: ${publicPath} (${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function ensureSeeded(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (seedingPromise) return seedingPromise;

  seedingPromise = (async () => {
    try {
      const meta = await idbGet<{ id: string; version: string }>('kv_meta', 'seed_version');
      if (meta?.version === SEED_VERSION) {
        const existingStudents = await idbGetAll<Student>('students');
        if (existingStudents.length > 0 && existingStudents[0]?.classId && existingStudents[0]?.fullName) {
          return;
        }
      }

      const [tenants, classes, students, resources] = await Promise.all([
        fetchJson<SchoolTenant[]>('/data/tenants.json'),
        fetchJson<ClassItem[]>('/data/classes.json'),
        fetchJson<Student[]>('/data/students.json'),
        fetchJson<{
          badges: Badge[];
          practiceFiles: PracticeFile[];
          videos: VideoLecture[];
          homeworkSubmissions: HomeworkSubmission[];
        }>('/data/resources.json'),
      ]);

      await Promise.all([
        idbBulkPut('tenants', tenants),
        idbBulkPut('classes', classes),
        idbBulkPut('students', students),
        idbBulkPut('homework_submissions', resources.homeworkSubmissions || []),
        idbPut('kv_meta', { id: 'seed_version', version: SEED_VERSION }),
      ]);

      tenantsCache = tenants;
      classesCache = classes;
      studentsCache = students;
      resourcesCache = resources;
    } finally {
      seedingPromise = null;
    }
  })();

  return seedingPromise;
}

export async function getTenants(): Promise<SchoolTenant[]> {
  if (tenantsCache) return tenantsCache;
  await ensureSeeded();
  const stored = await idbGetAll<SchoolTenant>('tenants');
  if (stored.length > 0) {
    tenantsCache = stored;
    return stored;
  }
  const fresh = await fetchJson<SchoolTenant[]>('/data/tenants.json');
  tenantsCache = fresh;
  return fresh;
}

export async function saveTenant(tenant: SchoolTenant): Promise<SchoolTenant[]> {
  await ensureSeeded();
  await idbPut('tenants', tenant);
  const all = await idbGetAll<SchoolTenant>('tenants');
  tenantsCache = all;

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('schools').upsert({
        id: tenant.id,
        code: tenant.code,
        name: tenant.name,
        short_name: tenant.shortName,
        province: tenant.province,
        teacher_name: tenant.teacherName,
        teacher_email: tenant.teacherEmail,
        academic_year: tenant.academicYear,
      });
    } catch {
      // Non-blocking fallback
    }
  }
  return all;
}

export async function getClassesByTenant(tenantId: string): Promise<ClassItem[]> {
  if (!classesCache) {
    await ensureSeeded();
    const stored = await idbGetAll<ClassItem>('classes');
    classesCache = stored.length > 0 ? stored : await fetchJson<ClassItem[]>('/data/classes.json');
  }
  return classesCache.filter((c) => c.tenantId === tenantId);
}

export async function saveClassForTenant(cls: ClassItem): Promise<ClassItem[]> {
  await ensureSeeded();
  await idbPut('classes', cls);
  const all = await idbGetAll<ClassItem>('classes');
  classesCache = all;
  return all.filter((c) => c.tenantId === cls.tenantId);
}

export async function deleteClassForTenant(tenantId: string, classId: string): Promise<ClassItem[]> {
  await ensureSeeded();
  await idbDelete('classes', classId);
  const all = await idbGetAll<ClassItem>('classes');
  classesCache = all;
  return all.filter((c) => c.tenantId === tenantId);
}

export async function getStudentsByTenant(tenantId: string): Promise<Student[]> {
  if (!studentsCache) {
    await ensureSeeded();
    const stored = await idbGetAll<Student>('students');
    studentsCache = stored.length > 0 ? stored : await fetchJson<Student[]>('/data/students.json');
  }
  return studentsCache.filter((s) => s.tenantId === tenantId);
}

export async function saveStudentForTenant(student: Student): Promise<Student[]> {
  await ensureSeeded();
  await idbPut('students', student);
  const all = await idbGetAll<Student>('students');
  studentsCache = all;
  return all.filter((s) => s.tenantId === student.tenantId);
}

export async function deleteStudentForTenant(tenantId: string, studentId: string): Promise<Student[]> {
  await ensureSeeded();
  await idbDelete('students', studentId);
  const all = await idbGetAll<Student>('students');
  studentsCache = all;
  return all.filter((s) => s.tenantId === tenantId);
}

export async function getCurriculumByGrade(grade: GradeLevel): Promise<CurriculumPeriod[]> {
  const cached = curriculumCache.get(grade);
  if (cached) return cached;
  const periods = await fetchJson<CurriculumPeriod[]>(`/data/curriculum/grade-${grade}.json`);
  curriculumCache.set(grade, periods);
  return periods;
}

export async function getAllExams(): Promise<Exam[]> {
  if (examsCache) return examsCache;
  const exams = await fetchJson<Exam[]>('/data/exams.json');
  examsCache = exams;
  return exams;
}

export async function getResources(): Promise<{
  badges: Badge[];
  practiceFiles: PracticeFile[];
  videos: VideoLecture[];
}> {
  if (resourcesCache) return resourcesCache;
  const res = await fetchJson<{
    badges: Badge[];
    practiceFiles: PracticeFile[];
    videos: VideoLecture[];
    homeworkSubmissions: HomeworkSubmission[];
  }>('/data/resources.json');
  resourcesCache = res;
  return res;
}

// ============================================================================
// SUBMISSIONS & GRADEBOOK (SCOPED BY TENANT ID)
// ============================================================================

export async function getHomeworkSubmissions(tenantId: string): Promise<HomeworkSubmission[]> {
  await ensureSeeded();
  const all = await idbGetAll<HomeworkSubmission>('homework_submissions');
  return all
    .filter((h) => h.tenantId === tenantId)
    .sort((a, b) => (b.id > a.id ? 1 : -1));
}

export async function saveHomeworkSubmission(sub: HomeworkSubmission): Promise<void> {
  await idbPut('homework_submissions', sub);
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('homework_submissions').upsert({
        id: sub.id,
        school_id: sub.tenantId,
        period_id: `k${sub.grade}-p${String(sub.period).padStart(2, '0')}`,
        student_code: sub.studentCode,
        student_name: sub.studentName,
        class_name: sub.className,
        grade: sub.grade,
        submission_type: sub.fileType === 'image' ? 'image' : sub.fileType === 'docx' ? 'docx' : sub.fileType === 'xlsx' ? 'xlsx' : 'text',
        file_url: sub.driveUrl || sub.fileName,
        file_name: sub.fileName,
        notes: sub.note || '',
        score: sub.score ?? null,
        teacher_feedback: sub.feedback || '',
      });
    } catch {
      // Keep local IndexedDB record safely
    }
  }
}

export async function getPracticalSubmissions(tenantId: string): Promise<PracticalSubmission[]> {
  const all = await idbGetAll<PracticalSubmission>('practical_submissions');
  return all.filter((p) => p.tenantId === tenantId);
}

export async function savePracticalSubmission(sub: PracticalSubmission): Promise<void> {
  await idbPut('practical_submissions', sub);
}

export async function getExamResults(tenantId: string): Promise<ExamResult[]> {
  const local = (await idbGetAll<ExamResult>('exam_results')).filter((r) => r.tenantId === tenantId);
  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase
        .from('practice_quiz_results')
        .select('*')
        .eq('school_id', tenantId)
        .order('submitted_at', { ascending: false })
        .limit(100);
      if (Array.isArray(data) && data.length > 0) {
        const mapped: ExamResult[] = data.map((row: any) => ({
          id: row.id,
          tenantId,
          examId: row.period_id,
          examTitle: row.answers_json?.examTitle || row.period_id,
          studentCode: row.student_code,
          studentName: row.student_name,
          className: row.class_name,
          grade: row.grade || 7,
          score: Number(row.score),
          maxScore: 10,
          correctCount: row.correct_count || 0,
          totalQuestions: row.total_questions || 10,
          durationSec: row.answers_json?.durationSec || 0,
          tabSwitches: row.answers_json?.tabSwitches || 0,
          answers: row.answers_json?.answers || {},
          submittedAt: row.submitted_at,
        }));
        return mapped;
      }
    } catch {
      // Fallback to IndexedDB
    }
  }
  return local;
}

export async function saveExamResult(result: ExamResult): Promise<void> {
  await idbPut('exam_results', result);
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('practice_quiz_results').insert({
        school_id: result.tenantId,
        period_id: result.examId,
        student_code: result.studentCode,
        student_name: result.studentName,
        class_name: result.className,
        grade: result.grade,
        score: result.score,
        correct_count: result.correctCount,
        total_questions: result.totalQuestions,
        answers_json: {
          examTitle: result.examTitle,
          tabSwitches: result.tabSwitches,
          durationSec: result.durationSec,
          answers: result.answers,
        },
      });
    } catch {
      // IndexedDB persisted
    }
  }
}

export async function getGradebookRecords(
  tenantId: string,
  semester: 'hk1' | 'hk2' | 'year'
): Promise<Record<string, OfficialGradeRow>> {
  const all = await idbGetAll<OfficialGradeRow & { id: string }>('gradebook_records');
  const map: Record<string, OfficialGradeRow> = {};
  for (const row of all) {
    if (row.tenantId === tenantId && row.semester === semester) {
      map[row.studentCode] = row;
    }
  }
  return map;
}

export async function saveGradebookRecord(row: OfficialGradeRow): Promise<void> {
  const id = `${row.tenantId}:${row.semester}:${row.studentCode}`;
  await idbPut('gradebook_records', { ...row, id });
}

export async function updateStudentStats(
  tenantId: string,
  studentCode: string,
  deltaXp: number,
  incrementTasks: boolean = true
): Promise<void> {
  const students = await getStudentsByTenant(tenantId);
  const target = students.find((s) => s.studentCode === studentCode);
  if (!target) return;
  const nextXp = target.totalXp + deltaXp;
  const nextLevel = Math.max(1, Math.floor(nextXp / 200) + 1);
  const updated: Student = {
    ...target,
    totalXp: nextXp,
    level: nextLevel,
    completedTasks: incrementTasks ? target.completedTasks + 1 : target.completedTasks,
  };
  await saveStudentForTenant(updated);
}

export async function getTenantExams(tenantId: string): Promise<Exam[]> {
  const baseExams = await getAllExams();
  if (typeof window === 'undefined') return baseExams;
  try {
    const customRaw = localStorage.getItem(`thso_custom_exams:${tenantId}`);
    const locksRaw = localStorage.getItem(`thso_exam_locks:${tenantId}`);
    const custom: Exam[] = customRaw ? JSON.parse(customRaw) : [];
    const locks: Record<string, boolean> = locksRaw ? JSON.parse(locksRaw) : {};
    return [...custom, ...baseExams].map((ex) =>
      locks[ex.id] !== undefined ? { ...ex, isLocked: locks[ex.id] } : ex
    );
  } catch {
    return baseExams;
  }
}

export function setExamLockForTenant(tenantId: string, examId: string, isLocked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `thso_exam_locks:${tenantId}`;
    const locks: Record<string, boolean> = JSON.parse(localStorage.getItem(key) || '{}');
    locks[examId] = isLocked;
    localStorage.setItem(key, JSON.stringify(locks));
  } catch {
    // Ignore storage errors
  }
}

export function createCustomExamForTenant(tenantId: string, exam: Exam): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `thso_custom_exams:${tenantId}`;
    const existing: Exam[] = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([exam, ...existing]));
  } catch {
    // Ignore storage errors
  }
}

export async function resetTenantDemoState(tenantId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await idbDelete('kv_meta', 'seed_version');
  tenantsCache = null;
  classesCache = null;
  studentsCache = null;
  localStorage.removeItem(`thso_exam_locks:${tenantId}`);
  localStorage.removeItem(`thso_custom_exams:${tenantId}`);
  await ensureSeeded();
}

