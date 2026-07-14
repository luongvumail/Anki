import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { localVocab, localProgress, localSyncQueue } from './sqlite';

// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------

export interface VocabularyRecord {
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
}

export interface ProgressRecord {
  vocabulary_id: string;
  status: 'learning' | 'reviewing' | 'mastered';
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  next_review_at: string;
}

export interface QueueItem {
  vocabulary: VocabularyRecord;
  progress: ProgressRecord;
}

// ---------------------------------------------------------------------------
// Network Helper
// ---------------------------------------------------------------------------

// Helper to determine if device is connected to the internet
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!state.isConnected && !!state.isInternetReachable;
}

/**
 * Downloads and caches audio files locally for offline-first usage.
 */
async function cacheAudioFile(audioUrl: string | null): Promise<string | null> {
  if (!audioUrl) return null;

  try {
    const filename = audioUrl.split('/').pop() || `audio_${Date.now()}.mp3`;
    const localUri = `${FileSystem.documentDirectory}${filename}`;

    // Check if file already exists
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      return localUri;
    }

    // Download file
    const downloadResult = await FileSystem.downloadAsync(audioUrl, localUri);
    return downloadResult.uri;
  } catch (error) {
    console.error('Failed to cache audio file:', error);
    return audioUrl; // Fallback to remote URL
  }
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/**
 * Syncs the local queue changes back to Supabase.
 * NOTE: Does NOT update the streak. Call updateStreakOnServer() separately
 * (e.g. on session load or manual sync) to avoid N+1 calls per card swipe.
 */
