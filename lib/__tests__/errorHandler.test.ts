import {
  getAuthErrorMessage,
  getGeminiErrorMessage,
  getFirestoreErrorMessage,
} from "../errorHandler";

function assertStrictEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${expected}, got ${actual}. ${message || ""}`);
  }
}

export function runErrorHandlerTests() {
  // Test Auth errors
  const msgAuth1 = getAuthErrorMessage({ code: "auth/invalid-credential" });
  assertStrictEqual(msgAuth1, "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.");

  const msgAuth2 = getAuthErrorMessage({ code: "auth/network-request-failed" });
  assertStrictEqual(
    msgAuth2,
    "Không thể kết nối máy chủ đăng nhập. Vui lòng kiểm tra Wi-Fi hoặc 4G của bạn.",
  );

  // Test Gemini errors
  const msgGemini1 = getGeminiErrorMessage(new Error("RESOURCE_EXHAUSTED: 429 quota exceeded"));
  assertStrictEqual(
    msgGemini1,
    "Hệ thống AI đang tạm thời đạt giới hạn lượt gọi (429 Rate Limit). Vui lòng đợi khoảng 30–60 giây rồi thử lại.",
  );

  // Test Firestore errors
  const msgFs1 = getFirestoreErrorMessage({ code: "permission-denied" });
  assertStrictEqual(msgFs1, "Bạn không có quyền thực hiện thao tác này. Vui lòng đăng nhập lại.");
}
