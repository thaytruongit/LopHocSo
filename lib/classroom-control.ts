'use client';

import {
  ClassroomActivityKey,
  ClassroomControlState,
  GradeLevel,
  HelpRequest,
  Student,
} from './domain/types';
import {
  applyActivityToggle,
  applyHelpRequest,
  applyLiveBroadcast,
  applyMachineScore,
  buildMachinesForClass,
  createInitialClassroomState,
} from './domain/classroom-engine';
import { getActiveTenantContext } from './auth';
import { getClassesByTenant, getStudentsByTenant } from './domain/data-repository';
import { supabase, isSupabaseConfigured } from './supabase/client';

function storageKeyForRoom(tenantId: string, roomId: string): string {
  return `thso_classroom_state:${tenantId}:${roomId}`;
}

function broadcastChannelForRoom(tenantId: string, roomId: string): string {
  return `thso_room_sync:${tenantId}:${roomId}`;
}

export function getDefaultClassroomState(
  tenantId?: string,
  roomId?: string,
  roomName?: string
): ClassroomControlState {
  const ctx = getActiveTenantContext();
  return createInitialClassroomState({
    tenantId: tenantId || ctx.tenantId,
    roomId: roomId || ctx.roomId,
    roomName: roomName || ctx.roomName,
    activeGrade: 7,
    activeClassId: (tenantId || ctx.tenantId) === 'mao-dien' ? 'c-7a11' : 'demo-7a1',
    activeClassName: (tenantId || ctx.tenantId) === 'mao-dien' ? 'Lớp 7A11' : 'Lớp 7A1',
    classStudents: [],
    capacity: 24,
  });
}

export function getClassroomState(tenantId?: string, roomId?: string): ClassroomControlState {
  const ctx = getActiveTenantContext();
  const tId = tenantId || ctx.tenantId;
  const rId = roomId || ctx.roomId;
  const def = getDefaultClassroomState(tId, rId, ctx.roomName);

  if (typeof window === 'undefined') return def;

  try {
    const raw = localStorage.getItem(storageKeyForRoom(tId, rId));
    if (!raw) {
      localStorage.setItem(storageKeyForRoom(tId, rId), JSON.stringify(def));
      return def;
    }
    const parsed = JSON.parse(raw);
    return {
      ...def,
      ...parsed,
      tenantId: tId,
      roomId: rId,
      activityLocks: {
        ...def.activityLocks,
        ...(parsed?.activityLocks || {}),
      },
      activityDurations: {
        ...def.activityDurations,
        ...(parsed?.activityDurations || {}),
      },
      machines:
        Array.isArray(parsed?.machines) && parsed.machines.length === 24
          ? parsed.machines
          : def.machines,
      helpRequests: Array.isArray(parsed?.helpRequests) ? parsed.helpRequests : [],
    };
  } catch {
    return def;
  }
}

export async function hydrateRoomRosterIfEmpty(
  tenantId: string,
  roomId: string
): Promise<ClassroomControlState> {
  const current = getClassroomState(tenantId, roomId);
  const hasAssigned = current.machines.some((m) => Boolean(m.student1Code));
  if (hasAssigned) return current;

  const [classes, students] = await Promise.all([
    getClassesByTenant(tenantId),
    getStudentsByTenant(tenantId),
  ]);
  const targetClass =
    classes.find((c) => c.id === current.activeClassId) ||
    classes.find((c) => c.grade === current.activeGrade) ||
    classes[0];
  if (!targetClass) return current;

  const classStudents = students.filter((s) => s.classId === targetClass.id);
  return updateClassroomState(
    (prev) => ({
      ...prev,
      activeClassId: targetClass.id,
      activeClassName: targetClass.name,
      activeGrade: targetClass.grade,
      machines: buildMachinesForClass(classStudents, targetClass.name, 24),
    }),
    tenantId,
    roomId
  );
}

