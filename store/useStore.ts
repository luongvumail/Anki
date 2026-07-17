import { create } from 'zustand';
import {
  collection, doc, setDoc, getDoc, getDocs,
  deleteDoc, updateDoc, query, where, orderBy, serverTimestamp,
  onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { DEFAULT_SRS_STATE, SRSState, SRSGrade, calculateSRS, isDue } from '../lib/srs';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Card {
  id: string;
  deckId: string;
  character: string;
  traditional?: string;
  pinyin: string;
  hanviet: string;
  translation: string;
  examples: Array<{ chinese: string; pinyin: string; vietnamese: string }>;
  radical?: string;
  strokeCount?: number;
  hskLevel?: number;
  tags?: string[];
  srs: SRSState;
  createdAt: string;
  updatedAt: string;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  cardCount: number;
  newCount: number;
  dueCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  deckId: string;
  queue: Card[];
  currentIndex: number;
  reviewedCount: number;
  correctCount: number;
  startTime: Date;
}

interface AppState {
  // Auth
  userId: string | null;
  setUserId: (id: string | null) => void;

  // Decks
  decks: Deck[];
  fetchDecks: () => Promise<void>;
  createDeck: (deck: Omit<Deck, 'id' | 'cardCount' | 'newCount' | 'dueCount' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  deleteDeck: (deckId: string) => Promise<void>;

  // Cards
  cards: Record<string, Card[]>; // deckId → cards
  fetchCards: (deckId: string) => Promise<Card[]>;
  addCard: (card: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCard: (cardId: string, deckId: string, updates: Partial<Card>) => Promise<void>;
  deleteCard: (cardId: string, deckId: string) => Promise<void>;
  gradeCard: (card: Card, grade: SRSGrade) => Promise<void>;

  // Study session
  session: StudySession | null;
  startSession: (deckId: string) => Promise<void>;
  endSession: () => void;

  // UI state
  isLoading: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getUserId() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

function userRef(uid: string) {
  return doc(db, 'users', uid);
}

function decksRef(uid: string) {
  return collection(db, 'users', uid, 'decks');
}

function cardsRef(uid: string, deckId: string) {
  return collection(db, 'users', uid, 'decks', deckId, 'cards');
}

function cardRef(uid: string, deckId: string, cardId: string) {
  return doc(db, 'users', uid, 'decks', deckId, 'cards', cardId);
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  userId: null,
  setUserId: (id) => set({ userId: id }),

  decks: [],
  fetchDecks: async () => {
    const uid = getUserId();
    set({ isLoading: true });
    try {
      const snap = await getDocs(decksRef(uid));
      const decks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Deck));
      set({ decks, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  createDeck: async (deckData) => {
    const uid = getUserId();
    const ref = doc(decksRef(uid));
    const deck: Deck = {
      id: ref.id,
      ...deckData,
      cardCount: 0,
      newCount: 0,
      dueCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, deck);
    set(s => ({ decks: [...s.decks, deck] }));
    return ref.id;
  },

  deleteDeck: async (deckId) => {
    const uid = getUserId();
    await deleteDoc(doc(decksRef(uid), deckId));
    set(s => ({ decks: s.decks.filter(d => d.id !== deckId) }));
  },

  cards: {},
  fetchCards: async (deckId) => {
    const uid = getUserId();
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

  isLoading: false,
  error: null,
  setError: (msg) => set({ error: msg }),
}));
