import fs from 'node:fs';
import {
  ClassroomActivityKey,
  ClassroomControlState,
  HelpRequest,
  HomeworkSubmission,
  PracticalSubmission,
} from '@/lib/domain/types';
import {
  applyAwardStar,
  applyHelpRequest,
  applyMachineScore,
  applyResolveHelpRequest,
  mergeClassroomState,
  toggleTaughtPeriod,
} from '@/lib/domain/classroom-engine';

const STORE_FILE = '/tmp/thso-realtime-store-v1.json';

export type RealtimeEvent =
  | {
      type: 'classroom_state';
      tenantId: string;
      roomId: string;
      state: ClassroomControlState;
      taughtPeriods?: number[];
    }
  | {
      type: 'taught_periods';
      tenantId: string;
      classId: string;
      taughtPeriods: number[];
    }
  | {
      type: 'submissions_updated';
      tenantId: string;
      kind: 'practical' | 'homework';
      updatedAt: number;
    };

interface PersistedData {
  classroomStates: Record<string, ClassroomControlState>;
  taughtPeriods: Record<string, number[]>;
  practicalSubmissions: Record<string, PracticalSubmission[]>;
  homeworkSubmissions: Record<string, HomeworkSubmission[]>;
}

interface RealtimeStoreSingleton {
  data: PersistedData;
  listeners: Map<string, Set<(ev: RealtimeEvent) => void>>;
}

declare global {
  var __thsoRealtimeStore: RealtimeStoreSingleton | undefined;
}

function loadFromDisk(): PersistedData {
  const empty: PersistedData = {
    classroomStates: {},
    taughtPeriods: {},
    practicalSubmissions: {},
    homeworkSubmissions: {},
  };
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        classroomStates: parsed?.classroomStates || {},
        taughtPeriods: parsed?.taughtPeriods || {},
        practicalSubmissions: parsed?.practicalSubmissions || {},
        homeworkSubmissions: parsed?.homeworkSubmissions || {},
      };
    }
  } catch {
    // Ignore corrupt or unavailable tmp storage
  }
  return empty;
}

function saveToDisk(data: PersistedData): void {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data), 'utf-8');
  } catch {
    // Non-fatal in read-only filesystems
  }
}

function getStore(): RealtimeStoreSingleton {
  if (!globalThis.__thsoRealtimeStore) {
    globalThis.__thsoRealtimeStore = {
      data: loadFromDisk(),
      listeners: new Map(),
    };
  }
  return globalThis.__thsoRealtimeStore;
}

function roomKey(tenantId: string, roomId: string): string {
  return `${tenantId}:${roomId}`;
}

function classKey(tenantId: string, classId: string): string {
  return `${tenantId}:${classId}`;
}

function emitEvent(tenantId: string, ev: RealtimeEvent): void {
  const store = getStore();
  const set = store.listeners.get(tenantId);
  if (!set) return;
  for (const listener of set) {
    try {
      listener(ev);
    } catch {
      // Ignore closed stream listener
    }
  }
}

export function subscribeRealtimeEvents(
  tenantId: string,
  listener: (ev: RealtimeEvent) => void
): () => void {
  const store = getStore();
  let set = store.listeners.get(tenantId);
  if (!set) {
    set = new Set();
    store.listeners.set(tenantId, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) {
      store.listeners.delete(tenantId);
    }
  };
}

export function getServerClassroomState(
  tenantId: string,
  roomId: string
): ClassroomControlState | null {
  const store = getStore();
  return store.data.classroomStates[roomKey(tenantId, roomId)] || null;
}

export function getServerTaughtPeriods(tenantId: string, classId: string): number[] {
  const store = getStore();
  if (!classId) return [];
  return store.data.taughtPeriods[classKey(tenantId, classId)] || [];
}

export function getAllServerTaughtPeriodsForTenant(
  tenantId: string
): Record<string, number[]> {
  const store = getStore();
  const prefix = `${tenantId}:`;
  const result: Record<string, number[]> = {};
  for (const [k, v] of Object.entries(store.data.taughtPeriods)) {
    if (k.startsWith(prefix)) {
      result[k.slice(prefix.length)] = v;
    }
  }
  return result;
}

export function setServerTaughtPeriod(
  tenantId: string,
  classId: string,
  period: number,
  taught?: boolean
): number[] {
  const store = getStore();
  const k = classKey(tenantId, classId);
  const current = store.data.taughtPeriods[k] || [];
  const next = toggleTaughtPeriod(current, period, taught);
  store.data.taughtPeriods[k] = next;
  saveToDisk(store.data);
  emitEvent(tenantId, {
    type: 'taught_periods',
    tenantId,
    classId,
    taughtPeriods: next,
  });
  return next;
}

export function setServerClassroomState(
  tenantId: string,
  roomId: string,
  incoming: ClassroomControlState,
  markTaughtPeriod: boolean = false
): { state: ClassroomControlState; taughtPeriods: number[] } {
  const store = getStore();
  const k = roomKey(tenantId, roomId);
  const existing = store.data.classroomStates[k];
  const next = existing ? mergeClassroomState(existing, incoming) : incoming;
  store.data.classroomStates[k] = next;

  let taught = getServerTaughtPeriods(tenantId, next.activeClassId);
  if (markTaughtPeriod && next.isLive && next.activePeriod > 0 && next.activeClassId) {
    taught = toggleTaughtPeriod(taught, next.activePeriod, true);
    store.data.taughtPeriods[classKey(tenantId, next.activeClassId)] = taught;
    emitEvent(tenantId, {
      type: 'taught_periods',
      tenantId,
      classId: next.activeClassId,
      taughtPeriods: taught,
    });
  }

  saveToDisk(store.data);
  emitEvent(tenantId, {
    type: 'classroom_state',
    tenantId,
    roomId,
    state: next,
    taughtPeriods: taught,
  });

  return { state: next, taughtPeriods: taught };
}

