import AsyncStorage from "@react-native-async-storage/async-storage";

const REVIEW_HISTORY_KEY = "@anki_review_history";

/**
 * Returns a map of YYYY-MM-DD -> count of reviews completed on that day.
 */
export async function getReviewHistory(): Promise<Record<string, number>> {
  try {
    const json = await AsyncStorage.getItem(REVIEW_HISTORY_KEY);
    return json ? JSON.parse(json) : {};
  } catch (e) {
    console.warn("[reviewTracker] Error reading review history:", e);
    return {};
  }
}

/**
 * Records a card review for today (YYYY-MM-DD) in local persistent storage.
 */
export async function recordReviewToday(): Promise<Record<string, number>> {
  try {
    const history = await getReviewHistory();
    const todayStr = new Date().toISOString().split("T")[0];
    history[todayStr] = (history[todayStr] || 0) + 1;
    await AsyncStorage.setItem(REVIEW_HISTORY_KEY, JSON.stringify(history));
    return history;
  } catch (e) {
    console.warn("[reviewTracker] Error saving review history:", e);
    return {};
  }
}
