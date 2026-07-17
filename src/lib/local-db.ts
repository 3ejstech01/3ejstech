/**
 * local-db.ts
 *
 * IndexedDB wrapper for fast local caching.
 * All reads/writes go through IndexedDB first, then sync to remote in background.
 */

const DB_NAME = '3jes_local_db';
const DB_VERSION = 3;

const STORES = ['installations', 'modems', 'users', 'historicaldata', 'syncQueue', 'recordSnapshots'] as const;
type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDB(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error('IndexedDB not available'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
  });

  return dbPromise;
}

async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function getById<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function put<T>(store: StoreName, item: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function remove(store: StoreName, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearStore(store: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function putBatch<T>(store: StoreName, items: T[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    for (const item of items) os.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function getCacheStatus(store: StoreName): Promise<{ count: number; lastFetched: number | null }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const countRequest = tx.objectStore(store).count();
    countRequest.onsuccess = () => resolve({ count: countRequest.result, lastFetched: null });
    countRequest.onerror = () => reject(countRequest.error);
  });
}

async function exportAll(): Promise<Record<string, unknown[]>> {
  const result: Record<string, unknown[]> = {};
  for (const store of STORES) {
    result[store] = await getAll<unknown>(store);
  }
  return result;
}

async function importAll<T>(data: Record<string, unknown[]>): Promise<void> {
  for (const store of STORES) {
    if (data[store] && Array.isArray(data[store])) {
      await clearStore(store);
      await putBatch(store, data[store] as T[]);
    }
  }
}

async function clearAll(): Promise<void> {
  for (const store of STORES) {
    await clearStore(store);
  }
}

export const localDb = {
  getAll,
  getById,
  put,
  remove,
  clear: clearStore,
  clearStore,
  putBatch,
  getCacheStatus,
  exportAll,
  importAll,
  clearAll,
};
