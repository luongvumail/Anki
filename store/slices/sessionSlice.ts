import { StateCreator } from 'zustand';
import { isDue, SRS_GRADES } from '../../lib/srs';
import { Card, StudySession } from './types';
import { CardSlice } from './cardSlice';

export interface SessionSlice {
  session: StudySession | null;
  startSession: (deckId: string) => Promise<void>;
  endSession: () => void;
  advanceSession: (card: Card, grade: number) => void;
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

  advanceSession: (card, grade) => {
    set((s) => {
      if (!s.session) return { session: null };
      const updatedQueue = [...s.session.queue];
      if (grade === SRS_GRADES.AGAIN) {
        const currentCards = s.cards[card.deckId] || [];
        const latestCard = currentCards.find((c) => c.id === card.id) || card;
        updatedQueue.push(latestCard);
      }
      return {
        session: {
          ...s.session,
          queue: updatedQueue,
          currentIndex: s.session.currentIndex + 1,
          reviewedCount: s.session.reviewedCount + 1,
          correctCount: grade >= 3 ? s.session.correctCount + 1 : s.session.correctCount,
        },
      };
    });
  },
});
