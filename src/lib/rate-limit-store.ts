const DB = '3ejs_rl_db';
export function available(): boolean { return typeof indexedDB !== 'undefined'; }

async function read(key: string): Promise<number> {
  return new Promise((res) => {
    const tx = indexedDB.open(DB, 1);
    tx.onupgradeneeded = () => {
      const db = tx.result;
      if (!db.objectStoreNames.contains('b')) db.createObjectStore('b', { keyPath: 'k' });
    };
    tx.onsuccess = () => {
      const db = tx.result;
      const r = db.transaction('b', 'readonly').objectStore('b').get(key);
      r.onsuccess = () => res((r.result?.v as number) || 0);
    };
  });
}

async function write(key: string, v: number): Promise<void> {
  return new Promise((res) => {
    const tx = indexedDB.open(DB, 1);
    tx.onupgradeneeded = () => {
      const db = tx.result;
      if (!db.objectStoreNames.contains('b')) db.createObjectStore('b', { keyPath: 'k' });
    };
    tx.onsuccess = () => {
      const db = tx.result;
      const t = db.transaction('b', 'readwrite');
      t.objectStore('b').put({ k: key, v });
      t.oncomplete = () => res();
    };
  });
}

export async function bump(key: string): Promise<number> {
  if (!available()) return 1;
  const cur = await read(key);
  const next = cur + 1;
  await write(key, next);
  return next;
}