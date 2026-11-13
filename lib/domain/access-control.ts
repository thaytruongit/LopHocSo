import { ClassItem, Exam, GradeLevel, UserSession } from './types';

export function isTeacherUser(user: Pick<UserSession, 'role' | 'isLoggedIn'> | null): boolean {
  return Boolean(user?.isLoggedIn && user.role === 'teacher');
}

export function isStudentUser(user: Pick<UserSession, 'role' | 'isLoggedIn'> | null): boolean {
  return Boolean(user?.isLoggedIn && user.role === 'student');
}

export function getAllowedGradesForUser(
  user: Pick<UserSession, 'role' | 'isLoggedIn' | 'studentGrade'> | null
): GradeLevel[] {
  if (!user || !user.isLoggedIn || user.role === 'guest') return [];
  if (user.role === 'teacher') return [6, 7, 8, 9];
  return user.studentGrade ? [user.studentGrade] : [];
}

export function getEffectiveGrade(
  user: Pick<UserSession, 'role' | 'isLoggedIn' | 'studentGrade'> | null,
  requestedGrade?: GradeLevel
): GradeLevel | null {
  if (!user || !user.isLoggedIn || user.role === 'guest') return null;
  if (user.role === 'student') {
    return user.studentGrade || 7;
  }
  return requestedGrade || 7;
}

export function canAccessGrade(
  user: Pick<UserSession, 'role' | 'isLoggedIn' | 'studentGrade'> | null,
  targetGrade: GradeLevel
): boolean {
  if (!user || !user.isLoggedIn || user.role === 'guest') return false;
  if (user.role === 'teacher') return true;
  return user.studentGrade === targetGrade;
}

export function canAccessExam(
  user: Pick<UserSession, 'role' | 'isLoggedIn' | 'studentGrade'> | null,
  exam: Pick<Exam, 'grade' | 'isLocked'> | null
): { allowed: boolean; reason?: 'unauthenticated' | 'locked' | 'wrong-grade' } {
  if (!user || !user.isLoggedIn || user.role === 'guest') {
    return { allowed: false, reason: 'unauthenticated' };
  }
  if (!exam) {
    return { allowed: false, reason: 'locked' };
  }
  if (user.role === 'teacher') {
    return { allowed: true };
  }
  if (user.studentGrade && exam.grade !== user.studentGrade) {
    return { allowed: false, reason: 'wrong-grade' };
  }
  if (exam.isLocked) {
    return { allowed: false, reason: 'locked' };
  }
  return { allowed: true };
}

export function matchesStudentClass(
  studentClass: string | undefined,
  cls: Pick<ClassItem, 'name' | 'classCode'>
): boolean {
  if (!studentClass) return false;
  const normStudent = studentClass.replace(/^Lớp\s+/i, '').trim().toLowerCase();
  const normName = cls.name.replace(/^Lớp\s+/i, '').trim().toLowerCase();
  const normCode = cls.classCode.replace(/-\d{4}$/, '').trim().toLowerCase();
  return normStudent === normName || normStudent === normCode;
}

export function filterAccessibleClassesForUser(
  user: Pick<UserSession, 'role' | 'isLoggedIn' | 'tenantId' | 'studentClass'> | null,
  classes: ClassItem[]
): ClassItem[] {
  if (!user || !user.isLoggedIn || user.role === 'guest') return [];
  const tenantClasses = classes.filter((c) => c.tenantId === user.tenantId);
  if (user.role === 'teacher') return tenantClasses;
  return tenantClasses.filter((c) => matchesStudentClass(user.studentClass, c));
}

export function isHomeworkPeriodUnlocked(
  user: Pick<UserSession, 'role' | 'isLoggedIn'> | null,
  periodNumber: number,
  taughtPeriods: number[]
): { unlocked: boolean; reason?: 'unauthenticated' | 'untaught' } {
  if (!user || !user.isLoggedIn || user.role === 'guest') {
    return { unlocked: false, reason: 'unauthenticated' };
  }
  if (user.role === 'teacher') {
    return { unlocked: true };
  }
  if (!taughtPeriods.includes(periodNumber)) {
    return { unlocked: false, reason: 'untaught' };
  }
  return { unlocked: true };
}

