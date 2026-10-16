import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Card } from "../store/slices/types";
import { triggerHaptic } from "../constants/theme";
import { awardArcadeXP, ARCADE_XP_REWARDS } from "../lib/arcadeScoring";
import { selectCardsByFSRSPriority } from "../lib/srs";
import { recordReviewToday } from "../lib/reviewTracker";

export type SpeedMatchMode = "mixed" | "hanzi_meaning" | "hanzi_pinyin" | "pinyin_meaning";

export interface MatchTile {
  id: string;
  cardId: string;
  type: "left" | "right";
  text: string;
  subText?: string;
  matched: boolean;
}

const STORAGE_KEY_HIGH_SCORE = "@anki_speed_match_high_score";

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function useSpeedMatch(visible: boolean, cards: Card[]) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [tiles, setTiles] = useState<MatchTile[]>([]);
  const [selectedTile, setSelectedTile] = useState<MatchTile | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [mode, setMode] = useState<SpeedMatchMode>("mixed");
  const [currentRoundMode, setCurrentRoundMode] = useState<SpeedMatchMode>("hanzi_meaning");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevVisibleRef = useRef(false);

  // Load high score from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_HIGH_SCORE).then((val) => {
      if (val) setHighScore(parseInt(val, 10));
    });
  }, []);

  const generateTiles = useCallback(
    (availableCards: Card[], selectedMode: SpeedMatchMode) => {
      if (availableCards.length < 2) return [];
      const topCandidates = selectCardsByFSRSPriority(availableCards, 18);
      const pool = shuffleArray(topCandidates).slice(0, 6);

      // Determine the active sub-mode for this round
      let activeMode: SpeedMatchMode = selectedMode;
      if (selectedMode === "mixed") {
        const subModes: SpeedMatchMode[] = ["hanzi_meaning", "hanzi_pinyin", "pinyin_meaning"];
        activeMode = subModes[Math.floor(Math.random() * subModes.length)];
      }
      setCurrentRoundMode(activeMode);

      const generated: MatchTile[] = [];
      pool.forEach((card) => {
        let leftText = card.character;
        let leftSub = "";
        let rightText = card.translation;
        let rightSub = "";

        if (activeMode === "hanzi_pinyin") {
          leftText = card.character;
          rightText = card.pinyin || card.character;
        } else if (activeMode === "pinyin_meaning") {
          leftText = card.pinyin || card.character;
          rightText = card.translation;
        } else {
          // hanzi_meaning
          leftText = card.character;
          rightText = card.translation;
        }

        generated.push({
          id: `l_${card.id}`,
          cardId: card.id,
          type: "left",
          text: leftText,
          subText: leftSub || undefined,
          matched: false,
        });

        generated.push({
          id: `r_${card.id}`,
          cardId: card.id,
          type: "right",
          text: rightText,
          subText: rightSub || undefined,
          matched: false,
        });
      });

      return shuffleArray(generated);
    },
    [],
  );

  const startGame = useCallback(() => {
    if (cards.length < 2) return;
    const newTiles = generateTiles(cards, mode);
    setTiles(newTiles);
    setScore(0);
    setTimeLeft(60);
    setSelectedTile(null);
    setIsGameOver(false);
    setIsPlaying(true);
  }, [cards, mode, generateTiles]);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      startGame();
    }
    if (!visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    prevVisibleRef.current = visible;
  }, [visible, startGame]);

  // 60-second Timer Loop
  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isPlaying && timeLeft === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPlaying(false);
      setIsGameOver(true);
      triggerHaptic("heavy");

      if (score > highScore) {
        setHighScore(score);
        AsyncStorage.setItem(STORAGE_KEY_HIGH_SCORE, score.toString());
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, timeLeft, score, highScore]);

  const handleTilePress = useCallback(
    (tile: MatchTile) => {
      if (!isPlaying || tile.matched) return;
      triggerHaptic("selection");

      if (!selectedTile) {
        setSelectedTile(tile);
        return;
      }

      if (selectedTile.id === tile.id) {
        setSelectedTile(null);
        return;
      }

      // Check Match
      if (selectedTile.cardId === tile.cardId && selectedTile.type !== tile.type) {
        // MATCH SUCCESS!
        triggerHaptic("success");
        setScore((prev) => prev + ARCADE_XP_REWARDS.SPEED_MATCH_BASE);
        awardArcadeXP(ARCADE_XP_REWARDS.SPEED_MATCH_BASE);
        recordReviewToday();

        setTiles((prev) => {
          const updated = prev.map((t) =>
            t.cardId === tile.cardId ? { ...t, matched: true } : t,
          );
          // Check if all tiles in current round are matched -> spawn new tiles!
          const remaining = updated.filter((t) => !t.matched);
          if (remaining.length === 0) {
            setTimeout(() => {
              setTiles(generateTiles(cards, mode));
            }, 300);
          }
          return updated;
        });

        setSelectedTile(null);
      } else {
        // WRONG MATCH!
        triggerHaptic("error");
        setSelectedTile(null);
      }
    },
    [isPlaying, selectedTile, cards, mode, generateTiles],
  );

  const changeMode = useCallback(
    (newMode: SpeedMatchMode) => {
      setMode(newMode);
      if (isPlaying) {
        const newTiles = generateTiles(cards, newMode);
        setTiles(newTiles);
        setSelectedTile(null);
      }
    },
    [cards, isPlaying, generateTiles],
  );

  return {
    timeLeft,
    isPlaying,
    score,
    highScore,
    tiles,
    selectedTile,
    isGameOver,
    mode,
    currentRoundMode,
    changeMode,
    startGame,
    handleTilePress,
  };
}