export function updateClassroomState(
  updater: (prev: ClassroomControlState) => ClassroomControlState,
  tenantId?: string,
  roomId?: string
): ClassroomControlState {
  const ctx = getActiveTenantContext();
  const tId = tenantId || ctx.tenantId;
  const rId = roomId || ctx.roomId;
  const current = getClassroomState(tId, rId);
  const next = updater(current);
  next.tenantId = tId;
  next.roomId = rId;
  next.updatedAt = Date.now();

  if (typeof window !== 'undefined') {
    const key = storageKeyForRoom(tId, rId);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('thso_classroom_update', { detail: next }));

      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(broadcastChannelForRoom(tId, rId));
        bc.postMessage(next);
        bc.close();
      }
    } catch {
      // Ignore storage quota warnings
    }
  }

  if (isSupabaseConfigured && supabase) {
    try {
      supabase.channel(broadcastChannelForRoom(tId, rId)).send({
        type: 'broadcast',
        event: 'state_change',
        payload: next,
      });
    } catch {
      // Offline resilient
    }
  }

  return next;
}

export function toggleActivityLock(activity: ClassroomActivityKey): ClassroomControlState {
  const timeLabel = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return updateClassroomState((prev) => applyActivityToggle(prev, activity, Date.now(), timeLabel));
}

export function setActivityDuration(
  activity: ClassroomActivityKey,
  minutes: number
): ClassroomControlState {
  const safeMinutes = Math.max(1, Math.min(120, Math.round(minutes)));
  const timeLabel = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return updateClassroomState((prev) => ({
    ...prev,
    activityDurations: {
      ...prev.activityDurations,
      [activity]: safeMinutes,
    },
    broadcastMessage: `Đã ấn định ${safeMinutes} phút cho ${
      activity === 'discovery'
        ? 'Hoạt động 1 (Khám phá)'
        : activity === 'practice'
        ? 'Hoạt động 2 (Luyện tập)'
        : 'Hoạt động 3 (Thực hành)'
    }.`,
    broadcastTime: timeLabel,
  }));
}

export function setLiveBroadcast(isLive: boolean): ClassroomControlState {
  const timeLabel = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return updateClassroomState((prev) => applyLiveBroadcast(prev, isLive, Date.now(), timeLabel));
}

export function exitClassroomAndLockAll(): ClassroomControlState {
  const timeLabel = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return updateClassroomState((prev) => ({
    ...prev,
    isLive: false,
    activityLocks: { discovery: false, practice: false, lab: false },
    isTimerRunning: false,
    isTimeUp: false,
    timerRemainingSeconds: 0,
    timerDurationSeconds: 0,
    timerEndTimestamp: 0,
    broadcastMessage: 'Giáo viên đã kết thúc tiết học. Tất cả hoạt động đã khóa.',
    broadcastTime: timeLabel,
  }));
}

export async function selectClassForClassroom(
  classId: string,
  className: string,
  grade: GradeLevel
): Promise<ClassroomControlState> {
  const ctx = getActiveTenantContext();
  const students = await getStudentsByTenant(ctx.tenantId);
  const classStudents = students.filter((s) => s.classId === classId);
  const machines = buildMachinesForClass(classStudents, className, 24);
  const timeLabel = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return updateClassroomState((prev) => ({
    ...prev,
    activeClassId: classId,
    activeClassName: className,
    activeGrade: grade,
    machines,
    helpRequests: [],
    broadcastMessage: `Phòng máy đã chuyển điều phối sang ${className} (Khối ${grade}).`,
    broadcastTime: timeLabel,
  }));
}

export function selectPeriodForClassroom(params: {
  period: number;
  lessonTitle: string;
  grade: GradeLevel;
  isPractical: boolean;
  classId?: string;
  className?: string;
  autoLive?: boolean;
}): ClassroomControlState {
  const timeLabel = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return updateClassroomState((prev) => {
    const durMin = prev.activityDurations.discovery || 10;
    const durSec = durMin * 60;
    const goLive = params.autoLive ?? true;

    return {
      ...prev,
      isLive: goLive,
      activePeriod: params.period,
      activeGrade: params.grade,
      activeClassId: params.classId || prev.activeClassId,
      activeClassName: params.className || prev.activeClassName,
      lessonTitle: params.lessonTitle,
      isPracticalPeriod: params.isPractical,
      activityLocks: goLive
        ? { discovery: true, practice: true, lab: params.isPractical }
        : prev.activityLocks,
      currentActivity: 'discovery',
      timerRemainingSeconds: durSec,
      timerDurationSeconds: durSec,
      timerEndTimestamp: goLive ? Date.now() + durSec * 1000 : 0,
      isTimerRunning: goLive,
      isTimeUp: false,
      broadcastMessage: `Tiết ${params.period}: ${params.lessonTitle}`,
      broadcastTime: timeLabel,
    };
  });
}

