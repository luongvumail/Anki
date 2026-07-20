import { StateCreator } from "zustand";
import { getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { auth } from "../../lib/firebase";
import { DEFAULT_SRS_STATE, SRSGrade, calculateSRS, isDue } from "../../lib/srs";
import { Card, Deck } from "./types";
import { getUserId, cardsRef, cardRef, decksRef } from "./firestoreHelpers";
import { UISlice } from "./uiSlice";
import { DeckSlice } from "./deckSlice";
import { computeDueCount, computeNewCount } from "../../lib/deckUtils";

import { recordReviewToday } from "../../lib/reviewTracker";

export interface CardSlice {
  cards: Record<string, Card[]>; // deckId → cards
  fetchCards: (deckId: string) => Promise<Card[]>;
  addCard: (card: Omit<Card, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateCard: (cardId: string, deckId: string, updates: Partial<Card>) => Promise<void>;
  deleteCard: (cardId: string, deckId: string) => Promise<void>;
  clearDeckCards: (deckId: string) => Promise<void>;
  gradeCard: (card: Card, grade: SRSGrade) => Promise<void>;
  resetDeckProgress: (deckId: string) => Promise<void>;
  findExistingCard: (character: string, deckId?: string) => Card | undefined;
}

export const createCardSlice: StateCreator<CardSlice & UISlice & DeckSlice, [], [], CardSlice> = (
  set,
  get,
) => ({
  cards: {},
  fetchCards: async (deckId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    set({ isLoading: true });
    try {
      const snap = await getDocs(cardsRef(uid, deckId));
      const cards = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Card)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      const realCardCount = cards.length;
      const realDueCount = computeDueCount(cards);
      const realNewCount = computeNewCount(cards);

      set((s) => ({
        cards: { ...s.cards, [deckId]: cards },
        decks: s.decks.map((d) =>
          d.id === deckId
            ? {
                ...d,
                cardCount: realCardCount,
                dueCount: realDueCount,
                newCount: realNewCount,
              }
            : d,
        ),
        isLoading: false,
      }));

      // Background auto-sync Firestore deck metadata if desynced
      const deckDocRef = doc(decksRef(uid), deckId);
      updateDoc(deckDocRef, {
        cardCount: realCardCount,
        dueCount: realDueCount,
        newCount: realNewCount,
      }).catch((err) => console.warn("[fetchCards] Firestore deck count sync warning:", err));

      return cards;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return [];
    }
  },

  addCard: async (cardData) => {
    const uid = getUserId();
    const existingCards = get().cards[cardData.deckId] || [];
    const cleanChar = cardData.character.trim().toLowerCase();

    // Prevent duplicate cards: if card already exists in this deck, update it instead of creating duplicate
    const duplicate = existingCards.find(
      (c) => c.character.trim().toLowerCase() === cleanChar,
    );

    if (duplicate) {
      console.log(
        `[cardSlice] Duplicate found for "${cardData.character}" in deck ${cardData.deckId}. Updating card ${duplicate.id} instead of creating duplicate.`,
      );
      await get().updateCard(duplicate.id, cardData.deckId, {
        character: cardData.character,
        traditional: cardData.traditional,
        pinyin: cardData.pinyin,
        hanviet: cardData.hanviet,
        translation: cardData.translation,
        examples: cardData.examples || [],
        radical: cardData.radical,
        strokeCount: cardData.strokeCount,
        hskLevel: cardData.hskLevel,
        tags: cardData.tags || [],
      });
      return;
    }

    const ref = doc(cardsRef(uid, cardData.deckId));
    const card: Card = {
      id: ref.id,
      ...cardData,
      srs: cardData.srs || DEFAULT_SRS_STATE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, card);

    const updatedCards = [card, ...existingCards];
    const realCardCount = updatedCards.length;
    const realDueCount = computeDueCount(updatedCards);
    const realNewCount = computeNewCount(updatedCards);

    // Update deck card count, new count, and due count in Firestore & Store
    const deckDocRef = doc(decksRef(uid), cardData.deckId);
    await updateDoc(deckDocRef, {
      cardCount: realCardCount,
      dueCount: realDueCount,
      newCount: realNewCount,
    });

    set((s) => ({
      cards: { ...s.cards, [cardData.deckId]: updatedCards },
      decks: s.decks.map((deck) =>
        deck.id === cardData.deckId
          ? {
              ...deck,
              cardCount: realCardCount,
              dueCount: realDueCount,
              newCount: realNewCount,
            }
          : deck,
      ),
    }));
  },

  updateCard: async (cardId, deckId, updates) => {
    const uid = getUserId();
    await updateDoc(cardRef(uid, deckId, cardId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    set((s) => {
      const existing = s.cards[deckId] || [];
      const updatedCards = existing.map((c) => (c.id === cardId ? { ...c, ...updates } : c));
      const realDueCount = computeDueCount(updatedCards);
      const realNewCount = computeNewCount(updatedCards);
      return {
        cards: {
          ...s.cards,
          [deckId]: updatedCards,
        },
        decks: s.decks.map((d) =>
          d.id === deckId ? { ...d, dueCount: realDueCount, newCount: realNewCount } : d,
        ),
      };
    });
  },

  deleteCard: async (cardId, deckId) => {
    const uid = getUserId();
    const existingCards = get().cards[deckId] || [];
    const updatedCards = existingCards.filter((c) => c.id !== cardId);
    const realCardCount = updatedCards.length;
    const realDueCount = computeDueCount(updatedCards);
    const realNewCount = computeNewCount(updatedCards);

    await deleteDoc(cardRef(uid, deckId, cardId));

    // Update deck card count, due count & new count
    const deckDocRef = doc(decksRef(uid), deckId);
    await updateDoc(deckDocRef, {
      cardCount: realCardCount,
      dueCount: realDueCount,
      newCount: realNewCount,
    });

    set((s) => ({
      cards: {
        ...s.cards,
        [deckId]: updatedCards,
      },
      decks: s.decks.map((deck) =>
        deck.id === deckId
          ? {
              ...deck,
              cardCount: realCardCount,
              dueCount: realDueCount,
              newCount: realNewCount,
            }
          : deck,
      ),
    }));
  },

  clearDeckCards: async (deckId) => {
    const uid = getUserId();
    const existingCards = get().cards[deckId] || [];
    if (existingCards.length === 0) return;

    // Immediately update Zustand store in 1 single atomic state update
    set((s) => ({
      cards: {
        ...s.cards,
        [deckId]: [],
      },
      decks: s.decks.map((deck) =>
        deck.id === deckId
          ? {
              ...deck,
              cardCount: 0,
              dueCount: 0,
              newCount: 0,
            }
          : deck,
      ),
    }));

    // Perform parallel bulk deletion in Firestore
    try {
      await Promise.all(existingCards.map((c) => deleteDoc(cardRef(uid, deckId, c.id))));
      const deckDocRef = doc(decksRef(uid), deckId);
      await updateDoc(deckDocRef, {
        cardCount: 0,
        dueCount: 0,
        newCount: 0,
      });
    } catch (e: any) {
      console.warn("[clearDeckCards] Firestore bulk delete warning:", e);
    }
  },

  gradeCard: async (card, grade) => {
    const newSRS = calculateSRS(grade, card.srs);
    const now = new Date().toISOString();
    await get().updateCard(card.id, card.deckId, { srs: newSRS, lastReviewedAt: now });
    await recordReviewToday();

    // Update deck dueCount & newCount if card is no longer due today
    const wasDue = isDue(card.srs);
    const isNowDue = isDue(newSRS);
    const wasNew = card.srs.repetitions === 0;

    if (wasDue && !isNowDue) {
      const uid = getUserId();
      const deckDocRef = doc(decksRef(uid), card.deckId);
      const deckSnap = await getDoc(deckDocRef);
      if (deckSnap.exists()) {
        const d = deckSnap.data() as Deck;
        const newDueCount = Math.max(0, (d.dueCount || 0) - 1);
        const newNewCount = wasNew ? Math.max(0, (d.newCount || 0) - 1) : d.newCount || 0;

        await updateDoc(deckDocRef, {
          dueCount: newDueCount,
          newCount: newNewCount,
        });
        set((s) => ({
          decks: s.decks.map((deck) =>
            deck.id === card.deckId
              ? { ...deck, dueCount: newDueCount, newCount: newNewCount }
              : deck,
          ),
        }));
      }
    }
  },

  resetDeckProgress: async (deckId) => {
    const uid = getUserId();
    const snap = await getDocs(cardsRef(uid, deckId));
    const now = new Date().toISOString();
    const resets = snap.docs.map((d) =>
      updateDoc(d.ref, { srs: DEFAULT_SRS_STATE, updatedAt: now }),
    );
    await Promise.all(resets);

    const cardCount = snap.docs.length;
    const deckDocRef = doc(decksRef(uid), deckId);
    await updateDoc(deckDocRef, {
      dueCount: cardCount,
      newCount: cardCount,
      updatedAt: now,
    });

    set((s) => ({
      cards: {
        ...s.cards,
        [deckId]: (s.cards[deckId] || []).map((c) => ({
          ...c,
          srs: DEFAULT_SRS_STATE,
          updatedAt: now,
        })),
      },
      decks: s.decks.map((d) =>
        d.id === deckId ? { ...d, dueCount: cardCount, newCount: cardCount, updatedAt: now } : d,
      ),
    }));
  },

  findExistingCard: (character, deckId) => {
    const q = character.trim().toLowerCase();
    if (!q) return undefined;
    const cardsState = get().cards;
    if (deckId && cardsState[deckId]) {
      return cardsState[deckId].find(
        (c) => c.character.trim().toLowerCase() === q || c.pinyin.trim().toLowerCase() === q,
      );
    }
    for (const dId of Object.keys(cardsState)) {
      const match = cardsState[dId].find(
        (c) => c.character.trim().toLowerCase() === q || c.pinyin.trim().toLowerCase() === q,
      );
      if (match) return match;
    }
    return undefined;
  },
});
