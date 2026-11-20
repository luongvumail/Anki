import { StateCreator } from "zustand";
import { DeckSlice } from "./deckSlice";
import { CardSlice } from "./cardSlice";
import { UserProgressState } from "./types";
import { clearReviewTrackerCache } from "../../lib/reviewTracker";
import { clearHeaderUserCache } from "../../lib/userHeaderCache";
import { invalidateUserCharactersCache } from "./cardSlice";

export interface AuthSlice {
  userId: string | null;
  setUserId: (id: string | null) => void;
  resetUserState: () => void;
}

export const createAuthSlice: StateCreator<
  AuthSlice & DeckSlice & CardSlice & UserProgressState,
  [],
  [],
  AuthSlice
> = (set) => ({
  userId: null,
  setUserId: (id) => set({ userId: id }),
  resetUserState: () => {
    clearReviewTrackerCache();
    clearHeaderUserCache();
    invalidateUserCharactersCache();
    set({
      userId: null,
      decks: [],
      cards: {},
      xp: 0,
      unlockedBadgeIds: [],
    });
  },
});
