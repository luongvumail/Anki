import { StateCreator } from 'zustand';
import { getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth } from '../../lib/firebase';
import { DEFAULT_SRS_STATE, SRSGrade, calculateSRS } from '../../lib/srs';
import { Card, Deck } from './types';
import { getUserId, cardsRef, cardRef, decksRef } from './firestoreHelpers';
import { UISlice } from './uiSlice';
import { DeckSlice } from './deckSlice';

export interface CardSlice {
  cards: Record<string, Card[]>; // deckId → cards
  fetchCards: (deckId: string) => Promise<Card[]>;
  addCard: (card: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCard: (cardId: string, deckId: string, updates: Partial<Card>) => Promise<void>;
  deleteCard: (cardId: string, deckId: string) => Promise<void>;
  gradeCard: (card: Card, grade: SRSGrade) => Promise<void>;
  resetDeckProgress: (deckId: string) => Promise<void>;
  findExistingCard: (character: string, deckId?: string) => Card | undefined;
}

export const createCardSlice: StateCreator<CardSlice & UISlice & DeckSlice, [], [], CardSlice> = (set, get) => ({
  cards: {},
  fetchCards: async (deckId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    set({ isLoading: true });
    try {
      const snap = await getDocs(cardsRef(uid, deckId));
      const cards = snap.docs.map(d => ({ id: d.id, ...d.data() } as Card));
      set(s => ({ cards: { ...s.cards, [deckId]: cards }, isLoading: false }));
      return cards;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return [];
    }
  },

  addCard: async (cardData) => {
    const uid = getUserId();
    const ref = doc(cardsRef(uid, cardData.deckId));
    const card: Card = {
      id: ref.id,
      ...cardData,
      srs: cardData.srs || DEFAULT_SRS_STATE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, card);

    // Update deck card count
    const deckDocRef = doc(decksRef(uid), cardData.deckId);
    const deckSnap = await getDoc(deckDocRef);
    if (deckSnap.exists()) {
      const d = deckSnap.data() as Deck;
      await updateDoc(deckDocRef, { cardCount: (d.cardCount || 0) + 1 });
    }

    set(s => {
      const existing = s.cards[cardData.deckId] || [];
      return { cards: { ...s.cards, [cardData.deckId]: [...existing, card] } };
    });
  },

  updateCard: async (cardId, deckId, updates) => {
    const uid = getUserId();
    await updateDoc(cardRef(uid, deckId, cardId), { ...updates, updatedAt: new Date().toISOString() });
    set(s => {
      const existing = s.cards[deckId] || [];
      return {
        cards: {
          ...s.cards,
          [deckId]: existing.map(c => c.id === cardId ? { ...c, ...updates } : c),
        },
      };
    });
  },

  deleteCard: async (cardId, deckId) => {
    const uid = getUserId();
    await deleteDoc(cardRef(uid, deckId, cardId));
    set(s => ({
      cards: {
        ...s.cards,
        [deckId]: (s.cards[deckId] || []).filter(c => c.id !== cardId),
      },
    }));
  },

  gradeCard: async (card, grade) => {
    const newSRS = calculateSRS(grade, card.srs);
    await get().updateCard(card.id, card.deckId, { srs: newSRS });
  },

  resetDeckProgress: async (deckId) => {
    const uid = getUserId();
    const snap = await getDocs(cardsRef(uid, deckId));
    const now = new Date().toISOString();
    const resets = snap.docs.map(d =>
      updateDoc(d.ref, { srs: DEFAULT_SRS_STATE, updatedAt: now })
    );
    await Promise.all(resets);
    set(s => ({
      cards: {
        ...s.cards,
        [deckId]: (s.cards[deckId] || []).map(c => ({ ...c, srs: DEFAULT_SRS_STATE, updatedAt: now })),
      },
    }));
  },

  findExistingCard: (character, deckId) => {
    const q = character.trim().toLowerCase();
    if (!q) return undefined;
    const cardsState = get().cards;
    if (deckId && cardsState[deckId]) {
      return cardsState[deckId].find(
        c => c.character.trim().toLowerCase() === q || c.pinyin.trim().toLowerCase() === q
      );
    }
    for (const dId of Object.keys(cardsState)) {
      const match = cardsState[dId].find(
        c => c.character.trim().toLowerCase() === q || c.pinyin.trim().toLowerCase() === q
      );
      if (match) return match;
    }
    return undefined;
  },
});
