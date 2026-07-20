import { StateCreator } from "zustand";
import { getDocs, doc, setDoc, deleteDoc, QuerySnapshot, DocumentData } from "firebase/firestore";
import { auth } from "../../lib/firebase";
import { Deck } from "./types";
import { getUserId, decksRef, cardsRef } from "./firestoreHelpers";
import { UISlice } from "./uiSlice";
import { CardSlice } from "./cardSlice";

export interface DeckSlice {
  decks: Deck[];
  fetchDecks: () => Promise<void>;
  createDeck: (
    deck: Omit<Deck, "id" | "cardCount" | "newCount" | "dueCount" | "createdAt" | "updatedAt">,
  ) => Promise<string>;
  deleteDeck: (deckId: string) => Promise<void>;
}

export const createDeckSlice: StateCreator<DeckSlice & UISlice & CardSlice, [], [], DeckSlice> = (
  set,
  get,
) => ({
  decks: [],
  fetchDecks: async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    set({ isLoading: true });
    console.log("[fetchDecks] Starting Firestore fetch for uid:", uid);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Firestore timeout — kiểm tra Firestore Database và Security Rules trên Firebase Console",
              ),
            ),
          10000,
        ),
      );
      const snap = (await Promise.race([getDocs(decksRef(uid)), timeout])) as QuerySnapshot<DocumentData>;
      const decks = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Deck);
      console.log("[fetchDecks] Success, got", decks.length, "decks");
      set({ decks, isLoading: false });
      // Pre-fetch cards for all decks in parallel so SRS due states are accurate everywhere immediately
      Promise.all(decks.map((d) => get().fetchCards(d.id))).catch((err) =>
        console.warn("[fetchDecks] Card pre-fetch error:", err),
      );
    } catch (e: any) {
      console.error("[fetchDecks] ERROR:", e.message || e);
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
    set((s) => ({ decks: [...s.decks, deck] }));
    return ref.id;
  },

  deleteDeck: async (deckId) => {
    const uid = getUserId();
    // Cascade delete: delete all sub-cards first
    try {
      const snap = await getDocs(cardsRef(uid, deckId));
      const deletions = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletions);
    } catch (e) {
      console.warn("[deleteDeck] Could not cascade delete cards:", e);
    }
    // Delete deck doc
    await deleteDoc(doc(decksRef(uid), deckId));
    set((s) => ({
      decks: s.decks.filter((d) => d.id !== deckId),
      cards: Object.fromEntries(Object.entries(s.cards).filter(([k]) => k !== deckId)),
    }));
  },
});
