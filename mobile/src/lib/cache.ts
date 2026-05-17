import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

try {
  db = SQLite.openDatabaseSync('kabuchat_cache.db');
  db.execSync(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL,
      content TEXT NOT NULL,
      replyToId TEXT,
      createdAt INTEGER NOT NULL
    );
  `);
} catch (error) {
  console.error("Failed to initialize SQLite", error);
}

export const cacheSet = (key: string, value: any) => {
  if (!db) return;
  try {
    const strValue = JSON.stringify(value);
    db.runSync(
      'INSERT OR REPLACE INTO cache (key, value, updatedAt) VALUES (?, ?, ?)',
      key, strValue, Date.now()
    );
  } catch (e) {
    console.error("cacheSet error", e);
  }
};

export const cacheGet = <T>(key: string): T | null => {
  if (!db) return null;
  try {
    const result = db.getFirstSync<{ value: string }>('SELECT value FROM cache WHERE key = ?', key);
    if (result && result.value) {
      return JSON.parse(result.value) as T;
    }
  } catch (e) {
    console.error("cacheGet error", e);
  }
  return null;
};

export const outboxAdd = (id: string, conversationId: string, content: string, replyToId?: string) => {
  if (!db) return;
  try {
    db.runSync(
      'INSERT INTO outbox (id, conversationId, content, replyToId, createdAt) VALUES (?, ?, ?, ?, ?)',
      id, conversationId, content, replyToId || null, Date.now()
    );
  } catch (e) {
    console.error("outboxAdd error", e);
  }
};

export const outboxGet = () => {
  if (!db) return [];
  try {
    return db.getAllSync<{id: string; conversationId: string; content: string; replyToId: string | null; createdAt: number}>('SELECT * FROM outbox ORDER BY createdAt ASC');
  } catch (e) {
    console.error("outboxGet error", e);
    return [];
  }
};

export const outboxRemove = (id: string) => {
  if (!db) return;
  try {
    db.runSync('DELETE FROM outbox WHERE id = ?', id);
  } catch (e) {
    console.error("outboxRemove error", e);
  }
};
