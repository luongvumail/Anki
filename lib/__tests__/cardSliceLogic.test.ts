import { Card } from "../../store/slices/types";
import { createDefaultSRSState } from "../srs";

function assertStrictEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${expected}, got ${actual}. ${message || ""}`);
  }
}

function findExistingCard(
  cardsState: Record<string, Card[]>,
  character: string,
  deckId?: string,
): Card | undefined {
  const q = character.trim().toLowerCase();
  if (!q) return undefined;
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
}

const mockCardsState: Record<string, Card[]> = {
  deck_1: [
    {
      id: "card_1",
      deckId: "deck_1",
      character: "苹果",
      pinyin: "píng guǒ",
      translation: "Quả táo",
      examples: [],
      srs: createDefaultSRSState(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  deck_2: [
    {
      id: "card_2",
      deckId: "deck_2",
      character: "香蕉",
      pinyin: "xiāng jiāo",
      translation: "Quả chuối",
      examples: [],
      srs: createDefaultSRSState(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

export function runCardSliceLogicTests() {
  // Test 1: Find by character in specific deck
  const found1 = findExistingCard(mockCardsState, "苹果", "deck_1");
  assertStrictEqual(found1?.id, "card_1", "Should find card_1 by exact character");

  // Test 2: Find with leading/trailing whitespace
  const found2 = findExistingCard(mockCardsState, "  苹果  ", "deck_1");
  assertStrictEqual(found2?.id, "card_1", "Should trim whitespace when searching");

  // Test 3: Find by pinyin across all decks
  const found3 = findExistingCard(mockCardsState, "xiāng jiāo");
  assertStrictEqual(found3?.id, "card_2", "Should search across all decks if deckId is omitted");

  // Test 4: Not found for non-existent word
  const notFound = findExistingCard(mockCardsState, "西瓜");
  assertStrictEqual(notFound, undefined, "Non-existent character must return undefined");

  // Test 5: Empty query returns undefined
  assertStrictEqual(
    findExistingCard(mockCardsState, "   "),
    undefined,
    "Empty query must return undefined",
  );

  // Test 6: Simulating optimistic update for unloaded deck (does not pollute cache with partial array)
  const initialDecks = [
    { id: "deck_unloaded", name: "HSK 1", cardCount: 10, dueCount: 4, newCount: 4 },
    { id: "deck_1", name: "HSK 2", cardCount: 1, dueCount: 1, newCount: 1 },
  ];
  const insertedBatchCount = 3;
  const targetDeckId = "deck_unloaded";

  const updatedDecks = initialDecks.map((d) =>
    d.id === targetDeckId
      ? {
          ...d,
          cardCount: (d.cardCount || 0) + insertedBatchCount,
          dueCount: (d.dueCount || 0) + insertedBatchCount,
          newCount: (d.newCount || 0) + insertedBatchCount,
        }
      : d,
  );

  const updatedUnloadedDeck = updatedDecks.find((d) => d.id === "deck_unloaded");
  assertStrictEqual(
    updatedUnloadedDeck?.cardCount,
    13,
    "Total card count should increment by inserted count (10 + 3 = 13)",
  );
  assertStrictEqual(
    updatedUnloadedDeck?.dueCount,
    7,
    "Due count should increment by inserted count (4 + 3 = 7)",
  );
  assertStrictEqual(
    updatedUnloadedDeck?.newCount,
    7,
    "New count should increment by inserted count (4 + 3 = 7)",
  );

  // Test 7: Total card count aggregation across loaded and unloaded decks
  const cardsCache: Record<string, Card[]> = {
    deck_1: mockCardsState.deck_1,
  };
  const aggregatedTotal = updatedDecks.reduce((sum, d) => {
    const deckCards = cardsCache[d.id];
    return sum + (deckCards ? deckCards.length : d.cardCount || 0);
  }, 0);
  assertStrictEqual(
    aggregatedTotal,
    14,
    "Aggregated total should be 1 (deck_1 loaded) + 13 (deck_unloaded) = 14",
  );

  // Test 8: AI Image/Text Vocabulary Deduplication against entire database + intra-batch duplicates
  const existingDbChars = new Set<string>(["苹果", "香蕉", "學習"]);
  const aiExtractedBatch = [
    { character: "苹果", traditional: "蘋果", pinyin: "píng guǒ", translation: "Quả táo" }, // duplicate in DB
    { character: "西瓜", traditional: "西瓜", pinyin: "xī guā", translation: "Dưa hấu" }, // new
    { character: "西瓜", traditional: "西瓜", pinyin: "xī guā", translation: "Dưa hấu" }, // duplicate within same photo
    { character: "学习", traditional: "學習", pinyin: "xué xí", translation: "Học tập" }, // duplicate in DB via traditional character
    { character: "草莓", traditional: "草莓", pinyin: "cǎo méi", translation: "Dâu tây" }, // new
  ];

  const uniqueCards: typeof aiExtractedBatch = [];
  const seenInBatch = new Set<string>();
  const removedDatabaseWords: string[] = [];
  let removedDuplicatesCount = 0;

  for (const card of aiExtractedBatch) {
    const cleanChar = card.character.trim().toLowerCase();
    const cleanTrad = (card.traditional || "").trim().toLowerCase();
    const isInDatabase =
      existingDbChars.has(cleanChar) || (cleanTrad.length > 0 && existingDbChars.has(cleanTrad));
    if (isInDatabase) {
      removedDuplicatesCount++;
      if (!removedDatabaseWords.includes(card.character.trim())) {
        removedDatabaseWords.push(card.character.trim());
      }
      continue;
    }
    if (seenInBatch.has(cleanChar) || (cleanTrad.length > 0 && seenInBatch.has(cleanTrad))) {
      continue;
    }
    seenInBatch.add(cleanChar);
    if (cleanTrad.length > 0) seenInBatch.add(cleanTrad);
    uniqueCards.push(card);
  }

  assertStrictEqual(uniqueCards.length, 2, "Should keep only 2 unique new words (西瓜, 草莓)");
  assertStrictEqual(
    removedDuplicatesCount,
    2,
    "Should detect 2 words already in database (苹果, 学习)",
  );
  assertStrictEqual(
    removedDatabaseWords.join(","),
    "苹果,学习",
    "Should list removed database duplicate words",
  );
}
