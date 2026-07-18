// Centralized User-Facing Error Handler for Anki Anki
// Converts raw technical error codes into friendly, localized Vietnamese messages with clear guidance.

/**
 * Maps Firebase Authentication error codes to friendly Vietnamese messages.
 */
export function getAuthErrorMessage(error: any): string {
  if (!error) return "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";

  const code = typeof error === "string" ? error : error.code || "";
  const message = error.message || "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.";

    case "auth/user-not-found":
      return "Không tìm thấy tài khoản với email này. Vui lòng kiểm tra chính tả hoặc tạo tài khoản mới.";

    case "auth/email-already-in-use":
      return "Địa chỉ email này đã được đăng ký tài khoản khác. Vui lòng đăng nhập hoặc dùng email khác.";

    case "auth/weak-password":
      return "Mật khẩu quá ngắn. Vui lòng nhập mật khẩu từ 6 ký tự trở lên.";

    case "auth/invalid-email":
      return "Địa chỉ email không hợp lệ. Vui lòng nhập đúng dạng example@domain.com.";

    case "auth/too-many-requests":
      return "Tài khoản tạm thời bị khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau vài phút.";

    case "auth/network-request-failed":
      return "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối Wi-Fi hoặc 4G của bạn.";

    case "auth/requires-recent-login":
      return "Vì lý do bảo mật, phiên làm việc đã hết hạn. Vui lòng đăng xuất và đăng nhập lại để thực hiện thao tác này.";

    case "auth/user-disabled":
      return "Tài khoản này đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ.";

    default:
      if (message.includes("network") || message.includes("fetch")) {
        return "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối Internet.";
      }
      return "Không thể thực hiện thao tác. Vui lòng thử lại sau.";
  }
}

/**
 * Maps Gemini AI & API errors to friendly Vietnamese messages.
 */
export function getGeminiErrorMessage(error: any): string {
  if (!error) return "Không thể tạo từ vựng bằng AI. Vui lòng thử lại.";

  const message = error.message || String(error);

  if (
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("429") ||
    message.includes("quota")
  ) {
    return "Hệ thống AI đang quá tải lượt tra cứu. Vui lòng đợi 30 giây rồi bấm thử lại.";
  }

  if (message.includes("JSON") || message.includes("parse") || message.includes("SyntaxError")) {
    return "AI chưa thể phân tích từ vựng này. Vui lòng kiểm tra lại chính tả chữ Hán hoặc Pinyin đã nhập.";
  }

  if (
    message.includes("network") ||
    message.includes("Failed to fetch") ||
    message.includes("offline")
  ) {
    return "Không thể kết nối với AI. Vui lòng kiểm tra mạng Internet của bạn.";
  }

  return "Không thể phân tích từ vựng lúc này. Vui lòng thử lại sau.";
}

/**
 * Maps Firestore & database errors to friendly Vietnamese messages.
 */
export function getFirestoreErrorMessage(error: any): string {
  if (!error) return "Đã xảy ra lỗi dữ liệu. Vui lòng thử lại.";

  const code = error.code || "";
  const message = error.message || "";

  if (code === "permission-denied") {
    return "Bạn không có quyền thực hiện thao tác này. Vui lòng đăng nhập lại.";
  }

  if (code === "unavailable" || message.includes("offline")) {
    return "Thiết bị đang ngoại tuyến. Dữ liệu sẽ tự động đồng bộ khi có mạng trở lại.";
  }

  return "Không thể lưu dữ liệu. Vui lòng thử lại sau.";
}
