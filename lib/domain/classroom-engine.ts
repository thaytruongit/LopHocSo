import {
  ClassroomActivityKey,
  ClassroomControlState,
  CurriculumPeriod,
  GradeLevel,
  HelpRequest,
  LabMachineState,
  Student,
} from './types';

export const ZIGZAG_CLASSROOM_ROWS: { rowNum: number; machineIds: number[] }[] = [
  { rowNum: 1, machineIds: [4, 3, 2, 1] },
  { rowNum: 2, machineIds: [5, 6, 7, 8] },
  { rowNum: 3, machineIds: [12, 11, 10, 9] },
  { rowNum: 4, machineIds: [13, 14, 15, 16] },
  { rowNum: 5, machineIds: [20, 19, 18, 17] },
  { rowNum: 6, machineIds: [21, 22, 23, 24] },
];

export function buildMachinesForClass(
  classStudents: Student[],
  className: string,
  capacity: number = 24
): LabMachineState[] {
  return Array.from({ length: capacity }, (_, idx) => {
    const s1 = classStudents[idx * 2];
    const s2 = classStudents[idx * 2 + 1];
    const num = idx + 1;
    const machineName = `Máy ${num < 10 ? '0' : ''}${num}`;

    return {
      machineId: num,
      machineName,
      student1Name: s1 ? s1.fullName : 'Chờ kết nối...',
      student1Code: s1 ? s1.studentCode : undefined,
      student2Name: s2 ? s2.fullName : undefined,
      student2Code: s2 ? s2.studentCode : undefined,
      progress: 0,
      completedTasks: 0,
      totalTasks: 3,
      starsEarned: 0,
      status: s1 ? 'active' : 'idle',
      hasHelpRequest: false,
      scoreH1: undefined,
      scoreH2: undefined,
      scoreH3: undefined,
      totalScore: undefined,
      practicalFileName: undefined,
      practicalFileUrl: undefined,
    };
  });
}

export function createInitialClassroomState(params: {
  tenantId: string;
  roomId: string;
  roomName: string;
  activeGrade: GradeLevel;
  activeClassId: string;
  activeClassName: string;
  classStudents: Student[];
  capacity?: number;
}): ClassroomControlState {
  return {
    tenantId: params.tenantId,
    roomId: params.roomId,
    roomName: params.roomName,
    isLive: false,
    activeGrade: params.activeGrade,
    activeClassId: params.activeClassId,
    activeClassName: params.activeClassName,
    activePeriod: 0,
    lessonTitle: '',
    isPracticalPeriod: false,
    activityLocks: {
      discovery: false,
      practice: false,
      lab: false,
    },
    activityDurations: {
      discovery: 10,
      practice: 7,
      lab: 15,
    },
    currentActivity: 'discovery',
    timerRemainingSeconds: 600,
    timerDurationSeconds: 600,
    timerEndTimestamp: 0,
    isTimerRunning: false,
    isTimeUp: false,
    spotlightMachineId: null,
    broadcastMessage: 'Đang chờ giáo viên chọn tiết học và phát trực tiếp bài dạy.',
    broadcastTime: '--:--',
    machines: buildMachinesForClass(params.classStudents, params.activeClassName, params.capacity || 24),
    helpRequests: [],
    updatedAt: Date.now(),
  };
}

export function applyActivityToggle(
  prev: ClassroomControlState,
  activity: ClassroomActivityKey,
  nowMs: number = Date.now(),
  timeLabel: string = ''
): ClassroomControlState {
  const newStatus = !prev.activityLocks[activity];
  const durMinutes = prev.activityDurations[activity] || 10;
  const durSeconds = durMinutes * 60;
  const endTimestamp = newStatus ? nowMs + durSeconds * 1000 : 0;
  const nextLocks = {
    ...prev.activityLocks,
    [activity]: newStatus,
  };
  const anyUnlocked = nextLocks.discovery || nextLocks.practice || nextLocks.lab;
  const actLabel =
    activity === 'discovery'
      ? 'Hoạt động 1 (Khám phá cặp đôi)'
      : activity === 'practice'
      ? 'Hoạt động 2 (Luyện tập 7 câu)'
      : 'Hoạt động 3 (Thực hành trên máy)';

  return {
    ...prev,
    isLive: anyUnlocked ? true : prev.isLive,
    activePeriod: prev.activePeriod > 0 ? prev.activePeriod : 1,
    currentActivity: activity,
    timerRemainingSeconds: newStatus ? durSeconds : prev.timerRemainingSeconds,
    timerDurationSeconds: newStatus ? durSeconds : prev.timerDurationSeconds,
    timerEndTimestamp: endTimestamp,
    isTimerRunning: newStatus,
    isTimeUp: false,
    activityLocks: nextLocks,
    broadcastMessage: newStatus
      ? `Đã mở ${actLabel} (${durMinutes} phút) cho ${prev.activeClassName}.`
      : `Đã tạm khóa ${actLabel}.`,
    broadcastTime: timeLabel || prev.broadcastTime,
    updatedAt: nowMs,
  };
}

