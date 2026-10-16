import { create } from "zustand";
import { Card, Deck, StudySession, UserProgressState } from "./slices/types";
import { AuthSlice, createAuthSlice } from "./slices/authSlice";
import { DeckSlice, createDeckSlice } from "./slices/deckSlice";
import { CardSlice, createCardSlice } from "./slices/cardSlice";
import { UISlice, createUISlice } from "./slices/uiSlice";
import { createUserProgressSlice } from "./slices/userProgressSlice";

export type { Card, Deck, StudySession, UserProgressState };

export type AppState = AuthSlice & DeckSlice & CardSlice & UISlice & UserProgressState;

export const useStore = create<AppState>((set, get, api) => ({
  ...createAuthSlice(set, get, api),
  ...createUISlice(set, get, api),
  ...createDeckSlice(set, get, api),
  ...createCardSlice(set, get, api),
  ...createUserProgressSlice(set, get, api),
}));
