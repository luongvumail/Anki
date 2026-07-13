import * as SQLite from 'expo-sqlite';

// Open the database synchronously
export const db = SQLite.openDatabaseSync('anki.db');

/**
 * Initializes local database tables for offline support
 */
export function initLocalDB() {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS local_vocabulary (
        id TEXT PRIMARY KEY,
        simplified TEXT UNIQUE NOT NULL,
        traditional TEXT,
        pinyin TEXT NOT NULL,
        han_viet TEXT NOT NULL,
        definition_vi TEXT NOT NULL,
        audio_url TEXT,
        radicals_json TEXT
      );

      CREATE TABLE IF NOT EXISTS local_progress (
        vocabulary_id TEXT PRIMARY KEY,
        status TEXT CHECK(status IN ('learning', 'reviewing', 'mastered')) DEFAULT 'learning' NOT NULL,
        interval_days INTEGER DEFAULT 0 NOT NULL,
        ease_factor REAL DEFAULT 2.5 NOT NULL,
        repetitions INTEGER DEFAULT 0 NOT NULL,
        next_review_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL, -- 'INSERT' | 'UPDATE' | 'UPSERT'
        table_name TEXT NOT NULL, -- 'user_progress'
        payload TEXT NOT NULL, -- JSON stringified record
        created_at TEXT NOT NULL
      );
    `);
    console.log('Local SQLite Database initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize local SQLite database:', error);
  }
}

// Local vocabulary helper methods
export const localVocab = {
  upsert: (word: {
    id: string;
    simplified: string;
    traditional?: string | null;
    pinyin: string;
    han_viet: string;
    definition_vi: string;
    audio_url?: string | null;
    radicals_json?: string | null;
  }) => {
    db.runSync(
      `INSERT OR REPLACE INTO local_vocabulary 
      (id, simplified, traditional, pinyin, han_viet, definition_vi, audio_url, radicals_json) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        word.id,
        word.simplified,
        word.traditional || null,
        word.pinyin,
        word.han_viet,
        word.definition_vi,
        word.audio_url || null,
        word.radicals_json || null,
      ]
    );
  },

  getAll: () => {
    return db.getAllSync('SELECT * FROM local_vocabulary');
  },

  getById: (id: string) => {
    return db.getFirstSync('SELECT * FROM local_vocabulary WHERE id = ?', [id]);
  },
};

// Local progress helper methods
export const localProgress = {
  upsert: (progress: {
    vocabulary_id: string;
    status: 'learning' | 'reviewing' | 'mastered';
    interval_days: number;
    ease_factor: number;
    repetitions: number;
    next_review_at: string;
  }) => {
    const now = new Date().toISOString();
    db.runSync(
      `INSERT OR REPLACE INTO local_progress 
      (vocabulary_id, status, interval_days, ease_factor, repetitions, next_review_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        progress.vocabulary_id,
        progress.status,
        progress.interval_days,
        progress.ease_factor,
        progress.repetitions,
        progress.next_review_at,
        now,
      ]
    );
  },

  getAll: () => {
    return db.getAllSync('SELECT * FROM local_progress');
  },

  getDueProgress: (nowStr: string) => {
    return db.getAllSync(
      `SELECT * FROM local_progress WHERE datetime(next_review_at) <= datetime(?)`,
      [nowStr]
    );
  },

  getById: (vocabularyId: string) => {
    return db.getFirstSync<any>(
      'SELECT * FROM local_progress WHERE vocabulary_id = ?',
      [vocabularyId]
    );
  },

  clearAll: () => {
    db.runSync('DELETE FROM local_progress');
    db.runSync('DELETE FROM local_vocabulary');
  }
};

// Sync queue helper methods
export const localSyncQueue = {
  enqueue: (action: 'INSERT' | 'UPDATE' | 'UPSERT', tableName: string, payload: object) => {
    const now = new Date().toISOString();
    db.runSync(
      `INSERT INTO sync_queue (action, table_name, payload, created_at) VALUES (?, ?, ?, ?)`,
      [action, tableName, JSON.stringify(payload), now]
    );
  },

  getQueue: () => {
    return db.getAllSync<any>('SELECT * FROM sync_queue ORDER BY id ASC');
  },

  dequeue: (id: number) => {
    db.runSync('DELETE FROM sync_queue WHERE id = ?', [id]);
  },
};
