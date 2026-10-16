import { runFSRSTests } from "./srs.test";
import { runQuizGeneratorTests } from "./quizGenerator.test";
import { runDeckUtilsTests } from "./deckUtils.test";
import { runUserProgressTests } from "./userProgress.test";
import { runPinyinColorTests } from "./pinyinColor.test";
import { runErrorHandlerTests } from "./errorHandler.test";
import { runStreakEngineTests } from "./streakEngine.test";
import { runOfflineQueueTests } from "./offlineQueue.test";
import { runSpeedMatchLogicTests } from "./speedMatchLogic.test";
import { runSentenceBuilderLogicTests } from "./sentenceBuilderLogic.test";
import { runCardSliceLogicTests } from "./cardSliceLogic.test";
import { runAIParserTests } from "./aiParser.test";

interface TestSuite {
  name: string;
  category: "Algorithms" | "Game Logic" | "Storage & Sync" | "AI & UI";
  fn: () => void;
}

const suites: TestSuite[] = [
  // 1. Core Algorithms
  { name: "FSRS Memory Algorithm & Speed Evaluation", category: "Algorithms", fn: runFSRSTests },
  {
    name: "Adaptive Quiz & Distractor Generator",
    category: "Algorithms",
    fn: runQuizGeneratorTests,
  },
  {
    name: "Daily Study Streak Calculation & Grace Period",
    category: "Algorithms",
    fn: runStreakEngineTests,
  },
  { name: "Deck Statistics & Mastery Calculations", category: "Algorithms", fn: runDeckUtilsTests },

  // 2. Game & Progress Logic
  {
    name: "User Levels, XP & 24 Badges Configuration",
    category: "Game Logic",
    fn: runUserProgressTests,
  },
  {
    name: "Speed Match 60s Mini-Game Pairing Logic",
    category: "Game Logic",
    fn: runSpeedMatchLogicTests,
  },
  {
    name: "Sentence Builder Grammar & Clean Logic",
    category: "Game Logic",
    fn: runSentenceBuilderLogicTests,
  },

  // 3. Storage & Sync
  {
    name: "Offline Sync Queue Deduplication & Merging",
    category: "Storage & Sync",
    fn: runOfflineQueueTests,
  },
  {
    name: "Card Duplicate Detection & Multi-Deck Search",
    category: "Storage & Sync",
    fn: runCardSliceLogicTests,
  },

  // 4. AI & UI Helpers
  { name: "AI Markdown Response & JSON Extractor", category: "AI & UI", fn: runAIParserTests },
  { name: "Pinyin Neon Tone Colors & Labels Mapper", category: "AI & UI", fn: runPinyinColorTests },
  {
    name: "Centralized Error Handler & Status Messages",
    category: "AI & UI",
    fn: runErrorHandlerTests,
  },
];

async function main() {
  console.log("\n=======================================================");
  console.log("🚀 STARTING ANKI COMPREHENSIVE AUTOMATED TEST SUITE");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  let currentCategory = "";

  for (const suite of suites) {
    if (suite.category !== currentCategory) {
      currentCategory = suite.category;
      console.log(`📌 [${currentCategory.toUpperCase()}]`);
    }

    const suiteStart = Date.now();
    try {
      suite.fn();
      const elapsed = Date.now() - suiteStart;
      console.log(`  ✅ PASS: ${suite.name} (${elapsed}ms)`);
      passed++;
    } catch (err) {
      const elapsed = Date.now() - suiteStart;
      console.error(`  ❌ FAIL: ${suite.name} (${elapsed}ms)`);
      console.error(`     Error: ${err instanceof Error ? err.message : String(err)}\n`);
      failed++;
    }
  }

  const totalTime = Date.now() - startTime;
  console.log("\n-------------------------------------------------------");
  console.log(`📊 TEST SUMMARY: ${passed}/${suites.length} Suites Passed (${totalTime}ms)`);
  if (failed > 0) {
    console.log(`❌ ${failed} suite(s) failed!`);
    console.log("-------------------------------------------------------\n");
    process.exit(1);
  } else {
    console.log(`🎉 ALL 12 TEST SUITES PASSED WITH 100% SUCCESS!`);
    console.log("-------------------------------------------------------\n");
    process.exit(0);
  }
}

main();
