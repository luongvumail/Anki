import { create } from 'zustand';
import { Card, Deck, StudySession } from './slices/types';
import { AuthSlice, createAuthSlice } from './slices/authSlice';
import { DeckSlice, createDeckSlice } from './slices/deckSlice';
import { CardSlice, createCardSlice } from './slices/cardSlice';
import { SessionSlice, createSessionSlice } from './slices/sessionSlice';
import { UISlice, createUISlice } from './slices/uiSlice';

export type { Card, Deck, StudySession };

export type AppState = AuthSlice & DeckSlice & CardSlice & SessionSlice & UISlice;

export const useStore = create<AppState>((set, get, api) => ({
  ...createAuthSlice(set, get, api),
  ...createUISlice(set, get, api),
  ...createDeckSlice(set, get, api),
  ...createCardSlice(set, get, api),
  ...createSessionSlice(set, get, api),
}));