export function mutateServerClassroomMachineScore(params: {
  tenantId: string;
  roomId: string;
  machineId: number;
  activity: ClassroomActivityKey;
  score: number;
  practicalFileName?: string;
  comment?: string;
  fallbackState?: ClassroomControlState;
}): ClassroomControlState | null {
  const store = getStore();
  const k = roomKey(params.tenantId, params.roomId);
  const base = store.data.classroomStates[k] || params.fallbackState;
  if (!base) return null;

  const updated = applyMachineScore(
    base,
    params.machineId,
    params.activity,
    params.score,
    params.practicalFileName,
    params.comment
  );
  store.data.classroomStates[k] = updated;
  saveToDisk(store.data);
  emitEvent(params.tenantId, {
    type: 'classroom_state',
    tenantId: params.tenantId,
    roomId: params.roomId,
    state: updated,
  });
  return updated;
}

export function mutateServerHelpRequest(params: {
  tenantId: string;
  roomId: string;
  request: HelpRequest;
  fallbackState?: ClassroomControlState;
}): ClassroomControlState | null {
  const store = getStore();
  const k = roomKey(params.tenantId, params.roomId);
  const base = store.data.classroomStates[k] || params.fallbackState;
  if (!base) return null;

  const updated = applyHelpRequest(base, params.request);
  store.data.classroomStates[k] = updated;
  saveToDisk(store.data);
  emitEvent(params.tenantId, {
    type: 'classroom_state',
    tenantId: params.tenantId,
    roomId: params.roomId,
    state: updated,
  });
  return updated;
}

export function mutateServerResolveHelpRequest(params: {
  tenantId: string;
  roomId: string;
  requestId: string;
}): ClassroomControlState | null {
  const store = getStore();
  const k = roomKey(params.tenantId, params.roomId);
  const base = store.data.classroomStates[k];
  if (!base) return null;

  const updated = applyResolveHelpRequest(base, params.requestId);
  store.data.classroomStates[k] = updated;
  saveToDisk(store.data);
  emitEvent(params.tenantId, {
    type: 'classroom_state',
    tenantId: params.tenantId,
    roomId: params.roomId,
    state: updated,
  });
  return updated;
}

export function mutateServerAwardStar(params: {
  tenantId: string;
  roomId: string;
  machineId: number;
  timeLabel?: string;
}): ClassroomControlState | null {
  const store = getStore();
  const k = roomKey(params.tenantId, params.roomId);
  const base = store.data.classroomStates[k];
  if (!base) return null;

  const updated = applyAwardStar(base, params.machineId, params.timeLabel);
  store.data.classroomStates[k] = updated;
  saveToDisk(store.data);
  emitEvent(params.tenantId, {
    type: 'classroom_state',
    tenantId: params.tenantId,
    roomId: params.roomId,
    state: updated,
  });
  return updated;
}

export function getServerSubmissions(tenantId: string): {
  practicalSubmissions: PracticalSubmission[];
  homeworkSubmissions: HomeworkSubmission[];
} {
  const store = getStore();
  return {
    practicalSubmissions: store.data.practicalSubmissions[tenantId] || [],
    homeworkSubmissions: store.data.homeworkSubmissions[tenantId] || [],
  };
}

export function upsertServerPracticalSubmission(sub: PracticalSubmission): PracticalSubmission[] {
  const store = getStore();
  const list = store.data.practicalSubmissions[sub.tenantId] || [];
  const enriched: PracticalSubmission = {
    ...sub,
    submittedTimestamp: sub.submittedTimestamp || Date.now(),
  };
  const idx = list.findIndex((item) => item.id === sub.id);
  const next = idx >= 0 ? list.map((item) => (item.id === sub.id ? enriched : item)) : [enriched, ...list];
  store.data.practicalSubmissions[sub.tenantId] = next.slice(0, 500);
  saveToDisk(store.data);
  emitEvent(sub.tenantId, {
    type: 'submissions_updated',
    tenantId: sub.tenantId,
    kind: 'practical',
    updatedAt: Date.now(),
  });
  return store.data.practicalSubmissions[sub.tenantId];
}

export function upsertServerHomeworkSubmission(sub: HomeworkSubmission): HomeworkSubmission[] {
  const store = getStore();
  const list = store.data.homeworkSubmissions[sub.tenantId] || [];
  const idx = list.findIndex((item) => item.id === sub.id);
  const next = idx >= 0 ? list.map((item) => (item.id === sub.id ? sub : item)) : [sub, ...list];
  store.data.homeworkSubmissions[sub.tenantId] = next.slice(0, 500);
  saveToDisk(store.data);
  emitEvent(sub.tenantId, {
    type: 'submissions_updated',
    tenantId: sub.tenantId,
    kind: 'homework',
    updatedAt: Date.now(),
  });
  return store.data.homeworkSubmissions[sub.tenantId];
}
