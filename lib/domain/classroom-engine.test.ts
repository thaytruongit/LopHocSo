import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyActivityToggle,
  applyLiveBroadcast,
  applyMachineScore,
  buildMachinesForClass,
  createInitialClassroomState,
  gradePairWorksheet,
  gradePracticeQuiz,
  ZIGZAG_CLASSROOM_ROWS,
} from './classroom-engine';
import { CurriculumPeriod, Student } from './types';

function makeStudents(count: number, tenantId = 'mao-dien'): Student[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `s-${idx + 1}`,
    tenantId,
    classId: 'c-7a11',
    className: 'Lớp 7A11',
    studentCode: `HS7A11${String(idx + 1).padStart(2, '0')}`,
    fullName: `Học sinh ${idx + 1}`,
    totalXp: 100,
    level: 1,
    streakDays: 1,
    completedTasks: 0,
    averageGrade: 8.5,
    progressScore: 8.5,
    contributionScore: 8.5,
    badgesCount: 1,
  }));
}

test('ZIGZAG_CLASSROOM_ROWS covers all 24 machines uniquely', () => {
  const allIds = ZIGZAG_CLASSROOM_ROWS.flatMap((r) => r.machineIds);
  assert.equal(allIds.length, 24);
  assert.equal(new Set(allIds).size, 24);
  assert.deepEqual(ZIGZAG_CLASSROOM_ROWS[0].machineIds, [4, 3, 2, 1]);
  assert.deepEqual(ZIGZAG_CLASSROOM_ROWS[1].machineIds, [5, 6, 7, 8]);
});

test('buildMachinesForClass pairs 2 students per machine cleanly', () => {
  const students = makeStudents(39);
  const machines = buildMachinesForClass(students, 'Lớp 7A11', 24);
  assert.equal(machines.length, 24);
  assert.equal(machines[0].student1Name, 'Học sinh 1');
  assert.equal(machines[0].student2Name, 'Học sinh 2');
  assert.equal(machines[19].student1Name, 'Học sinh 39');
  assert.equal(machines[19].student2Name, undefined);
  assert.equal(machines[20].status, 'idle');
});

test('multi-tenant classroom transitions isolate tenantId and roomId', () => {
  const initial = createInitialClassroomState({
    tenantId: 'chu-van-an',
    roomId: 'pm-a1',
    roomName: 'Phòng Lab Tin học A1',
    activeGrade: 7,
    activeClassId: 'demo-7a1',
    activeClassName: 'Lớp 7A1',
    classStudents: makeStudents(4, 'chu-van-an'),
  });

  assert.equal(initial.isLive, false);
  assert.equal(initial.tenantId, 'chu-van-an');
  assert.equal(initial.roomId, 'pm-a1');

  const toggled = applyActivityToggle(initial, 'discovery', 1000000, '08:00');
  assert.equal(toggled.isLive, true);
  assert.equal(toggled.activityLocks.discovery, true);
  assert.equal(toggled.isTimerRunning, true);
  assert.equal(toggled.timerEndTimestamp, 1000000 + 10 * 60 * 1000);

  const scored = applyMachineScore(toggled, 1, 'discovery', 9.5);
  assert.equal(scored.machines[0].scoreH1, 9.5);
  assert.equal(scored.machines[0].totalScore, 9.5);

  const stopped = applyLiveBroadcast(scored, false, 1005000, '08:05');
  assert.equal(stopped.isLive, false);
  assert.equal(stopped.activityLocks.discovery, false);
  assert.equal(stopped.activityLocks.practice, false);
});

test('gradePracticeQuiz and gradePairWorksheet compute exact scores', () => {
  const mockPeriod: CurriculumPeriod = {
    id: 'k7-p06',
    grade: 7,
    period: 6,
    title: 'Bảng tính',
    topic: 'Chủ đề E',
    isPractice: true,
    contentDesc: '',
    digitalCompetency: '',
    worksheet: {
      title: 'Phiếu',
      phase1_khoi_dong: '',
      phase2_kham_pha: '',
      phase3_luyen_tap: '',
      phase4_van_dung: '',
      xpReward: 50,
      timeLimitMin: 10,
      dragDrop: {
        bucketA: 'A',
        bucketB: 'B',
        items: [
          { text: 'Item1', bucket: 'A' },
          { text: 'Item2', bucket: 'B' },
        ],
      },
      fillBlanks: [{ statement: 'Test [___]', correctAnswer: 'SUM', filledSentence: 'Test SUM' }],
      matchingPairs: [{ left: 'L1', right: 'R1' }],
    },
    reinforcement: {
      questionsCount: 7,
      matrix: '3-2-2',
      questions: Array.from({ length: 7 }, (_, i) => ({
        id: `q-${i + 1}`,
        level: i < 3 ? 'Nhận biết' : i < 5 ? 'Thông hiểu' : 'Vận dụng',
        question: `Q${i + 1}`,
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 1,
        explanation: 'Exp',
      })),
    },
    homework: { title: 'HW', description: 'Desc', acceptedFormats: ['image'], dueInDays: 3 },
  };

  const quizRes = gradePracticeQuiz(mockPeriod, {
    'q-1': 1,
    'q-2': 1,
    'q-3': 1,
    'q-4': 1,
    'q-5': 0,
    'q-6': 0,
    'q-7': 0,
  });
  assert.equal(quizRes.correctCount, 4);
  assert.equal(quizRes.totalQuestions, 7);
  assert.equal(quizRes.score, 5.7);

  const wsRes = gradePairWorksheet(mockPeriod, {
    bucketAssignments: { Item1: 'A', Item2: 'B' },
    dropdownAnswers: { 0: 'sum' },
    matchingConnections: { L1: 'R1' },
  });
  assert.equal(wsRes.earned, 4);
  assert.equal(wsRes.total, 4);
  assert.equal(wsRes.score, 10);
});
