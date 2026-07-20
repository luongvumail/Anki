# Anki - Hệ thống thẻ học từ vựng Tiếng Trung tích hợp AI

Ứng dụng học từ vựng tiếng Trung thông minh dựa trên phương pháp lặp lại ngắt quãng (Spaced Repetition System - SRS), kết hợp với trí tuệ nhân tạo (Gemini AI) giúp người học ghi nhớ từ vựng hiệu quả hơn.

Thiết kế giao diện được tối ưu hóa theo phong cách tối giản, hiện đại của Linear.app và Notion.

---

## 🚀 Các tính năng chính

* **Spaced Repetition System (SRS):** Áp dụng thuật toán chia lịch ôn tập thẻ từ vựng dựa trên mức độ thuộc bài (Lại/Khó/Thuộc/Dễ).
* **Tích hợp Gemini AI:** Tự động giải nghĩa, lấy ví dụ, phiên âm và tạo thẻ học từ vựng tiếng Trung thông minh.
* **Text-to-Speech (TTS):** Hỗ trợ phát âm chuẩn từ vựng Hanzi để người dùng luyện nghe.
* **Nhắc nhở học tập hàng ngày:** Lên lịch thông báo đẩy (Daily Reminder) tự động nhắc nhở người học ôn tập đúng giờ.
* **Haptic Feedback:** Tích hợp phản hồi rung cảm ứng lực cao cấp trong từng thao tác chạm, chọn, đúng/sai.
* **Giao diện Obsidian Slate:** Thiết kế Dark Mode chất lượng cao, có hiệu ứng chuyển cảnh mượt mà và màn hình loading thông minh chống nháy layout.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

* **Core:** React Native (v0.86) & Expo (SDK 57) với **New Architecture** được bật.
* **Routing:** Expo Router v3 (File-based Routing).
* **State Management:** Zustand (v5) chia nhỏ slice lưu trữ.
* **Database & Auth:** Firebase Web SDK 12 (Authentication & Firestore).
* **AI Engine:** Google Generative AI SDK (Gemini API).
* **Styling & UI:** React Native Animated, Expo Linear Gradient, Ionicons.
* **Haptics:** Expo Haptics.
* **Phát âm:** Expo Speech.
* **Thông báo:** Expo Notifications.

---

## 📁 Cấu trúc thư mục chính

```text
├── app/                  # Thư mục chứa các màn hình (Expo Router)
│   ├── (tabs)/           # Các tab chính: Hôm nay (index), Bộ thẻ, Thêm từ, Thống kê
│   ├── auth.tsx          # Màn hình Đăng nhập / Đăng ký tài khoản
│   ├── deck/             # Quản lý và chi tiết Bộ thẻ
│   ├── study/            # Giao diện ôn tập thẻ từ vựng (SRS)
│   └── _layout.tsx       # Cấu hình Root Layout, khởi chạy và quản lý splash loading
├── assets/               # Hình ảnh, icon và logo của ứng dụng
├── components/           # Các component tái sử dụng (UI, Form, Hộp thoại...)
├── constants/            # Định nghĩa theme màu sắc (Linear style), typo, spacing, radii
├── lib/                  # Các dịch vụ dùng chung (Firebase, AI, Notifications, Utils)
├── store/                # Trạng thái toàn cục (Zustand Slices)
├── package.json          # Quản lý thư viện phụ thuộc và script chạy
└── app.json              # File cấu hình Expo Application
```

---

## 💻 Hướng dẫn thiết lập & Chạy dự án

### 1. Chuẩn bị môi trường
Yêu cầu máy tính đã cài đặt sẵn **Node.js (LTS)** và **Cocoapods** (nếu chạy iOS giả lập).

### 2. Cài đặt các thư viện liên quan
Từ thư mục root của dự án, chạy lệnh:
```bash
npm install
```

### 3. Cấu hình biến môi trường
Tạo file `.env` từ file `.env.example` và điền đầy đủ các thông tin cấu hình Firebase cùng API Key Gemini:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

### 4. Khởi chạy ứng dụng

* **Chạy Expo Go / Development Build:**
  ```bash
  npm run start
  ```
* **Chạy trên máy ảo/thiết bị thật iOS:**
  ```bash
  npm run ios
  ```
* **Chạy trên máy ảo/thiết bị thật Android:**
  ```bash
  npm run android
  ```

---

## 🎨 Quy chuẩn thiết kế (Design Tokens)

Dự án áp dụng hệ màu lấy cảm hứng từ Linear.app, được định nghĩa trong `constants/theme.ts`:
* **Màu chủ đạo (Accent):** Indigo (`#5E6AD2`) & Indigo Light (`#707CE6`)
* **Màu nền (Background):** Primary Obsidian Canvas (`#0D0E12`), Panel Surface (`#16181D`)
* **Trạng thái SRS:** Again (`#F85149`), Hard (`#A371F7`), Good (`#3FB950`), Easy (`#707CE6`)
