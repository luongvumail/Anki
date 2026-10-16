import { StateCreator } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";
import { UserProgressState } from "./types";
import { AuthSlice } from "./authSlice";
import { getLevelInfo, ALL_BADGES, LEVEL_TIERS } from "../../lib/levelSystem";

export { getLevelInfo, ALL_BADGES, LEVEL_TIERS };

const ASYNC_KEY_XP = "@anki_user_xp";
const ASYNC_KEY_BADGES = "@anki_user_badges";

async function syncProgressToSupabase(userId: string, xp: number, unlockedBadgeIds: string[]) {
  if (!userId) return;
  try {
    await supabase.from("user_progress").upsert({
      user_id: userId,
      xp,
      unlocked_badge_ids: unlockedBadgeIds,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[userProgressSlice] Sync to Supabase failed:", e);
  }
}

export const createUserProgressSlice: StateCreator<
  UserProgressState & AuthSlice,
  [],
  [],
  UserProgressState
> = (set, get) => ({
  xp: 0,
  unlockedBadgeIds: [],

  fetchUserProgress: async () => {
    try {
      let xp = 0;
      let unlockedBadgeIds: string[] = [];

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        set({ xp: 0, unlockedBadgeIds: [] });
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_progress")
          .select("xp, unlocked_badge_ids")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && data) {
          xp = data.xp ?? 0;
          unlockedBadgeIds = data.unlocked_badge_ids || [];
        } else if (!data) {
          // Brand new user: initialize user_progress row in Supabase
          xp = 0;
          unlockedBadgeIds = [];
          await supabase.from("user_progress").upsert({
            user_id: user.id,
            xp: 0,
            unlocked_badge_ids: [],
            updated_at: new Date().toISOString(),
          });
        }
      } catch (sbErr) {
        console.warn("[userProgressSlice] Supabase user_progress fetch failed:", sbErr);
      }

      set({ xp, unlockedBadgeIds });
      await AsyncStorage.setItem(`${ASYNC_KEY_XP}_${user.id}`, xp.toString());
      await AsyncStorage.setItem(
        `${ASYNC_KEY_BADGES}_${user.id}`,
        JSON.stringify(unlockedBadgeIds),
      );
    } catch (err) {
      console.warn("[userProgressSlice] fetchUserProgress failed:", err);
    }
  },

  addXP: async (amount: number) => {
    const newXP = get().xp + amount;
    const badges = get().unlockedBadgeIds;
    set({ xp: newXP });
    const userId = get().userId;
    if (userId) {
      await AsyncStorage.setItem(`${ASYNC_KEY_XP}_${userId}`, newXP.toString());
      syncProgressToSupabase(userId, newXP, badges);
    }
  },

  unlockBadge: async (badgeId: string) => {
    const current = get().unlockedBadgeIds || [];
    if (!current.includes(badgeId)) {
      const updated = [...current, badgeId];
      const xp = get().xp;
      set({ unlockedBadgeIds: updated });
      const userId = get().userId;
      if (userId) {
        await AsyncStorage.setItem(`${ASYNC_KEY_BADGES}_${userId}`, JSON.stringify(updated));
        syncProgressToSupabase(userId, xp, updated);
      }
    }
  },

  checkAndUnlockBadges: async (streak = 0, learnedCards = 0) => {
    const current = get().unlockedBadgeIds || [];
    const newUnlocked = [...current];
    let changed = false;

    ALL_BADGES.forEach((badge) => {
      if (!newUnlocked.includes(badge.id)) {
        if (badge.category === "streak" && streak >= badge.target) {
          newUnlocked.push(badge.id);
          changed = true;
        } else if (badge.category === "vocab" && learnedCards >= badge.target) {
          newUnlocked.push(badge.id);
          changed = true;
        }
      }
    });

    if (changed) {
      const xp = get().xp;
      set({ unlockedBadgeIds: newUnlocked });
      const userId = get().userId;
      if (userId) {
        await AsyncStorage.setItem(`${ASYNC_KEY_BADGES}_${userId}`, JSON.stringify(newUnlocked));
        syncProgressToSupabase(userId, xp, newUnlocked);
      }
    }
  },
});
