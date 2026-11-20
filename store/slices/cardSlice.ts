import { StateCreator } from "zustand";
import { supabase } from "../../lib/supabase";
import { createDefaultFSRSState } from "../../lib/srs";
import { Card } from "./types";
import { UISlice } from "./uiSlice";
import { DeckSlice } from "./deckSlice";
import { computeDueCount, computeNewCount } from "../../lib/deckUtils";
import { getDatabaseErrorMessage } from "../../lib/errorHandler";
import { APP_CONFIG } from "../../constants/config";
import { enqueueOfflineUpdates, flushOfflineQueue } from "../../lib/offlineQueue";

import { sanitizeForSupabase, mapCardUpdatesToSupabaseRow } from "./supabaseHelpers";

let userCharactersCache: { charSet: Set<string>; timestamp: number } | null = null;
const CACHE_TTL_MS = 30000;

export function invalidateUserCharactersCache(): void {
  userCharactersCache = null;
}

export const PAGE_SIZE = APP_CONFIG.PAGE_SIZE;

// Helper to map DB row (snake_case) to Card model (camelCase)
export function mapRowToCard(row: any): Card {
  return {
    id: row.id,
    deckId: row.deck_id,
    character: row.character,
    traditional: row.traditional || undefined,
    pinyin: row.pinyin,
    hanviet: row.hanviet || undefined,
    translation: row.translation,
    examples: Array.isArray(row.examples) ? row.examples : [],
    radical: row.radical || undefined,
    strokeCount: row.stroke_count ?? undefined,
    hskLevel: row.hsk_level ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    srs: row.srs || createDefaultFSRSState(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastReviewedAt: row.last_reviewed_at || undefined,
  };
}

export interface CardSlice {
  cards: Record<string, Card[]>; // deckId → cards
  hasMoreCards: Record<string, boolean>; // deckId → boolean
  isFetchingMoreCards: Record<string, boolean>; // deckId → boolean
  isFetchingCards: Record<string, boolean>; // deckId → boolean
  fetchCards: (deckId: string) => Promise<Card[]>;
  fetchDueCards: (deckId: string) => Promise<Card[]>;
  addCard: (card: Omit<Card, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  addCardsBatch: (cards: Omit<Card, "id" | "createdAt" | "updatedAt">[]) => Promise<void>;
  updateCard: (cardId: string, deckId: string, updates: Partial<Card>) => Promise<void>;
  batchUpdateCards: (
    items: { cardId: string; deckId: string; updates: Partial<Card> }[],
  ) => Promise<void>;
  deleteCard: (cardId: string, deckId: string) => Promise<void>;
  clearDeckCards: (deckId: string) => Promise<void>;
  resetDeckProgress: (deckId: string) => Promise<void>;
  findExistingCard: (character: string, deckId?: string) => Card | undefined;
  fetchAllUserCharacters: () => Promise<Set<string>>;
  isDuplicateCard: (
    character: string,
    traditional?: string,
    deckId?: string,
  ) => Promise<{ isDuplicate: boolean; existingCard?: Card }>;
  deduplicateBatch: <T extends { character: string; traditional?: string }>(
    items: T[],
  ) => Promise<{
    unique: T[];
    removedDuplicatesCount: number;
    removedDatabaseWords: string[];
  }>;
}

export const createCardSlice: StateCreator<CardSlice & UISlice & DeckSlice, [], [], CardSlice> = (
  set,
  get,
) => ({
  cards: {},
  hasMoreCards: {},
  isFetchingMoreCards: {},
  isFetchingCards: {},

  fetchCards: async (deckId) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    set((s) => ({
      isFetchingCards: { ...s.isFetchingCards, [deckId]: true },
    }));

    try {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", deckId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const fetchedCards = (data || []).map(mapRowToCard);

      set((s) => ({
        cards: { ...s.cards, [deckId]: fetchedCards },
        hasMoreCards: { ...s.hasMoreCards, [deckId]: false },
        isFetchingCards: { ...s.isFetchingCards, [deckId]: false },
      }));

      // Flush any queued offline updates upon fetching cards
      flushOfflineQueue();

      return fetchedCards;
    } catch (e: unknown) {
      const msg = getDatabaseErrorMessage(e);
      set((s) => ({
        error: msg,
        isFetchingCards: { ...s.isFetchingCards, [deckId]: false },
      }));
      return [];
    }
  },

  fetchDueCards: async (deckId) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    try {
      const nowStr = new Date().toISOString();
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", deckId)
        .lte("srs_next_review", nowStr)
        .order("srs_next_review", { ascending: true })
        .limit(100);

      if (error) throw error;
      return (data || []).map(mapRowToCard);
    } catch (e: unknown) {
      console.warn("[fetchDueCards] Failed to fetch due cards:", e);
      return [];
    }
  },

  addCard: async (cardData) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Centralized duplicate check (checks loaded state and remote database)
    const { isDuplicate, existingCard } = await get().isDuplicateCard(
      cardData.character,
      cardData.traditional,
      cardData.deckId,
    );

    if (isDuplicate && existingCard) {
      await get().updateCard(existingCard.id, existingCard.deckId || cardData.deckId, {
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

    const defaultFSRS = cardData.srs || createDefaultFSRSState();
    const nextReview = defaultFSRS.dueDate || new Date().toISOString();

    const payload = sanitizeForSupabase({
      deck_id: cardData.deckId,
      user_id: user.id,
      character: cardData.character,
      traditional: cardData.traditional,
      pinyin: cardData.pinyin,
      hanviet: cardData.hanviet,
      translation: cardData.translation,
      examples: cardData.examples || [],
      radical: cardData.radical,
      stroke_count: cardData.strokeCount,
      hsk_level: cardData.hskLevel,
      tags: cardData.tags || [],
      srs: defaultFSRS,
      srs_next_review: nextReview,
    });

    try {
      const { data, error } = await supabase.from("cards").insert(payload).select().single();

      if (error) throw error;

      const newCard = mapRowToCard(data);
      const currentDeckCards = get().cards[cardData.deckId];
      const isCardsLoaded = Boolean(currentDeckCards);

      if (isCardsLoaded && currentDeckCards) {
        const updatedCards = [newCard, ...currentDeckCards];
        const realDueCount = computeDueCount(updatedCards);
        const realNewCount = computeNewCount(updatedCards);

        set((s) => ({
          cards: { ...s.cards, [cardData.deckId]: updatedCards },
          decks: s.decks.map((deck) =>
            deck.id === cardData.deckId
              ? {
                  ...deck,
                  cardCount: (deck.cardCount || 0) + 1,
                  dueCount: realDueCount,
                  newCount: realNewCount,
                }
              : deck,
          ),
        }));
      } else {
        set((s) => ({
          decks: s.decks.map((deck) =>
            deck.id === cardData.deckId
              ? {
                  ...deck,
                  cardCount: (deck.cardCount || 0) + 1,
                  dueCount: (deck.dueCount || 0) + 1,
                  newCount: (deck.newCount || 0) + 1,
                }
              : deck,
          ),
        }));
      }

      invalidateUserCharactersCache();
    } catch (err) {
      console.error("[addCard] Supabase insert failed:", err);
      throw err;
    }
  },

  addCardsBatch: async (cardsData) => {
    if (cardsData.length === 0) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const rowsToInsert = cardsData.map((cardData) => {
      const defaultFSRS = cardData.srs || createDefaultFSRSState();
      const nextReview = defaultFSRS.dueDate || new Date().toISOString();
      return sanitizeForSupabase({
        deck_id: cardData.deckId,
        user_id: user.id,
        character: cardData.character,
        traditional: cardData.traditional,
        pinyin: cardData.pinyin,
        hanviet: cardData.hanviet,
        translation: cardData.translation,
        examples: cardData.examples || [],
        radical: cardData.radical,
        stroke_count: cardData.strokeCount,
        hsk_level: cardData.hskLevel,
        tags: cardData.tags || [],
        srs: defaultFSRS,
        srs_next_review: nextReview,
      });
    });

    try {
      const { data, error } = await supabase.from("cards").insert(rowsToInsert).select();

      if (error) throw error;

      const insertedCards = (data || []).map(mapRowToCard);
      if (insertedCards.length === 0) return;

      invalidateUserCharactersCache();

      set((s) => {
        const updatedCardsMap = { ...s.cards };
        const deckDelta: Record<string, number> = {};

        for (const card of insertedCards) {
          if (!updatedCardsMap[card.deckId]) {
            updatedCardsMap[card.deckId] = [];
          }
          updatedCardsMap[card.deckId] = [card, ...updatedCardsMap[card.deckId]];
          deckDelta[card.deckId] = (deckDelta[card.deckId] || 0) + 1;
        }

        const updatedDecks = s.decks.map((deck) => {
          const delta = deckDelta[deck.id];
          if (!delta) return deck;
          const deckCards = updatedCardsMap[deck.id];
          return {
            ...deck,
            cardCount: (deck.cardCount || 0) + delta,
            dueCount: deckCards ? computeDueCount(deckCards) : (deck.dueCount || 0) + delta,
            newCount: deckCards ? computeNewCount(deckCards) : (deck.newCount || 0) + delta,
          };
        });

        return { cards: updatedCardsMap, decks: updatedDecks };
      });
    } catch (err) {
      console.error("[addCardsBatch] Supabase batch insert failed:", err);
      throw err;
    }
  },

  updateCard: async (cardId, deckId, updates) => {
    const existing = get().cards[deckId] || [];
    const updatedCards = existing.map((c) => (c.id === cardId ? { ...c, ...updates } : c));
    const realDueCount = computeDueCount(updatedCards);
    const realNewCount = computeNewCount(updatedCards);

    set((s) => ({
      cards: { ...s.cards, [deckId]: updatedCards },
      decks: s.decks.map((d) =>
        d.id === deckId ? { ...d, dueCount: realDueCount, newCount: realNewCount } : d,
      ),
    }));

    try {
      const payload = mapCardUpdatesToSupabaseRow(updates);
      const { error } = await supabase.from("cards").update(payload).eq("id", cardId);
      if (error) throw error;
      flushOfflineQueue();
    } catch (err) {
      console.error("[updateCard] Supabase update failed, queuing offline update:", err);
      await enqueueOfflineUpdates([{ cardId, deckId, updates, timestamp: Date.now() }]);
    }
  },

  batchUpdateCards: async (items) => {
    if (items.length === 0) return;

    const state = get();
    const newCardsState = { ...state.cards };
    const updatedDeckIds = new Set<string>();

    for (const { cardId, deckId, updates } of items) {
      updatedDeckIds.add(deckId);
      const existing = newCardsState[deckId] || [];
      newCardsState[deckId] = existing.map((c) => (c.id === cardId ? { ...c, ...updates } : c));
    }

    const updatedDecks = state.decks.map((d) => {
      if (updatedDeckIds.has(d.id)) {
        const deckCards = newCardsState[d.id] || [];
        return {
          ...d,
          dueCount: computeDueCount(deckCards),
          newCount: computeNewCount(deckCards),
        };
      }
      return d;
    });

    set({ cards: newCardsState, decks: updatedDecks });

    try {
      const results = await Promise.allSettled(
        items.map(async ({ cardId, updates }) => {
          const payload = mapCardUpdatesToSupabaseRow(updates);
          const { error } = await supabase.from("cards").update(payload).eq("id", cardId);
          if (error) throw error;
        }),
      );

      const failedItems: { cardId: string; deckId: string; updates: Partial<Card> }[] = [];
      results.forEach((res, index) => {
        if (res.status === "rejected") {
          failedItems.push(items[index]);
        }
      });

      if (failedItems.length > 0) {
        console.warn(`[batchUpdateCards] ${failedItems.length} updates failed, queuing offline.`);
        await enqueueOfflineUpdates(
          failedItems.map((item) => ({ ...item, timestamp: Date.now() })),
        );
      } else {
        flushOfflineQueue();
      }
    } catch (err) {
      console.error(
        "[batchUpdateCards] Supabase batch update failed, queuing offline updates:",
        err,
      );
      await enqueueOfflineUpdates(items.map((item) => ({ ...item, timestamp: Date.now() })));
    }
  },

  deleteCard: async (cardId, deckId) => {
    const existingCards = get().cards[deckId] || [];
    const cardToDelete = existingCards.find((c) => c.id === cardId);
    const updatedCards = existingCards.filter((c) => c.id !== cardId);
    const realDueCount = computeDueCount(updatedCards);
    const realNewCount = computeNewCount(updatedCards);

    set((s) => ({
      cards: { ...s.cards, [deckId]: updatedCards },
      decks: s.decks.map((d) =>
        d.id === deckId
          ? {
              ...d,
              cardCount: Math.max(0, (d.cardCount || 1) - 1),
              dueCount: realDueCount,
              newCount: realNewCount,
            }
          : d,
      ),
    }));

    try {
      const { error } = await supabase.from("cards").delete().eq("id", cardId);
      if (error) throw error;
      invalidateUserCharactersCache();
    } catch (err) {
      console.error("[deleteCard] Supabase delete failed, rolling back:", err);
      // Rollback optimistic update on failure
      if (cardToDelete) {
        set((s) => {
          const rolledBackCards = [cardToDelete, ...(s.cards[deckId] || [])];
          return {
            cards: { ...s.cards, [deckId]: rolledBackCards },
            decks: s.decks.map((d) =>
              d.id === deckId
                ? {
                    ...d,
                    cardCount: (d.cardCount || 0) + 1,
                    dueCount: computeDueCount(rolledBackCards),
                    newCount: computeNewCount(rolledBackCards),
                  }
                : d,
            ),
          };
        });
      }
      throw err;
    }
  },

  clearDeckCards: async (deckId) => {
    set((s) => ({
      cards: { ...s.cards, [deckId]: [] },
      decks: s.decks.map((deck) =>
        deck.id === deckId ? { ...deck, cardCount: 0, dueCount: 0, newCount: 0 } : deck,
      ),
    }));

    try {
      const { error } = await supabase.from("cards").delete().eq("deck_id", deckId);
      if (error) throw error;
      invalidateUserCharactersCache();
    } catch (err) {
      console.error("[clearDeckCards] Supabase delete failed:", err);
    }
  },

  resetDeckProgress: async (deckId) => {
    const existingCards = get().cards[deckId] || [];
    const now = new Date().toISOString();
    const defaultFSRS = createDefaultFSRSState();
    const cardCount = existingCards.length;

    set((s) => ({
      cards: {
        ...s.cards,
        [deckId]: (s.cards[deckId] || []).map((c) => ({
          ...c,
          srs: defaultFSRS,
          updatedAt: now,
        })),
      },
      decks: s.decks.map((d) =>
        d.id === deckId ? { ...d, dueCount: cardCount, newCount: cardCount, updatedAt: now } : d,
      ),
    }));

    try {
      const { error } = await supabase
        .from("cards")
        .update({
          srs: defaultFSRS,
          srs_next_review: defaultFSRS.dueDate || now,
          updated_at: now,
        })
        .eq("deck_id", deckId);

      if (error) throw error;
      invalidateUserCharactersCache();
    } catch (err) {
      console.error("[resetDeckProgress] Supabase update failed:", err);
    }
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

  fetchAllUserCharacters: async () => {
    if (userCharactersCache && Date.now() - userCharactersCache.timestamp < CACHE_TTL_MS) {
      return userCharactersCache.charSet;
    }

    const charSet = new Set<string>();
    const cardsState = get().cards;

    // 1. Collect all characters from currently loaded decks in memory
    for (const dId of Object.keys(cardsState)) {
      const deckCards = cardsState[dId] || [];
      for (const c of deckCards) {
        if (c.character) charSet.add(c.character.trim().toLowerCase());
        if (c.traditional) charSet.add(c.traditional.trim().toLowerCase());
      }
    }

    // 2. Also query Supabase database for all cards of the current user (covers unloaded decks)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("cards")
          .select("character, traditional")
          .eq("user_id", user.id);

        if (!error && Array.isArray(data)) {
          for (const row of data) {
            if (typeof row.character === "string" && row.character.trim()) {
              charSet.add(row.character.trim().toLowerCase());
            }
            if (typeof row.traditional === "string" && row.traditional.trim()) {
              charSet.add(row.traditional.trim().toLowerCase());
            }
          }
        }
      }
    } catch (err) {
      console.warn("[fetchAllUserCharacters] Fallback to local store characters:", err);
    }

    userCharactersCache = { charSet, timestamp: Date.now() };
    return charSet;
  },

  isDuplicateCard: async (character, traditional, deckId) => {
    const cleanChar = (character || "").trim().toLowerCase();
    const cleanTrad = (traditional || "").trim().toLowerCase();
    if (!cleanChar && !cleanTrad) return { isDuplicate: false };

    // 1. Check local loaded state (instant, no network overhead)
    const cardsState = get().cards;
    const targetDeckIds = deckId ? [deckId] : Object.keys(cardsState);

    for (const dId of targetDeckIds) {
      const deckCards = cardsState[dId] || [];
      const match = deckCards.find((c) => {
        const cChar = (c.character || "").trim().toLowerCase();
        const cTrad = (c.traditional || "").trim().toLowerCase();
        return (
          (cleanChar && (cChar === cleanChar || cTrad === cleanChar)) ||
          (cleanTrad && (cChar === cleanTrad || cTrad === cleanTrad))
        );
      });
      if (match) return { isDuplicate: true, existingCard: match };
    }

    // 2. Check remote database for cards not yet loaded in memory
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        let query = supabase.from("cards").select("*").eq("user_id", user.id);

        if (deckId) {
          query = query.eq("deck_id", deckId);
        }

        const safeChar = character.trim().replace(/[(),]/g, "");
        const safeTrad = traditional ? traditional.trim().replace(/[(),]/g, "") : "";
        const orFilters: string[] = [];

        if (cleanChar && safeChar) {
          orFilters.push(`character.eq.${safeChar}`);
          orFilters.push(`traditional.eq.${safeChar}`);
        }
        if (cleanTrad && safeTrad && safeTrad !== safeChar) {
          orFilters.push(`character.eq.${safeTrad}`);
          orFilters.push(`traditional.eq.${safeTrad}`);
        }

        if (orFilters.length > 0) {
          const { data, error } = await query.or(orFilters.join(",")).limit(1);
          if (!error && data && data.length > 0) {
            return { isDuplicate: true, existingCard: mapRowToCard(data[0]) };
          }
        }
      }
    } catch (err) {
      console.warn("[isDuplicateCard] Remote check fallback:", err);
    }

    return { isDuplicate: false };
  },

  deduplicateBatch: async <T extends { character: string; traditional?: string }>(items: T[]) => {
    const existingCharSet = await get().fetchAllUserCharacters();
    const unique: T[] = [];
    const seenInBatch = new Set<string>();
    const removedDatabaseWords: string[] = [];
    let removedDuplicatesCount = 0;

    for (const item of items) {
      const cleanChar = (item.character || "").trim().toLowerCase();
      const cleanTrad = (item.traditional || "").trim().toLowerCase();
      if (!cleanChar) continue;

      const isInDatabase =
        existingCharSet.has(cleanChar) || (cleanTrad.length > 0 && existingCharSet.has(cleanTrad));

      if (isInDatabase) {
        removedDuplicatesCount++;
        const word = item.character.trim();
        if (!removedDatabaseWords.includes(word)) {
          removedDatabaseWords.push(word);
        }
        continue;
      }

      if (seenInBatch.has(cleanChar) || (cleanTrad.length > 0 && seenInBatch.has(cleanTrad))) {
        continue;
      }

      seenInBatch.add(cleanChar);
      if (cleanTrad.length > 0) seenInBatch.add(cleanTrad);
      unique.push(item);
    }

    return {
      unique,
      removedDuplicatesCount,
      removedDatabaseWords,
    };
  },
});
