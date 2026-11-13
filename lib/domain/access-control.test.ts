import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessExam,
  canAccessGrade,
  filterAccessibleClassesForUser,
  getAllowedGradesForUser,
  getEffectiveGrade,
  isHomeworkPeriodUnlocked,
} from './access-control';
import {
  applyLiveBroadcast,
  applyMachineScore,
  createInitialClassroomState,
  mergeClassroomState,
  toggleTaughtPeriod,
} from './classroom-engine';
import { ClassItem, UserSession } from './types';

const student7A11: UserSession = {
  isLoggedIn: true,
  role: 'student',
  tenantId: 'mao-dien',
  tenantName: 'Trường THCS Mão Điền',
  roomId: 'room-1',
  roomName: 'Phòng Tin học 1',
  teacherName: 'Thầy Đỗ Mạnh Trường',
  studentCode: '7A1101',
  studentName: 'Lê Thị Bảo An',
  studentClass: 'Lớp 7A11',
  studentGrade: 7,
};

const teacherSession: UserSession = {
  isLoggedIn: true,
  role: 'teacher',
  tenantId: 'mao-dien',
  tenantName: 'Trường THCS Mão Điền',
  roomId: 'room-1',
  roomName: 'Phòng Tin học 1',
  teacherName: 'Thầy Đỗ Mạnh Trường',
};

const guestSession: UserSession = {
  isLoggedIn: false,
  role: 'guest',
  tenantId: 'mao-dien',
  tenantName: 'Trường THCS Mão Điền',
  roomId: 'room-1',
  roomName: 'Phòng Tin học 1',
  teacherName: 'Thầy Đỗ Mạnh Trường',
};

test('Student is strictly locked to their own grade across materials and exams', () => {
  assert.deepEqual(getAllowedGradesForUser(student7A11), [7]);
  assert.equal(getEffectiveGrade(student7A11, 9), 7);
  assert.equal(canAccessGrade(student7A11, 7), true);
  assert.equal(canAccessGrade(student7A11, 6), false);
  assert.equal(canAccessGrade(student7A11, 8), false);
  assert.equal(canAccessGrade(student7A11, 9), false);

  assert.deepEqual(canAccessExam(student7A11, { grade: 7, isLocked: false }), { allowed: true });
  assert.deepEqual(canAccessExam(student7A11, { grade: 9, isLocked: false }), {
    allowed: false,
    reason: 'wrong-grade',
  });
  assert.deepEqual(canAccessExam(student7A11, { grade: 7, isLocked: true }), {
    allowed: false,
    reason: 'locked',
  });
});

test('Guest cannot bypass grade lock without logging in', () => {
  assert.deepEqual(getAllowedGradesForUser(guestSession), []);
  assert.equal(getEffectiveGrade(guestSession, 7), null);
  assert.equal(canAccessGrade(guestSession, 7), false);
  assert.deepEqual(canAccessExam(guestSession, { grade: 7, isLocked: false }), {
    allowed: false,
    reason: 'unauthenticated',
  });
});

test('Teacher can access all grades and all classes within their tenant', () => {
  assert.deepEqual(getAllowedGradesForUser(teacherSession), [6, 7, 8, 9]);
  assert.equal(getEffectiveGrade(teacherSession, 9), 9);
  assert.equal(canAccessGrade(teacherSession, 6), true);
  assert.equal(canAccessGrade(teacherSession, 9), true);
  assert.deepEqual(canAccessExam(teacherSession, { grade: 9, isLocked: true }), { allowed: true });
});

test('filterAccessibleClassesForUser restricts students strictly to their own class and tenant', () => {
  const sampleClasses: ClassItem[] = [
    {
      id: 'c-7a10',
      tenantId: 'mao-dien',
      name: 'Lớp 7A10',
      grade: 7,
      classCode: '7A10-2026',
      studentCount: 44,
    },
    {
      id: 'c-7a11',
      tenantId: 'mao-dien',
      name: 'Lớp 7A11',
      grade: 7,
      classCode: '7A11-2026',
      studentCount: 45,
    },
    {
      id: 'c-9a10',
      tenantId: 'mao-dien',
      name: 'Lớp 9A10',
      grade: 9,
      classCode: '9A10-2026',
      studentCount: 45,
    },
    {
      id: 'c-cva-7a1',
      tenantId: 'chu-van-an',
      name: 'Lớp 7A1',
      grade: 7,
      classCode: 'CVA-7A1',
      studentCount: 4,
    },
  ];

  const studentClasses = filterAccessibleClassesForUser(student7A11, sampleClasses);
  assert.deepEqual(
    studentClasses.map((c) => c.id),
    ['c-7a11']
  );

  const teacherClasses = filterAccessibleClassesForUser(teacherSession, sampleClasses);
  assert.deepEqual(
    teacherClasses.map((c) => c.id),
    ['c-7a10', 'c-7a11', 'c-9a10']
  );

  assert.deepEqual(filterAccessibleClassesForUser(guestSession, sampleClasses), []);
});

test('Homework periods are unlocked only when taught for students, always unlocked for teachers', () => {
  let taught = toggleTaughtPeriod([], 8, true);
  taught = toggleTaughtPeriod(taught, 3, true);
  assert.deepEqual(taught, [3, 8]);

  assert.deepEqual(isHomeworkPeriodUnlocked(student7A11, 8, taught), { unlocked: true });
  assert.deepEqual(isHomeworkPeriodUnlocked(student7A11, 12, taught), {
    unlocked: false,
    reason: 'untaught',
  });
  assert.deepEqual(isHomeworkPeriodUnlocked(teacherSession, 12, taught), { unlocked: true });
  assert.deepEqual(isHomeworkPeriodUnlocked(guestSession, 8, taught), {
    unlocked: false,
    reason: 'unauthenticated',
  });

  taught = toggleTaughtPeriod(taught, 8, false);
  assert.deepEqual(isHomeworkPeriodUnlocked(student7A11, 8, taught), {
    unlocked: false,
    reason: 'untaught',
  });
});

test('mergeClassroomState prevents blank student default state from overwriting live teacher broadcast', () => {
  const base = createInitialClassroomState({
    tenantId: 'mao-dien',
    roomId: 'pm-1',
    roomName: 'Phòng Tin học 1',
    activeGrade: 7,
    activeClassId: 'c-7a11',
    activeClassName: 'Lớp 7A11',
    classStudents: [],
  });
  const live = applyLiveBroadcast({ ...base, activePeriod: 8, lessonTitle: 'Tiết 8' }, true, 1000, '08:00');
  const blankNewer = { ...base, updatedAt: 2000 };

  const merged = mergeClassroomState(live, blankNewer);
  assert.equal(merged.isLive, true);
  assert.equal(merged.activePeriod, 8);

  const scored = applyMachineScore(live, 1, 'discovery', 9.5);
  const mergedScore = mergeClassroomState(live, scored);
  assert.equal(mergedScore.machines[0].scoreH1, 9.5);
});

