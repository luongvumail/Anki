import { StateCreator } from "zustand";
import { supabase } from "../../lib/supabase";
import { Deck } from "./types";
import { UISlice } from "./uiSlice";
import { CardSlice } from "./cardSlice";
import { getDatabaseErrorMessage } from "../../lib/errorHandler";
import { APP_CONFIG } from "../../constants/config";

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
) => ({
  decks: [],
  fetchDecks: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    set({ isLoading: true });
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Supabase connection timeout — kiểm tra kết nối mạng")),
          APP_CONFIG.FIRESTORE_TIMEOUT_MS,
        ),
      );

      // Query deck_with_stats view (calculates card_count, due_count, new_count in SQL)
      const fetchPromise = (async () => {
        const primaryRes = await supabase
          .from("deck_with_stats")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!primaryRes.error && primaryRes.data) {
          return primaryRes;
        }

        // Fallback: If view query fails or view doesn't exist, query standard decks table directly
        console.warn(
          "[fetchDecks] deck_with_stats view query failed, falling back to decks table:",
          primaryRes.error?.message,
        );
        return supabase
          .from("decks")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
      })();

      const { data, error } = (await Promise.race([fetchPromise, timeout])) as Awaited<
        typeof fetchPromise
      >;

      if (error) throw error;

      const decks: Deck[] = (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        color: row.color,
        icon: row.icon,
        cardCount: row.card_count ?? 0,
        dueCount: row.due_count ?? 0,
        newCount: row.new_count ?? 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      set({ decks, isLoading: false });
    } catch (e: unknown) {
      const msg = getDatabaseErrorMessage(e);
      console.error("[fetchDecks] ERROR:", msg);
      set({ error: msg, isLoading: false });
    }
  },

  createDeck: async (deckData) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const tempId = `temp_${Date.now()}`;
    const nowStr = new Date().toISOString();
    const newDeck: Deck = {
      id: tempId,
      ...deckData,
      cardCount: 0,
      newCount: 0,
      dueCount: 0,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    // Optimistically update store
    set((s) => ({ decks: [newDeck, ...s.decks] }));

    try {
      const { data, error } = await supabase
        .from("decks")
        .insert({
          user_id: user.id,
          name: deckData.name,
          description: deckData.description,
          color: deckData.color,
          icon: deckData.icon,
        })
        .select()
        .single();

      if (error) throw error;

      // Update store with real DB id
      set((s) => ({
        decks: s.decks.map((d) => (d.id === tempId ? { ...d, id: data.id } : d)),
      }));

      return data.id;
    } catch (err) {
      console.error("[createDeck] Supabase insert failed:", err);
      // Rollback optimistic update
      set((s) => ({ decks: s.decks.filter((d) => d.id !== tempId) }));
      throw err;
    }
  },

  deleteDeck: async (deckId) => {
    // Optimistically remove deck and its cached cards from store
    set((s) => ({
      decks: s.decks.filter((d) => d.id !== deckId),
      cards: Object.fromEntries(Object.entries(s.cards).filter(([k]) => k !== deckId)),
    }));

    try {
      const { error } = await supabase.from("decks").delete().eq("id", deckId);
      if (error) throw error;
    } catch (e) {
      console.warn("[deleteDeck] Could not delete deck from Supabase:", e);
    }
  },
});
