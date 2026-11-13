'use client';

import {
  ClassroomActivityKey,
  ClassroomControlState,
  GradeLevel,
  HelpRequest,
} from './domain/types';
import {
  applyActivityToggle,
  applyAwardStar,
  applyHelpRequest,
  applyLiveBroadcast,
  applyMachineScore,
  applyResolveHelpRequest,
  buildMachinesForClass,
  createInitialClassroomState,
  mergeClassroomState,
  toggleTaughtPeriod,
} from './domain/classroom-engine';
import { getActiveTenantContext } from './auth';
import { getAssetUrl } from './asset-path';
import { getClassesByTenant, getStudentsByTenant } from './domain/data-repository';
import { supabase, isSupabaseConfigured } from './supabase/client';

function storageKeyForRoom(tenantId: string, roomId: string): string {
  return `thso_classroom_state:${tenantId}:${roomId}`;
}

function broadcastChannelForRoom(tenantId: string, roomId: string): string {
  return `thso_room_sync:${tenantId}:${roomId}`;
}

function taughtStorageKey(tenantId: string, classId: string): string {
  return `thso_taught_periods:${tenantId}:${classId}`;
}

function persistLocalState(tId: string, rId: string, next: ClassroomControlState): void {
  if (typeof window === 'undefined') return;
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

function persistLocalTaughtPeriods(tenantId: string, classId: string, periods: number[]): void {
  if (typeof window === 'undefined' || !classId) return;
  try {
    localStorage.setItem(taughtStorageKey(tenantId, classId), JSON.stringify(periods));
    window.dispatchEvent(
      new CustomEvent('thso_taught_periods_update', {
        detail: { tenantId, classId, taughtPeriods: periods },
      })
    );
  } catch {
    // Ignore storage quota warnings
  }
}

export function getLocalTaughtPeriods(tenantId: string, classId: string): number[] {
  if (typeof window === 'undefined' || !classId) return [];
  try {
    const raw = localStorage.getItem(taughtStorageKey(tenantId, classId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function postClassroomSync(payload: Record<string, unknown>): Promise<any> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(getAssetUrl('/api/classroom-sync/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchServerClassroomSnapshot(
  tenantId: string,
  roomId: string,
  classId?: string
): Promise<{
  state: ClassroomControlState | null;
  taughtPeriods: number[];
  taughtPeriodsByClass: Record<string, number[]>;
} | null> {
  if (typeof window === 'undefined') return null;
  try {
    const qs = new URLSearchParams({ tenantId, roomId });
    if (classId) qs.set('classId', classId);
    const res = await fetch(`${getAssetUrl('/api/classroom-sync/')}?${qs.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchTaughtPeriods(tenantId: string, classId: string): Promise<number[]> {
  if (!classId) return [];
  const local = getLocalTaughtPeriods(tenantId, classId);
  const ctx = getActiveTenantContext();
  const snap = await fetchServerClassroomSnapshot(tenantId, ctx.roomId, classId);
  const serverList = snap?.taughtPeriodsByClass?.[classId] ?? snap?.taughtPeriods;
  if (Array.isArray(serverList)) {
    persistLocalTaughtPeriods(tenantId, classId, serverList);
    return serverList;
  }
  return local;
}

export async function setTaughtPeriodForClass(
  tenantId: string,
  classId: string,
  period: number,
  taught?: boolean
): Promise<number[]> {
  const optimistic = toggleTaughtPeriod(getLocalTaughtPeriods(tenantId, classId), period, taught);
  persistLocalTaughtPeriods(tenantId, classId, optimistic);
  const data = await postClassroomSync({
    action: 'set_taught_period',
    tenantId,
    classId,
    period,
    taught,
  });
  if (Array.isArray(data?.taughtPeriods)) {
    persistLocalTaughtPeriods(tenantId, classId, data.taughtPeriods);
    return data.taughtPeriods;
  }
  return optimistic;
}

type SseConnectionEntry = {
  es: EventSource;
  refCount: number;
};

const sharedSsePool = new Map<string, SseConnectionEntry>();

function acquireSharedSse(tenantId: string, roomId: string): () => void {
  if (typeof window === 'undefined' || !('EventSource' in window)) return () => {};
  const poolKey = `${tenantId}:${roomId}`;
  let entry = sharedSsePool.get(poolKey);

  if (!entry) {
    const qs = new URLSearchParams({ tenantId, roomId });
    const es = new EventSource(`${getAssetUrl('/api/classroom-sync/stream/')}?${qs.toString()}`);

    es.addEventListener('classroom_state', (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data);
        if (parsed?.state) {
          window.dispatchEvent(
            new CustomEvent('thso_sse_classroom_state', {
              detail: {
                tenantId,
                roomId,
                state: parsed.state,
                taughtPeriods: parsed.taughtPeriods,
              },
            })
          );
        }
      } catch {}
    });

    es.addEventListener('taught_periods', (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data);
        if (parsed?.classId && Array.isArray(parsed?.taughtPeriods)) {
          persistLocalTaughtPeriods(tenantId, parsed.classId, parsed.taughtPeriods);
        }
      } catch {}
    });

    es.addEventListener('submissions_updated', (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data);
        window.dispatchEvent(
          new CustomEvent('thso_sse_submissions_updated', {
            detail: { tenantId, kind: parsed?.kind, updatedAt: parsed?.updatedAt },
          })
        );
      } catch {}
    });

    entry = { es, refCount: 0 };
    sharedSsePool.set(poolKey, entry);
  }

  entry.refCount += 1;

  return () => {
    const current = sharedSsePool.get(poolKey);
    if (!current) return;
    current.refCount -= 1;
    if (current.refCount <= 0) {
      try {
        current.es.close();
      } catch {}
      sharedSsePool.delete(poolKey);
    }
  };
}

export function subscribeToSubmissionUpdates(
  tenantId: string,
  roomId: string,
  callback: () => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const releaseSse = acquireSharedSse(tenantId, roomId);
  const onUpdate = (e: Event) => {
    const ce = e as CustomEvent<{ tenantId: string }>;
    if (!ce.detail || ce.detail.tenantId === tenantId) {
      callback();
    }
  };
  window.addEventListener('thso_sse_submissions_updated', onUpdate);
  return () => {
    window.removeEventListener('thso_sse_submissions_updated', onUpdate);
    releaseSse();
  };
}

export function subscribeToTaughtPeriods(
  tenantId: string,
  classId: string,
  callback: (taughtPeriods: number[]) => void
): () => void {
  if (typeof window === 'undefined' || !classId) return () => {};
  let active = true;

  const syncNow = async () => {
    const list = await fetchTaughtPeriods(tenantId, classId);
    if (active) callback(list);
  };

  syncNow();

  const onLocal = (e: Event) => {
    const ce = e as CustomEvent<{ tenantId: string; classId: string; taughtPeriods: number[] }>;
    if (ce.detail && ce.detail.tenantId === tenantId && ce.detail.classId === classId) {
      callback(ce.detail.taughtPeriods);
    }
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key === taughtStorageKey(tenantId, classId) && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) callback(parsed);
      } catch {}
    }
  };

  window.addEventListener('thso_taught_periods_update', onLocal);
  window.addEventListener('storage', onStorage);

  const releaseSse = acquireSharedSse(tenantId, getActiveTenantContext().roomId);

  const pollId = setInterval(() => {
    fetchTaughtPeriods(tenantId, classId).then((list) => {
      if (active) callback(list);
    });
  }, 3000);

  return () => {
    active = false;
    clearInterval(pollId);
    releaseSse();
    window.removeEventListener('thso_taught_periods_update', onLocal);
    window.removeEventListener('storage', onStorage);
  };
}

export function getDefaultClassroomState(
  tenantId?: string,
  roomId?: string,
  roomName?: string
): ClassroomControlState {
  const ctx = getActiveTenantContext();
  const base = createInitialClassroomState({
    tenantId: tenantId || ctx.tenantId,
    roomId: roomId || ctx.roomId,
    roomName: roomName || ctx.roomName,
    activeGrade: 7,
    activeClassId: (tenantId || ctx.tenantId) === 'mao-dien' ? 'c-7a11' : 'demo-7a1',
    activeClassName: (tenantId || ctx.tenantId) === 'mao-dien' ? 'Lớp 7A11' : 'Lớp 7A1',
    classStudents: [],
    capacity: 24,
  });
  return { ...base, updatedAt: 1 };
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
  const localCurrent = getClassroomState(tenantId, roomId);
  const snap = await fetchServerClassroomSnapshot(tenantId, roomId);
  if (snap?.state) {
    const merged = mergeClassroomState(localCurrent, snap.state);
    persistLocalState(tenantId, roomId, merged);
    if (merged.activeClassId && Array.isArray(snap.taughtPeriods)) {
      persistLocalTaughtPeriods(tenantId, merged.activeClassId, snap.taughtPeriods);
    }
    return merged;
  }

  const hasAssigned = localCurrent.machines.some((m) => Boolean(m.student1Code));
  if (hasAssigned) return localCurrent;

  const [classes, students] = await Promise.all([
    getClassesByTenant(tenantId),
    getStudentsByTenant(tenantId),
  ]);
  const targetClass =
    classes.find((c) => c.id === localCurrent.activeClassId) ||
    classes.find((c) => c.grade === localCurrent.activeGrade) ||
    classes[0];
  if (!targetClass) return localCurrent;

  const classStudents = students.filter((s) => s.classId === targetClass.id);
  const hydrated: ClassroomControlState = {
    ...localCurrent,
    activeClassId: targetClass.id,
    activeClassName: targetClass.name,
    activeGrade: targetClass.grade,
    machines: buildMachinesForClass(classStudents, targetClass.name, 24),
    updatedAt: localCurrent.updatedAt > 1 ? localCurrent.updatedAt : 2,
  };
  persistLocalState(tenantId, roomId, hydrated);
  return hydrated;
}

export function updateClassroomState(
  updater: (prev: ClassroomControlState) => ClassroomControlState,
  tenantId?: string,
  roomId?: string,
  options?: { markTaughtPeriod?: boolean; skipServer?: boolean }
): ClassroomControlState {
  const ctx = getActiveTenantContext();
  const tId = tenantId || ctx.tenantId;
  const rId = roomId || ctx.roomId;
  const current = getClassroomState(tId, rId);
  const next = updater(current);
  next.tenantId = tId;
  next.roomId = rId;
  next.updatedAt = Date.now();

  persistLocalState(tId, rId, next);

  if (options?.markTaughtPeriod && next.isLive && next.activePeriod > 0 && next.activeClassId) {
    const taught = toggleTaughtPeriod(
      getLocalTaughtPeriods(tId, next.activeClassId),
      next.activePeriod,
      true
    );
    persistLocalTaughtPeriods(tId, next.activeClassId, taught);
  }

  if (!options?.skipServer) {
    postClassroomSync({
      action: 'set_state',
      tenantId: tId,
      roomId: rId,
      state: next,
      markTaughtPeriod: Boolean(options?.markTaughtPeriod),
    });
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
  return updateClassroomState(
    (prev) => applyLiveBroadcast(prev, isLive, Date.now(), timeLabel),
    undefined,
    undefined,
    { markTaughtPeriod: isLive }
  );
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
  const goLive = params.autoLive ?? true;

  return updateClassroomState(
    (prev) => {
      const durMin = prev.activityDurations.discovery || 10;
      const durSec = durMin * 60;

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
    },
    undefined,
    undefined,
    { markTaughtPeriod: goLive }
  );
}

export function updateMachineScore(
  machineId: number,
  activity: ClassroomActivityKey,
  score: number,
  practicalFileName?: string,
  comment?: string
): ClassroomControlState {
  const ctx = getActiveTenantContext();
  const next = updateClassroomState(
    (prev) => applyMachineScore(prev, machineId, activity, score, practicalFileName, comment),
    ctx.tenantId,
    ctx.roomId,
    { skipServer: true }
  );
  postClassroomSync({
    action: 'machine_score',
    tenantId: ctx.tenantId,
    roomId: ctx.roomId,
    machineId,
    activity,
    score,
    practicalFileName,
    comment,
    fallbackState: next,
  });
  return next;
}

export function awardStarToMachine(machineId: number): ClassroomControlState {
  const ctx = getActiveTenantContext();
  const timeLabel = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const next = updateClassroomState(
    (prev) => applyAwardStar(prev, machineId, timeLabel),
    ctx.tenantId,
    ctx.roomId,
    { skipServer: true }
  );
  postClassroomSync({
    action: 'award_star',
    tenantId: ctx.tenantId,
    roomId: ctx.roomId,
    machineId,
    timeLabel,
  });
  return next;
}

export function sendStudentHelpRequest(
  machineId: number,
  machineName: string,
  studentName: string,
  className: string,
  message: string
): ClassroomControlState {
  const ctx = getActiveTenantContext();
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
  const next = updateClassroomState(
    (prev) => applyHelpRequest(prev, req),
    ctx.tenantId,
    ctx.roomId,
    { skipServer: true }
  );
  postClassroomSync({
    action: 'help_request',
    tenantId: ctx.tenantId,
    roomId: ctx.roomId,
    request: req,
    fallbackState: next,
  });
  return next;
}

export function resolveHelpRequest(requestId: string): ClassroomControlState {
  const ctx = getActiveTenantContext();
  const next = updateClassroomState(
    (prev) => applyResolveHelpRequest(prev, requestId),
    ctx.tenantId,
    ctx.roomId,
    { skipServer: true }
  );
  postClassroomSync({
    action: 'resolve_help',
    tenantId: ctx.tenantId,
    roomId: ctx.roomId,
    requestId,
  });
  return next;
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

  let active = true;
  let lastUpdatedAt = getClassroomState(tId, rId).updatedAt;

  const deliverState = (incoming: ClassroomControlState) => {
    if (!active) return;
    const local = getClassroomState(tId, rId);
    const merged = mergeClassroomState(local, incoming);
    if (
      merged.updatedAt !== lastUpdatedAt ||
      merged.isLive !== local.isLive ||
      merged.activePeriod !== local.activePeriod
    ) {
      lastUpdatedAt = merged.updatedAt;
      try {
        localStorage.setItem(key, JSON.stringify(merged));
      } catch {}
      callback(merged);
    }
  };

  // Immediate server sync (solves Edge <-> Chrome isolation)
  const syncFromServer = async () => {
    const snap = await fetchServerClassroomSnapshot(tId, rId);
    if (snap?.state) {
      deliverState(snap.state);
    }
    if (snap?.taughtPeriodsByClass) {
      for (const [clsId, periods] of Object.entries(snap.taughtPeriodsByClass)) {
        persistLocalTaughtPeriods(tId, clsId, periods);
      }
    }
  };
  syncFromServer();

  const handleLocal = (e: Event) => {
    const ce = e as CustomEvent<ClassroomControlState>;
    if (ce.detail && ce.detail.tenantId === tId && ce.detail.roomId === rId) {
      lastUpdatedAt = ce.detail.updatedAt;
      callback(ce.detail);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === key && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        lastUpdatedAt = parsed.updatedAt || lastUpdatedAt;
        callback(parsed);
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
        if (ev.data) {
          lastUpdatedAt = ev.data.updatedAt || lastUpdatedAt;
          callback(ev.data);
        }
      };
    } catch {
      // Ignore unsupported
    }
  }

  const onSseClassroomState = (e: Event) => {
    const ce = e as CustomEvent<{
      tenantId: string;
      roomId: string;
      state: ClassroomControlState;
      taughtPeriods?: number[];
    }>;
    if (ce.detail && ce.detail.tenantId === tId && ce.detail.roomId === rId) {
      deliverState(ce.detail.state);
      if (ce.detail.state.activeClassId && Array.isArray(ce.detail.taughtPeriods)) {
        persistLocalTaughtPeriods(tId, ce.detail.state.activeClassId, ce.detail.taughtPeriods);
      }
    }
  };
  window.addEventListener('thso_sse_classroom_state', onSseClassroomState);
  const releaseSse = acquireSharedSse(tId, rId);

  // Lightweight polling safety net in case SSE pauses or disconnects across browsers
  const pollId = setInterval(() => {
    syncFromServer();
  }, 1800);

  let sbChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
  if (isSupabaseConfigured && supabase) {
    try {
      sbChannel = supabase
        .channel(channelName)
        .on('broadcast', { event: 'state_change' }, ({ payload }) => {
          if (payload) {
            deliverState(payload as ClassroomControlState);
          }
        })
        .subscribe();
    } catch {
      // Ignore realtime fallback
    }
  }

  return () => {
    active = false;
    clearInterval(pollId);
    releaseSse();
    window.removeEventListener('thso_sse_classroom_state', onSseClassroomState);
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