export function applyLiveBroadcast(
  prev: ClassroomControlState,
  isLive: boolean,
  nowMs: number = Date.now(),
  timeLabel: string = ''
): ClassroomControlState {
  const act = prev.currentActivity || 'discovery';
  const durMinutes = prev.activityDurations[act] || 10;
  const durSeconds = durMinutes * 60;

  return {
    ...prev,
    isLive,
    activePeriod: prev.activePeriod > 0 ? prev.activePeriod : 1,
    activityLocks: isLive
      ? {
          discovery: true,
          practice: true,
          lab: prev.isPracticalPeriod,
        }
      : {
          discovery: false,
          practice: false,
          lab: false,
        },
    isTimerRunning: isLive,
    isTimeUp: false,
    timerRemainingSeconds: isLive ? durSeconds : 0,
    timerDurationSeconds: isLive ? durSeconds : 0,
    timerEndTimestamp: isLive ? nowMs + durSeconds * 1000 : 0,
    broadcastMessage: isLive
      ? `Đang phát trực tiếp bài dạy cho ${prev.activeClassName} (${durMinutes} phút).`
      : `Đã kết thúc phát trực tiếp; màn hình học sinh chuyển về bảng chờ.`,
    broadcastTime: timeLabel || prev.broadcastTime,
    updatedAt: nowMs,
  };
}

export function applyMachineScore(
  prev: ClassroomControlState,
  machineId: number,
  activity: ClassroomActivityKey,
  score: number,
  practicalFileName?: string,
  comment?: string
): ClassroomControlState {
  const safeScore = Math.max(0, Math.min(10, Number(score.toFixed(1))));

  const machines = prev.machines.map((m) => {
    if (m.machineId !== machineId) return m;

    const scoreH1 = activity === 'discovery' ? safeScore : m.scoreH1;
    const scoreH2 = activity === 'practice' ? safeScore : m.scoreH2;
    const scoreH3 = activity === 'lab' ? safeScore : m.scoreH3;

    const completed = [scoreH1, scoreH2, scoreH3].filter((v) => typeof v === 'number').length;
    const expectedTasks = prev.isPracticalPeriod ? 3 : 2;
    const progress = Math.min(100, Math.round((completed / expectedTasks) * 100));

    let totalScore = 0;
    if (prev.isPracticalPeriod) {
      totalScore = Number(
        (((scoreH1 || 0) * 0.3) + ((scoreH2 || 0) * 0.3) + ((scoreH3 || 0) * 0.4)).toFixed(1)
      );
    } else {
      const count = [scoreH1, scoreH2].filter((v) => typeof v === 'number').length || 1;
      totalScore = Number((((scoreH1 || 0) + (scoreH2 || 0)) / count).toFixed(1));
    }

    return {
      ...m,
      scoreH1,
      scoreH2,
      scoreH3,
      totalScore,
      completedTasks: completed,
      totalTasks: expectedTasks,
      progress: Math.max(m.progress, progress),
      status: completed >= expectedTasks ? ('submitted' as const) : ('active' as const),
      practicalFileName: practicalFileName || m.practicalFileName,
      comment: comment || m.comment,
    };
  });

  return {
    ...prev,
    machines,
    updatedAt: Date.now(),
  };
}

export function applyHelpRequest(
  prev: ClassroomControlState,
  req: HelpRequest
): ClassroomControlState {
  const machines = prev.machines.map((m) =>
    m.machineId === req.machineId ? { ...m, hasHelpRequest: true } : m
  );
  return {
    ...prev,
    machines,
    helpRequests: [req, ...prev.helpRequests],
    broadcastMessage: `Yêu cầu hỗ trợ từ ${req.machineName} (${req.studentName}): ${req.message}`,
    broadcastTime: req.createdAt,
    updatedAt: Date.now(),
  };
}

export function applyResolveHelpRequest(
  prev: ClassroomControlState,
  requestId: string
): ClassroomControlState {
  const target = prev.helpRequests.find((r) => r.id === requestId);
  const helpRequests = prev.helpRequests.map((r) =>
    r.id === requestId ? { ...r, status: 'resolved' as const } : r
  );
  const machines = prev.machines.map((m) =>
    target && m.machineId === target.machineId ? { ...m, hasHelpRequest: false } : m
  );
  return {
    ...prev,
    helpRequests,
    machines,
    updatedAt: Date.now(),
  };
}

