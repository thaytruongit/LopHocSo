'use client';

/**
 * 0-Cost IndexedDB Persistence Layer (TinHocSoMultiTenantDB)
 * Dung lượng lưu trữ lớn (hàng trăm MB), chạy hoàn toàn cục bộ trên trình duyệt
 * Tách biệt dữ liệu theo tenantId để nhiều trường có thể dùng chung hệ thống an toàn.
 */

const DB_NAME = 'TinHocSoMultiTenantDB';
const DB_VERSION = 1;

export type StoreName =
  | 'tenants'
  | 'classes'
  | 'students'
  | 'classroom_states'
  | 'exam_results'
  | 'homework_submissions'
  | 'practical_submissions'
  | 'worksheet_submissions'
  | 'gradebook_records'
  | 'kv_meta';

const ALL_STORES: StoreName[] = [
  'tenants',
  'classes',
  'students',
  'classroom_states',
  'exam_results',
  'homework_submissions',
  'practical_submissions',
  'worksheet_submissions',
  'gradebook_records',
  'kv_meta',
];

const memoryFallback = new Map<string, Map<string, any>>();

function getMemoryStore(store: StoreName): Map<string, any> {
  let m = memoryFallback.get(store);
  if (!m) {
    m = new Map();
    memoryFallback.set(store, m);
  }
  return m;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const store of ALL_STORES) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

export async function idbGet<T extends { id: string }>(
  store: StoreName,
  id: string
): Promise<T | null> {
  const db = await openDB();
  if (!db) {
    return (getMemoryStore(store).get(id) as T) || null;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readonly');
      const os = tx.objectStore(store);
      const req = os.get(id);
      req.onsuccess = () => resolve((req.result as T) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbGetAll<T extends { id: string }>(store: StoreName): Promise<T[]> {
  const db = await openDB();
  if (!db) {
    return Array.from(getMemoryStore(store).values()) as T[];
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readonly');
      const os = tx.objectStore(store);
      const req = os.getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function idbPut<T extends { id: string }>(
  store: StoreName,
  record: T
): Promise<void> {
  getMemoryStore(store).set(record.id, record);
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      os.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function idbBulkPut<T extends { id: string }>(
  store: StoreName,
  records: T[]
): Promise<void> {
  if (records.length === 0) return;
  const mem = getMemoryStore(store);
  for (const r of records) mem.set(r.id, r);

  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      for (const r of records) os.put(r);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function idbDelete(store: StoreName, id: string): Promise<void> {
  getMemoryStore(store).delete(id);
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
