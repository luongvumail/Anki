import { Card } from "../../store/slices/types";
import { createDefaultSRSState } from "../srs";

export interface MatchTile {
  id: string;
  cardId: string;
  type: "hanzi" | "meaning";
  text: string;
  pinyin?: string;
  matched: boolean;
}

function assertStrictEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${expected}, got ${actual}. ${message || ""}`);
  }
}

function assertOk(value: unknown, message?: string) {
  if (!value) {
    throw new Error(`Assertion failed: value is falsy. ${message || ""}`);
  }
}

function checkTileMatch(t1: MatchTile, t2: MatchTile): boolean {
  if (t1.id === t2.id) return false;
  return t1.cardId === t2.cardId && t1.type !== t2.type;
}

const mockCards: Card[] = [
  {
    id: "c1",
    deckId: "d1",
    character: "太阳",
    pinyin: "tài yáng",
    translation: "Mặt trời",
    examples: [],
    srs: createDefaultSRSState(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "c2",
    deckId: "d1",
    character: "月亮",
    pinyin: "yuè liang",
    translation: "Mặt trăng",
    examples: [],
    srs: createDefaultSRSState(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function runSpeedMatchLogicTests() {
  const tile1Hanzi: MatchTile = {
    id: "h_c1",
    cardId: "c1",
    type: "hanzi",
    text: "太阳",
    matched: false,
  };

  const tile1Meaning: MatchTile = {
    id: "m_c1",
    cardId: "c1",
    type: "meaning",
    text: "Mặt trời",
    matched: false,
  };

  const tile2Hanzi: MatchTile = {
    id: "h_c2",
    cardId: "c2",
    type: "hanzi",
    text: "月亮",
    matched: false,
  };

  // Test 1: Valid Match (Hanzi + Meaning of same card)
  assertOk(checkTileMatch(tile1Hanzi, tile1Meaning), "Same card Hanzi + Meaning must match");
  assertOk(checkTileMatch(tile1Meaning, tile1Hanzi), "Order of selection must not affect match");

  // Test 2: Invalid Match (Same card but same type)
  assertStrictEqual(
    checkTileMatch(tile1Hanzi, tile1Hanzi),
    false,
    "Same tile must not match itself",
  );

  // Test 3: Invalid Match (Different cards)
  assertStrictEqual(
    checkTileMatch(tile1Hanzi, tile2Hanzi),
    false,
    "Different card Hanzi must not match",
  );
  assertStrictEqual(
    checkTileMatch(tile1Meaning, tile2Hanzi),
    false,
    "Different card Meaning + Hanzi must not match",
  );

  // Test 4: Tile generation count for 2 cards -> 4 tiles
  const generated: MatchTile[] = [];
  mockCards.forEach((c) => {
    generated.push({
      id: `h_${c.id}`,
      cardId: c.id,
      type: "hanzi",
      text: c.character,
      matched: false,
    });
    generated.push({
      id: `m_${c.id}`,
      cardId: c.id,
      type: "meaning",
      text: c.translation,
      matched: false,
    });
  });
  assertStrictEqual(generated.length, 4, "2 cards should produce 4 tiles");
  const hanziTiles = generated.filter((t) => t.type === "hanzi");
  const meaningTiles = generated.filter((t) => t.type === "meaning");
  assertStrictEqual(hanziTiles.length, 2);
  assertStrictEqual(meaningTiles.length, 2);
}