export async function syncLocalChanges(): Promise<void> {
  const online = await isOnline();
  if (!online) return;

  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return;

  const queue = localSyncQueue.getQueue();
  if (queue.length === 0) return;

  console.log(`Syncing ${queue.length} changes to Supabase...`);

  for (const item of queue) {
    try {
      const payload = JSON.parse(item.payload) as ProgressRecord;

      if (item.table_name === 'user_progress') {
        if (item.action === 'DELETE') {
          const { error } = await supabase
            .from('user_progress')
            .delete()
            .eq('user_id', session.user.id)
            .eq('vocabulary_id', payload.vocabulary_id);

          if (error) throw error;
        } else {
          const { error } = await supabase.from('user_progress').upsert(
            {
              user_id: session.user.id,
              vocabulary_id: payload.vocabulary_id,
              status: payload.status,
              interval_days: payload.interval_days,
              ease_factor: payload.ease_factor,
              repetitions: payload.repetitions,
              next_review_at: payload.next_review_at,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,vocabulary_id' },
          );

          if (error) throw error;
        }
      }

      // Successfully synced item, remove it from local queue
      localSyncQueue.dequeue(item.id);
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);
      // Stop syncing subsequent items to maintain chronological order
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

/**
 * Logic to update learning streak:
 * Streak increments if last active date was yesterday.
 * Streak remains same if last active date was today.
 * Streak resets to 1 if last active date was more than 1 calendar day ago.
 *
 * Called from loadQueue() and syncProgress() — NOT per card swipe.
 */
export async function updateStreakOnServer(userId: string): Promise<void> {
  try {
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('streak, last_active_at')
      .eq('id', userId)
      .single();

    if (fetchErr || !profile) return;

    const now = new Date();
    const lastActive = new Date(profile.last_active_at);

    // Calculate calendar days difference using local dates to match the user's actual day.
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfLastActive = new Date(
      lastActive.getFullYear(),
      lastActive.getMonth(),
      lastActive.getDate(),
    ).getTime();

    const msInDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((startOfToday - startOfLastActive) / msInDay);

    let newStreak = profile.streak;
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    } else if (profile.streak === 0) {
      newStreak = 1;
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        streak: newStreak,
        last_active_at: now.toISOString(),
      })
      .eq('id', userId);

    if (updateErr) throw updateErr;
  } catch (error) {
    console.error('Failed to update streak:', error);
  }
}

// ---------------------------------------------------------------------------
// Queue Fetching
// ---------------------------------------------------------------------------

/**
 * Fetches today's SRS Queue (5 new words + due reviews) and caches them locally.
 *
 * Uses an upsert-only strategy — does NOT clear existing local cache.
 * This prevents data loss if the network drops mid-sync, ensuring offline mode
 * always has the most recently downloaded cards available.
 */
export async function fetchDailyQueue(userId: string): Promise<{
  queue: QueueItem[];
  online: boolean;
}> {
  const online = await isOnline();

  if (!online) {
    console.log('App is offline. Loading cached queue from SQLite...');
    // Retrieve progress that is due and its vocabulary definitions locally
    const nowStr = new Date().toISOString();
    const dueProgress = localProgress.getDueProgress(nowStr) as ProgressRecord[];

    const result: QueueItem[] = [];
    for (const prog of dueProgress) {
      const vocab = localVocab.getById(prog.vocabulary_id) as VocabularyRecord | null;
      if (vocab) {
        result.push({ vocabulary: vocab, progress: prog });
      }
    }

    return { queue: result, online: false };
  }

  try {
    // 1. Sync any pending offline changes first
    await syncLocalChanges();

    // 2. Fetch User Progress from Supabase
    const { data: progressRecords, error: progErr } = await supabase
      .from('user_progress')
      .select('*, vocabulary(*, vocabulary_radicals(radicals(*)))')
      .eq('user_id', userId);

    if (progErr) throw progErr;

    const studiedVocabIds = progressRecords?.map((r) => r.vocabulary_id) || [];

    // 3. Fetch due progress cards
    const nowISO = new Date().toISOString();
    const dueRecords =
      progressRecords?.filter((r) => new Date(r.next_review_at) <= new Date(nowISO)) || [];

    // 4. Fetch up to 5 NEW vocabulary words (not yet studied)
    let newVocabQuery = supabase
      .from('vocabulary')
      .select('*, vocabulary_radicals(radicals(*))')
      .limit(5);

    if (studiedVocabIds.length > 0) {
      newVocabQuery = newVocabQuery.not('id', 'in', `(${studiedVocabIds.join(',')})`);
    }

    const { data: newVocabs, error: vocabErr } = await newVocabQuery;
    if (vocabErr) throw vocabErr;

    // 5. Build the complete queue and upsert to local cache
    // NOTE: No clearAll() — upsert preserves existing offline data.
    const fullQueue: QueueItem[] = [];

    // Add due words
    for (const record of dueRecords) {
      const vocab = record.vocabulary;
      const progress: ProgressRecord = {
        vocabulary_id: record.vocabulary_id,
        status: record.status,
        interval_days: record.interval_days,
        ease_factor: record.ease_factor,
        repetitions: record.repetitions,
        next_review_at: record.next_review_at,
      };

      // Cache audio and map radicals
      const cachedAudio = await cacheAudioFile(vocab.audio_url);
      const radicalsList =
        vocab.vocabulary_radicals
          ?.map((vr: { radicals: unknown }) => vr.radicals)
          .filter(Boolean) || [];
      const cachedVocab: VocabularyRecord = {
        ...vocab,
        audio_url: cachedAudio,
        radicals_json: JSON.stringify(radicalsList),
      };

      localVocab.upsert(cachedVocab);
      localProgress.upsert(progress);

      fullQueue.push({ vocabulary: cachedVocab, progress });
    }

    // Add new words
    for (const vocab of newVocabs || []) {
      const defaultProgress: ProgressRecord = {
        vocabulary_id: vocab.id,
        status: 'learning',
        interval_days: 0,
        ease_factor: 2.5,
        repetitions: 0,
        next_review_at: new Date().toISOString(), // Study immediately
      };

      // Cache audio and map radicals
      const cachedAudio = await cacheAudioFile(vocab.audio_url);
      const radicalsList =
        vocab.vocabulary_radicals
          ?.map((vr: { radicals: unknown }) => vr.radicals)
          .filter(Boolean) || [];
      const cachedVocab: VocabularyRecord = {
        ...vocab,
        audio_url: cachedAudio,
        radicals_json: JSON.stringify(radicalsList),
      };

      localVocab.upsert(cachedVocab);
      localProgress.upsert(defaultProgress);

      fullQueue.push({ vocabulary: cachedVocab, progress: defaultProgress });
    }

    return { queue: fullQueue, online: true };
  } catch (error) {
    console.error('Error fetching/syncing daily queue:', error);
    // Fallback to offline local storage on error
    const nowStr = new Date().toISOString();
    const dueProgress = localProgress.getDueProgress(nowStr) as ProgressRecord[];
    const result: QueueItem[] = [];
    for (const prog of dueProgress) {
      const vocab = localVocab.getById(prog.vocabulary_id) as VocabularyRecord | null;
      if (vocab) {
        result.push({ vocabulary: vocab, progress: prog });
      }
    }
    return { queue: result, online: false };
  }
}
