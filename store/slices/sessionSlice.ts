import { StateCreator } from 'zustand';
import { isDue } from '../../lib/srs';
import { StudySession } from './types';
import { CardSlice } from './cardSlice';

export interface SessionSlice {
  session: StudySession | null;
  startSession: (deckId: string) => Promise<void>;
  endSession: () => void;
}

export const createSessionSlice: StateCreator<SessionSlice & CardSlice, [], [], SessionSlice> = (set, get) => ({
  session: null,

  startSession: async (deckId) => {
    const cards = await get().fetchCards(deckId);
    const dueCards = cards.filter(c => isDue(c.srs));
    // Put new cards (0 repetitions) first, then due cards
    const newCards = dueCards.filter(c => c.srs.repetitions === 0);
    const reviewCards = dueCards.filter(c => c.srs.repetitions > 0);
    const queue = [...newCards, ...reviewCards];

    set({
      session: {
        deckId,
        queue,
        currentIndex: 0,
        reviewedCount: 0,
        correctCount: 0,
        startTime: new Date(),
      },
    });
  },

  endSession: () => set({ session: null }),
});