export function updateMachineScore(
  machineId: number,
  activity: ClassroomActivityKey,
  score: number,
  practicalFileName?: string,
  comment?: string
): ClassroomControlState {
  return updateClassroomState((prev) =>
    applyMachineScore(prev, machineId, activity, score, practicalFileName, comment)
  );
}

export function awardStarToMachine(machineId: number): ClassroomControlState {
  const timeLabel = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return updateClassroomState((prev) => {
    const updated = prev.machines.map((m) =>
      m.machineId === machineId ? { ...m, starsEarned: m.starsEarned + 1 } : m
    );
    const target = updated.find((m) => m.machineId === machineId);
    return {
      ...prev,
      machines: updated,
      broadcastMessage: `Tuyên dương +1 Sao thưởng cho ${target?.machineName || `Máy ${machineId}`} (${target?.student1Name || 'Học sinh'})!`,
      broadcastTime: timeLabel,
    };
  });
}

export function sendStudentHelpRequest(
  machineId: number,
  machineName: string,
  studentName: string,
  className: string,
  message: string
): ClassroomControlState {
  const req: HelpRequest = {
    id: `help-${Date.now()}`,
    machineId,
    machineName,
    studentName,
    className,
    message,
    createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    status: 'pending',
  };
  return updateClassroomState((prev) => applyHelpRequest(prev, req));
}

export function resolveHelpRequest(requestId: string): ClassroomControlState {
  return updateClassroomState((prev) => {
    const target = prev.helpRequests.find((r) => r.id === requestId);
    const helpRequests = prev.helpRequests.map((r) =>
      r.id === requestId ? { ...r, status: 'resolved' as const } : r
    );
    const machines = prev.machines.map((m) =>
      target && m.machineId === target.machineId ? { ...m, hasHelpRequest: false } : m
    );
    return { ...prev, helpRequests, machines };
  });
}

export function subscribeToClassroomState(
  callback: (state: ClassroomControlState) => void,
  tenantId?: string,
  roomId?: string
): () => void {
  if (typeof window === 'undefined') return () => {};
  const ctx = getActiveTenantContext();
  const tId = tenantId || ctx.tenantId;
  const rId = roomId || ctx.roomId;
  const key = storageKeyForRoom(tId, rId);
  const channelName = broadcastChannelForRoom(tId, rId);

  const handleLocal = (e: Event) => {
    const ce = e as CustomEvent<ClassroomControlState>;
    if (ce.detail && ce.detail.tenantId === tId && ce.detail.roomId === rId) {
      callback(ce.detail);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === key && e.newValue) {
      try {
        callback(JSON.parse(e.newValue));
      } catch {
        // Ignore parse failure
      }
    }
  };

  window.addEventListener('thso_classroom_update', handleLocal);
  window.addEventListener('storage', handleStorage);

  let bc: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel(channelName);
      bc.onmessage = (ev) => {
        if (ev.data) callback(ev.data);
      };
    } catch {
      // Ignore unsupported
    }
  }

  let sbChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
  if (isSupabaseConfigured && supabase) {
    try {
      sbChannel = supabase
        .channel(channelName)
        .on('broadcast', { event: 'state_change' }, ({ payload }) => {
          if (payload) {
            localStorage.setItem(key, JSON.stringify(payload));
            callback(payload as ClassroomControlState);
          }
        })
        .subscribe();
    } catch {
      // Ignore realtime fallback
    }
  }

  return () => {
    window.removeEventListener('thso_classroom_update', handleLocal);
    window.removeEventListener('storage', handleStorage);
    if (bc) {
      try {
        bc.close();
      } catch {}
    }
    if (sbChannel && supabase) {
      try {
        supabase.removeChannel(sbChannel);
      } catch {}
    }
  };
}
