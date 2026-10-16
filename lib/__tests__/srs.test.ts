import {
  calculateFSRS,
  createDefaultFSRSState,
  FSRS_GRADES,
  isDue,
  FSRSState,
  calculateQuizFSRS,
  calculateRetrievability,
  getIntervalLabel,
  selectCardsByFSRSPriority,
} from "../srs";

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

export function runFSRSTests() {
  // Test 1: Default FSRS state creation
  const defaultState = createDefaultFSRSState();
  assertStrictEqual(defaultState.repetitions, 0, "repetitions should be 0");
  assertStrictEqual(defaultState.interval, 0, "interval should be 0");
  assertStrictEqual(defaultState.state, FSRSState.New, "state should be New (0)");
  assertOk(defaultState.stability > 0, "stability should be initialized");
  assertStrictEqual(defaultState.difficulty, 5.0, "difficulty should be 5.0");
  assertOk(typeof defaultState.dueDate === "string", "dueDate should be string");

  // Test 2: AGAIN grade (Forget)
  const initial = createDefaultFSRSState();
  const nextAgain = calculateFSRS(FSRS_GRADES.AGAIN, initial);
  assertStrictEqual(nextAgain.repetitions, 1, "AGAIN increments reps count");
  assertStrictEqual(nextAgain.interval, 0, "AGAIN resets interval for immediate review");
  assertStrictEqual(nextAgain.state, FSRSState.Learning, "New card gets Learning state on AGAIN");

  // Test 3: GOOD grade (Recall)
  const firstGood = calculateFSRS(FSRS_GRADES.GOOD, initial);
  assertStrictEqual(firstGood.repetitions, 1, "GOOD increases reps");
  assertOk(firstGood.interval >= 1, "GOOD interval should be >= 1 day");
  assertStrictEqual(firstGood.state, FSRSState.Review, "GOOD moves card to Review state");

  // Test 4: EASY grade (Fast recall boost)
  const firstEasy = calculateFSRS(FSRS_GRADES.EASY, initial);
  assertStrictEqual(firstEasy.repetitions, 1);
  assertOk(
    firstEasy.stability > firstGood.stability,
    "EASY stability should be higher than GOOD stability",
  );

  // Test 5: calculateRetrievability decay formula
  const r0 = calculateRetrievability(0, 5);
  assertStrictEqual(r0, 1.0, "Retrievability at 0 elapsed days should be 1.0");
  const rFuture = calculateRetrievability(10, 5);
  assertOk(rFuture < 1.0 && rFuture > 0, "Retrievability should decay over time");

  // Test 6: Quiz Speed Evaluation (with 5000ms threshold for choice)
  // Fast response (<= 3500ms) -> EASY
  const fastEval = calculateQuizFSRS(true, false, 2000, initial);
  assertStrictEqual(fastEval.grade, FSRS_GRADES.EASY, "Fast response should yield EASY grade");
  assertStrictEqual(fastEval.speedCategory, "fast");

  // Normal response (4500ms <= 5000ms) -> GOOD
  const normalEval = calculateQuizFSRS(true, false, 4500, initial);
  assertStrictEqual(normalEval.grade, FSRS_GRADES.GOOD, "Normal response should yield GOOD grade");
  assertStrictEqual(normalEval.speedCategory, "normal");

  // Slow response (6000ms > 5000ms) -> HARD
  const slowEval = calculateQuizFSRS(true, false, 6000, initial);
  assertStrictEqual(slowEval.grade, FSRS_GRADES.HARD, "Slow response should yield HARD grade");
  assertStrictEqual(slowEval.speedCategory, "slow");

  // Retry response -> HARD
  const retryEval = calculateQuizFSRS(true, true, 2000, initial);
  assertStrictEqual(retryEval.grade, FSRS_GRADES.HARD, "Retry response should yield HARD grade");

  // Incorrect response -> AGAIN
  const wrongEval = calculateQuizFSRS(false, false, 1500, initial);
  assertStrictEqual(
    wrongEval.grade,
    FSRS_GRADES.AGAIN,
    "Incorrect answer should yield AGAIN grade",
  );
  assertStrictEqual(wrongEval.speedCategory, "wrong");

  // Test 6b: Typing & Speaking interaction modes have cognitive-fair thresholds
  // 7000ms on typing should be EASY (<= 8000ms), NOT HARD!
  const typingFast = calculateQuizFSRS(true, false, 7000, initial, "typing");
  assertStrictEqual(typingFast.grade, FSRS_GRADES.EASY, "7s typing response should be EASY");
  // 12000ms on typing should be GOOD (<= 15000ms), NOT HARD!
  const typingGood = calculateQuizFSRS(true, false, 12000, initial, "typing");
  assertStrictEqual(typingGood.grade, FSRS_GRADES.GOOD, "12s typing response should be GOOD");
  // 9000ms on speaking should be EASY (<= 10000ms)
  const speakingFast = calculateQuizFSRS(true, false, 9000, initial, "speaking");
  assertStrictEqual(speakingFast.grade, FSRS_GRADES.EASY, "9s speaking response should be EASY");

  // Test 7: isDue comparison
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);
  assertStrictEqual(
    isDue({ repetitions: 1, interval: 1, easeFactor: 2.5, dueDate: pastDate.toISOString() }),
    true,
    "Past due date should be due",
  );

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);
  assertStrictEqual(
    isDue({ repetitions: 1, interval: 5, easeFactor: 2.5, dueDate: futureDate.toISOString() }),
    false,
    "Future due date should not be due",
  );

  // Test 8: getIntervalLabel
  assertStrictEqual(getIntervalLabel(FSRS_GRADES.AGAIN, initial), "Ôn lại ngay");
  assertOk(typeof getIntervalLabel(FSRS_GRADES.GOOD, initial) === "string");

  // Test 9: selectCardsByFSRSPriority prioritizes due cards ahead of future cards
  const cardsForPriority = [
    {
      id: "future_easy",
      srs: {
        repetitions: 5,
        interval: 30,
        easeFactor: 2.5,
        dueDate: futureDate.toISOString(),
        stability: 30,
        difficulty: 3.0,
        state: FSRSState.Review,
      },
    },
    {
      id: "due_hard",
      srs: {
        repetitions: 2,
        interval: 1,
        easeFactor: 2.5,
        dueDate: pastDate.toISOString(),
        stability: 1,
        difficulty: 8.5,
        state: FSRSState.Review,
      },
    },
  ];
  const prioritized = selectCardsByFSRSPriority(cardsForPriority, 1);
  assertStrictEqual(prioritized.length, 1);
  assertStrictEqual(prioritized[0].id, "due_hard", "Due & harder card must be prioritized first");
}
