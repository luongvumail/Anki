function assertStrictEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${expected}, got ${actual}. ${message || ""}`);
  }
}

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Pure streak calculator simulating the logic in reviewTracker
 */
function calculateStreakFromHistory(
  history: Record<string, number>,
  referenceDate: Date = new Date(),
): number {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(referenceDate);
    d.setDate(referenceDate.getDate() - i);
    const dateStr = getLocalDateString(d);
    if (history[dateStr] && history[dateStr] > 0) {
      streak++;
    } else {
      // Allow 1-day grace: if today has no reviews yet but yesterday did, streak still counts
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

export function runStreakEngineTests() {
  const today = new Date();
  const todayStr = getLocalDateString(today);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const day2Ago = new Date(today);
  day2Ago.setDate(today.getDate() - 2);
  const day2AgoStr = getLocalDateString(day2Ago);

  const day3Ago = new Date(today);
  day3Ago.setDate(today.getDate() - 3);
  const day3AgoStr = getLocalDateString(day3Ago);

  // Test 1: Empty history -> 0 streak
  assertStrictEqual(calculateStreakFromHistory({}), 0, "Empty history must yield 0 streak");

  // Test 2: Reviewed today only -> 1 streak
  assertStrictEqual(
    calculateStreakFromHistory({ [todayStr]: 5 }),
    1,
    "Reviewed today should be 1 streak",
  );

  // Test 3: Reviewed 3 consecutive days (today + yesterday + 2 days ago) -> 3 streak
  assertStrictEqual(
    calculateStreakFromHistory({
      [todayStr]: 10,
      [yesterdayStr]: 8,
      [day2AgoStr]: 12,
    }),
    3,
    "3 consecutive days ending today should yield 3 streak",
  );

  // Test 4: 1-Day Grace Period (Not reviewed today yet, but reviewed yesterday & day before) -> 2 streak
  assertStrictEqual(
    calculateStreakFromHistory({
      [yesterdayStr]: 15,
      [day2AgoStr]: 20,
    }),
    2,
    "1-day grace period should preserve yesterday streak of 2",
  );

  // Test 5: Broken streak (Reviewed today and 3 days ago, but missed yesterday) -> 1 streak
  assertStrictEqual(
    calculateStreakFromHistory({
      [todayStr]: 5,
      [day3AgoStr]: 10,
    }),
    1,
    "Missed yesterday should reset streak to just today (1)",
  );

  // Test 6: Missed 2 days ago and yesterday -> 0 streak
  assertStrictEqual(
    calculateStreakFromHistory({
      [day2AgoStr]: 10,
      [day3AgoStr]: 10,
    }),
    0,
    "Missed yesterday and today should reset streak to 0",
  );
}
