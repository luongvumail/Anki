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
        radicals_json TEXT,
        example_zh TEXT,
        example_pinyin TEXT,
        example_vi TEXT
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

    // Migration: add example columns to existing local DB installations.
    // SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we try/catch each.
    for (const col of ['example_zh', 'example_pinyin', 'example_vi']) {
      try {
        db.execSync(`ALTER TABLE local_vocabulary ADD COLUMN ${col} TEXT;`);
      } catch {
        // Column already exists — safe to ignore
      }
    }

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
    example_zh?: string | null;
    example_pinyin?: string | null;
    example_vi?: string | null;
  }) => {
    db.runSync(
      `INSERT OR REPLACE INTO local_vocabulary 
      (id, simplified, traditional, pinyin, han_viet, definition_vi, audio_url, radicals_json,
       example_zh, example_pinyin, example_vi) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        word.id,
        word.simplified,
        word.traditional || null,
        word.pinyin,
        word.han_viet,
        word.definition_vi,
        word.audio_url || null,
        word.radicals_json || null,
        word.example_zh || null,
        word.example_pinyin || null,
        word.example_vi || null,
      ],
    );
  },

  getAll: () => {
    return db.getAllSync('SELECT * FROM local_vocabulary');
  },

  getAllWithProgress: () => {
    return db.getAllSync<any>(
      `SELECT v.*, p.status, p.interval_days, p.repetitions, p.next_review_at 
       FROM local_vocabulary v 
       LEFT JOIN local_progress p ON v.id = p.vocabulary_id`,
    );
  },

  getById: (id: string) => {
    return db.getFirstSync('SELECT * FROM local_vocabulary WHERE id = ?', [id]);
  },

  delete: (id: string) => {
    db.runSync('DELETE FROM local_vocabulary WHERE id = ?', [id]);
    db.runSync('DELETE FROM local_progress WHERE vocabulary_id = ?', [id]);
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
      ],
    );
  },

  getAll: () => {
    return db.getAllSync('SELECT * FROM local_progress');
  },

  getDueProgress: (nowStr: string) => {
    return db.getAllSync(
      `SELECT * FROM local_progress WHERE datetime(next_review_at) <= datetime(?)`,
      [nowStr],
    );
  },

  getById: (vocabularyId: string) => {
    return db.getFirstSync<any>('SELECT * FROM local_progress WHERE vocabulary_id = ?', [
      vocabularyId,
    ]);
  },

  getStats: () => {
    const totalVocab = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM local_vocabulary',
    );
    const totalProgress = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM local_progress',
    );
    const statusCounts = db.getAllSync<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM local_progress GROUP BY status',
    );
    const history = db.getAllSync<{ study_date: string; count: number }>(
      `SELECT date(updated_at) as study_date, COUNT(*) as count 
       FROM local_progress 
       GROUP BY study_date 
       ORDER BY study_date DESC 
       LIMIT 7`,
    );
    return {
      totalVocab: totalVocab?.count || 0,
      totalProgress: totalProgress?.count || 0,
      statusCounts,
      history,
    };
  },

  clearAll: () => {
    db.runSync('DELETE FROM local_progress');
    db.runSync('DELETE FROM local_vocabulary');
  },
};

// Sync queue helper methods
export const localSyncQueue = {
  enqueue: (
    action: 'INSERT' | 'UPDATE' | 'UPSERT' | 'DELETE',
    tableName: string,
    payload: object,
  ) => {
    const now = new Date().toISOString();
    db.runSync(
      `INSERT INTO sync_queue (action, table_name, payload, created_at) VALUES (?, ?, ?, ?)`,
      [action, tableName, JSON.stringify(payload), now],
    );
  },

  getQueue: () => {
    return db.getAllSync<any>('SELECT * FROM sync_queue ORDER BY id ASC');
  },

  dequeue: (id: number) => {
    db.runSync('DELETE FROM sync_queue WHERE id = ?', [id]);
  },
};
