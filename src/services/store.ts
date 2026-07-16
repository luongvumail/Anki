import { create } from 'zustand';
import { calculateSRS } from '../utils/srs';
import { fetchDailyQueue, syncLocalChanges, updateStreakOnServer, QueueItem } from './sync';
import { localProgress, localSyncQueue, localReviewLogs } from './sqlite';
import { supabase } from './supabase';

// Re-export QueueItem as FlashcardItem for backward compatibility
export type FlashcardItem = QueueItem;

interface AppState {
  userId: string | null;
  profile: {
    display_name: string;
    streak: number;
    last_active_at: string;
  } | null;
  queue: FlashcardItem[];
  currentIndex: number;
  totalInQueue: number;
  completedCount: number;
  online: boolean;
  isLoading: boolean;
  isSubmittingReview: boolean;
  pendingRecovery: boolean;

  setUserId: (id: string | null) => void;
  setPendingRecovery: (val: boolean) => void;
  loadQueue: () => Promise<void>;
  submitReview: (grade: 'easy' | 'hard' | 'forgot') => Promise<void>;
  syncProgress: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

// Max times a "Forgot" card is re-introduced at the end of the queue within a
// single session. Prevents the queue from growing unbounded when a user keeps
// forgetting the same card (which would otherwise append a fresh copy on every
// swipe and stall the session — see B1/B4).
const MAX_FORGOT_REINTRO = 1;

export const useAppStore = create<AppState>((set, get) => ({
  userId: null,
  profile: null,
  queue: [],
  currentIndex: 0,
  totalInQueue: 0,
  completedCount: 0,
  online: true,
  isLoading: false,
  isSubmittingReview: false,
  pendingRecovery: false,

  setUserId: (id) => set({ userId: id }),
  setPendingRecovery: (val) => set({ pendingRecovery: val }),

  fetchProfile: async () => {
    const { userId } = get();
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, streak, last_active_at')
        .eq('id', userId)
        .single();

      if (!error && data) {
        set({
          profile: {
            display_name: data.display_name,
            streak: data.streak,
            last_active_at: data.last_active_at,
          },
        });
      }
    } catch (e) {
      console.error('Failed to fetch user profile:', e);
    }
  },

  loadQueue: async () => {
    const { userId } = get();
    if (!userId) return;

    set({ isLoading: true });
    try {
      const { queue, online } = await fetchDailyQueue(userId);
      set({
        queue,
        online,
        currentIndex: 0,
        completedCount: 0,
        totalInQueue: queue.length,
        isLoading: false,
      });
      // Update streak once per session load (not per card) then refresh profile
      if (online) {
        await updateStreakOnServer(userId);
      }
      await get().fetchProfile();
    } catch (e) {
      console.error('Failed to load queue:', e);
      set({ isLoading: false });
    }
  },

  submitReview: async (grade) => {
    const { queue, currentIndex, userId, isSubmittingReview } = get();
    if (!userId || queue.length === 0 || currentIndex >= queue.length || isSubmittingReview) return;

    set({ isSubmittingReview: true });

    try {
      const currentItem = queue[currentIndex];

      // 1. Calculate new SRS metrics using SM-2 Variant
      const currentSRS = {
        repetitions: currentItem.progress.repetitions,
        easeFactor: currentItem.progress.ease_factor,
        intervalDays: currentItem.progress.interval_days,
      };

      const updatedSRS = calculateSRS(grade, currentSRS);

      const updatedProgress = {
        vocabulary_id: currentItem.vocabulary.id,
        status: updatedSRS.status,
        interval_days: updatedSRS.intervalDays,
        ease_factor: updatedSRS.easeFactor,
        repetitions: updatedSRS.repetitions,
        next_review_at: updatedSRS.nextReviewAt.toISOString(),
      };

      // 2. Save locally in SQLite immediately
      localProgress.upsert(updatedProgress);

      // 2.5 Log the review locally
      localReviewLogs.log(currentItem.vocabulary.id, grade);

      // 3. Queue synchronization action for offline syncing
      localSyncQueue.enqueue('UPSERT', 'user_progress', updatedProgress);

      // 4. Update memory Queue structure
      const updatedQueue = [...queue];

      if (grade === 'forgot') {
        // Swipe left (Forgot): Push this card to the end of the queue for re-learning this session.
        // Limit re-introductions to MAX_FORGOT_REINTRO to prevent unbounded queue growth.
        const forgotCount = (currentItem.forgotCount ?? 0) + 1;

        if (forgotCount > MAX_FORGOT_REINTRO) {
          // Card has been re-enqueued too many times — mark as completed for this session
          set((state) => ({
            completedCount: state.completedCount + 1,
            currentIndex: state.currentIndex + 1,
          }));
        } else {
          const forgotItem = {
            ...currentItem,
            forgotCount,
            progress: updatedProgress, // Use updated progress metrics
          };

          // Remove from current index, and push to the end
          updatedQueue.splice(currentIndex, 1);
          updatedQueue.push(forgotItem);

          set({
            queue: updatedQueue,
            // We do not increment completed count or index, because the queue size did not reduce
            // and the current card was swapped. The next card moves to currentIndex automatically.
          });
        }
      } else {
        // Swipe Right (Easy) or Swipe Up (Hard): Card is completed in this session
        set((state) => ({
          completedCount: state.completedCount + 1,
          currentIndex: state.currentIndex + 1,
        }));
      }

      // 5. Fire-and-forget background sync — non-blocking, no streak update per card
      // Streak is updated at session load (loadQueue) and manual sync (syncProgress).
      syncLocalChanges().catch(() => {
        console.log('Background sync skipped (offline or network error).');
      });
    } catch (e) {
      console.error('Error submitting review:', e);
    } finally {
      set({ isSubmittingReview: false });
    }
  },

  syncProgress: async () => {
    const { userId } = get();
    set({ isLoading: true });
    try {
      await syncLocalChanges();
      // Update streak on manual sync as well
      if (userId) await updateStreakOnServer(userId);
      await get().fetchProfile();
      set({ isLoading: false });
    } catch (e) {
      console.error('Manual sync failed:', e);
      set({ isLoading: false });
    }
  },
}));