export function applyAwardStar(
  prev: ClassroomControlState,
  machineId: number,
  timeLabel: string = ''
): ClassroomControlState {
  const updated = prev.machines.map((m) =>
    m.machineId === machineId ? { ...m, starsEarned: m.starsEarned + 1 } : m
  );
  const target = updated.find((m) => m.machineId === machineId);
  return {
    ...prev,
    machines: updated,
    broadcastMessage: `Tuyên dương +1 Sao thưởng cho ${target?.machineName || `Máy ${machineId}`} (${target?.student1Name || 'Học sinh'})!`,
    broadcastTime: timeLabel || prev.broadcastTime,
    updatedAt: Date.now(),
  };
}

export function toggleTaughtPeriod(
  list: number[],
  period: number,
  forceValue?: boolean
): number[] {
  const cleanPeriod = Math.floor(period);
  if (!Number.isFinite(cleanPeriod) || cleanPeriod <= 0) {
    return [...new Set(list)].sort((a, b) => a - b);
  }
  const set = new Set(list.filter((n) => Number.isFinite(n) && n > 0));
  const shouldBeTaught = forceValue !== undefined ? forceValue : !set.has(cleanPeriod);
  if (shouldBeTaught) {
    set.add(cleanPeriod);
  } else {
    set.delete(cleanPeriod);
  }
  return Array.from(set).sort((a, b) => a - b);
}

export function mergeClassroomState(
  current: ClassroomControlState,
  incoming: ClassroomControlState
): ClassroomControlState {
  const incomingIsBlankDefault =
    incoming.activePeriod === 0 &&
    !incoming.isLive &&
    incoming.helpRequests.length === 0 &&
    !incoming.machines.some((m) => typeof m.scoreH1 === 'number' || typeof m.scoreH2 === 'number' || typeof m.scoreH3 === 'number');

  const currentHasActivity =
    current.isLive ||
    current.activePeriod > 0 ||
    current.helpRequests.length > 0 ||
    current.machines.some((m) => typeof m.scoreH1 === 'number' || typeof m.scoreH2 === 'number' || typeof m.scoreH3 === 'number');

  if (incomingIsBlankDefault && currentHasActivity) {
    return current;
  }

  return incoming.updatedAt >= current.updatedAt ? incoming : current;
}

export function gradePracticeQuiz(
  period: CurriculumPeriod,
  answers: Record<string, number>
): { score: number; correctCount: number; totalQuestions: number } {
  const questions = period.reinforcement?.questions || [];
  const totalQuestions = questions.length;
  if (totalQuestions === 0) {
    return { score: 0, correctCount: 0, totalQuestions: 0 };
  }

  let correctCount = 0;
  for (const q of questions) {
    if (answers[q.id] === q.correctIndex) {
      correctCount++;
    }
  }

  const score = Number(((correctCount / totalQuestions) * 10).toFixed(1));
  return { score, correctCount, totalQuestions };
}

export function gradePairWorksheet(
  period: CurriculumPeriod,
  input: {
    bucketAssignments: Record<string, string>;
    dropdownAnswers: Record<number, string>;
    matchingConnections: Record<string, string>;
  }
): { score: number; earned: number; total: number; feedback: string[] } {
  const ws = period.worksheet;
  let earned = 0;
  let total = 0;
  const feedback: string[] = [];

  if (ws.dragDrop?.items) {
    for (const item of ws.dragDrop.items) {
      total++;
      if (input.bucketAssignments[item.text] === item.bucket) {
        earned++;
      } else {
        feedback.push(`Phân loại "${item.text}" → đúng là nhóm "${item.bucket}"`);
      }
    }
  }

  if (ws.fillBlanks) {
    ws.fillBlanks.forEach((fb, idx) => {
      total++;
      const ans = (input.dropdownAnswers[idx] || '').trim().toLowerCase();
      if (ans === fb.correctAnswer.trim().toLowerCase()) {
        earned++;
      } else {
        feedback.push(`Câu điền khuyết ${idx + 1} → đáp án đúng: "${fb.correctAnswer}"`);
      }
    });
  }

  if (ws.matchingPairs) {
    for (const pair of ws.matchingPairs) {
      total++;
      if (input.matchingConnections[pair.left] === pair.right) {
        earned++;
      } else {
        feedback.push(`Ghép cặp "${pair.left}" → "${pair.right}"`);
      }
    }
  }

  const score = total > 0 ? Number(((earned / total) * 10).toFixed(1)) : 10;
  return { score, earned, total, feedback };
}
