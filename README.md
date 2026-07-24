# Anki - Hệ Thống Học Từ Vựng Tiếng Trung Tích Hợp AI & Chuẩn Thiết Kế Duolingo 3D

Ứng dụng học từ vựng tiếng Trung thông minh dựa trên phương pháp lặp lại ngắt quãng khoa học (**Spaced Repetition System - SRS SuperMemo-2**), kết hợp với trí tuệ nhân tạo (**Google Gemini AI**) và hệ thống Gamification chuẩn thiết kế **Duolingo 3D Tactile Design System**.

---

## 🌟 Điểm Nổi Bật Về Giao Diện & Trải Nghiệm (Duolingo 3D Design)

* **Hệ thống Nút Bấm 3D Tactile (`DuolingoButton.tsx`):** Nút bấm lún 3D đặc trưng Duolingo với phản hồi cảm ứng lực (Haptics), hỗ trợ 3 kích thước chuẩn mực (`size="lg"` [52px], `size="md"` [44px], `size="sm"` [36px]) cùng màu sắc nhận diện thương hiệu rực rỡ.
* **Linh vật Gấu Trúc Panda (`DuolingoMascot.tsx`):** Tích hợp gấu trúc hoạt họa với hiệu ứng nảy (bounce animation), lời thoại động hỗ trợ 5 biểu cảm (`waving`, `happy`, `celebrate`, `thinking`, `sad`) đồng hành cùng người học trên con đường kỹ năng.
* **Nút Tròn Nổi AI Kéo Di Chuyển (`FloatingAddButton.tsx`):** Nút tròn AI 3D màu xanh lá Duolingo (`52x52px`) cho phép người dùng **chạm giữ và kéo di chuyển tự do đến mọi vị trí trên màn hình** mà không lo che nội dung.
* **Modal Lớp Phủ Nạp Từ AI (`AIAddCardModal.tsx`):** Màn hình lớp phủ full-screen cho phép nạp từ vựng AI tức thì mà không ngắt luồng điều hướng, tích hợp bộ chọn bộ thẻ mục tiêu (`DeckPicker.tsx`) và danh sách lịch sử tra gần đây.
* **Chuẩn Hoá Tương Phản Dark Mode 100%:** 100% tiêu đề & văn bản đọc sử dụng màu **Trắng Thuần (`#FFFFFF`) / Off-white Duolingo (`#F0F3F6`)**, loại bỏ hoàn toàn chữ màu xanh dương nền tối để chống mỏi mắt và tăng độ sắc nét.

---

## 🧠 Cơ Sở Khoa Học & Thuật Toán Học Tập

### 1. Thuật Toán Lặp Lại Ngắt Quãng (SuperMemo-2 SRS)
* Áp dụng đường cong quên của Ebbinghaus để tự động tính toán thời điểm lật lại từ vựng chuẩn xác từng ngày.
* Người học đánh giá thẻ dựa trên 4 mức độ: **Quên (Again)**, **Khó (Hard)**, **Tốt (Good)**, **Dễ (Easy)**.

### 2. Chế Độ Ôn Tập Phản Xạ Khách Quan (Forced-Choice Quiz Mode)
* Giải quyết triệt để hiện tượng **"Ảo tưởng thuộc bài" (Illusion of Competence)** vốn thường xảy ra ở chế độ lật thẻ cảm tính.
* Ứng dụng tự động sinh ra 3 dạng bài tập trắc nghiệm khách quan:
  1. **Pinyin Choice:** Trắc nghiệm chọn Pinyin & thanh điệu đúng trong 4 đáp án (dành cho từ < 3 lượt lặp).
  2. **Listening Test:** Nghe phát âm TTS tiếng Trung và chọn chữ Hán khớp (dành cho từ >= 3 lượt lặp).
  3. **Cloze Test:** Điền chữ Hán còn thiếu vào câu ví dụ ngữ cảnh (dành cho từ >= 5 lượt lặp).

---

## 🚀 Các Tính Năng Chính

* **⚡ Nạp Thẻ AI Tự Động (Gemini API):** Tự động phân tích chữ Hán, Pinyin kèm dấu thanh, cấp độ HSK, bộ thủ, nghĩa tiếng Việt và câu ví dụ ngữ cảnh kèm dịch nghĩa.
* **🔊 Phát Âm Text-to-Speech (TTS):** Hỗ trợ giọng đọc Hán ngữ chuẩn (`expo-speech`) với cơ chế giải phóng bộ nhớ âm thanh tự động chống chồng tiếng.
* **🔥 Chuỗi Streak & Bảng Xếp Hạng:** Đếm chuỗi ngày học liên tục, điểm kinh nghiệm XP và bảng xếp hạng tuần sinh động.
* **🔔 Nhắc Nhở Học Hàng Ngày:** Lên lịch thông báo đẩy (Daily Push Notification) tự động nhắc ôn bài đúng khung giờ đã cài đặt.
* **📳 Haptic Feedback:** Tích hợp phản hồi rung cảm ứng lực cao cấp chuẩn Expo Haptics trên từng thao tác lật thẻ và chọn đáp án.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

* **Core Framework:** React Native (v0.86) & Expo (SDK 57) bật **New Architecture**.
* **Routing:** Expo Router v3 (File-based Routing).
* **State Management:** Zustand (v5) chia nhỏ Slices (`deckSlice`, `cardSlice`, `userSlice`).
* **Database & Auth:** Firebase Web SDK v12 (Authentication & Cloud Firestore).
* **AI Engine:** Google Generative AI SDK (Gemini 2.5 / 1.5 Flash).
* **Styling & Theme:** Vanilla CSS StyleSheet + Duolingo Design System Tokens (`theme.ts`).
* **Icons & Animation:** Ionicons (@expo/vector-icons), React Native Animated.
* **Audio & Speech:** Expo Speech.
* **Notification & Haptics:** Expo Notifications, Expo Haptics.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
Anki/
├── app/                      # Expo Router File-based Routes
│   ├── (tabs)/               # Bottom Tabs: Học (index), Từ vựng (decks), Thống kê (stats)
│   ├── auth.tsx              # Màn hình Đăng nhập / Đăng ký tài khoản
│   ├── deck/[id].tsx         # Màn hình Chi tiết Bộ thẻ & Danh sách từ vựng
│   ├── study/[deckId].tsx    # Màn hình Ôn tập Flashcard & Quiz SRS
│   └── _layout.tsx           # Root Layout & Bottom Tab configuration
├── assets/                   # Hình ảnh, icon và logo của ứng dụng
├── components/               # Các Reusable Component chuẩn Duolingo
│   ├── add/                  # AIAddCardModal, CardPreview, DeckPicker
│   ├── home/                 # ActiveDeckHeroCard, AccountModal, ZigZagSkillPath
│   ├── study/                # FlashcardView, QuizCardView, SessionDoneScreen
│   └── ui/                   # DuolingoButton, DuolingoCard, DuolingoHeader, DuolingoMascot, FloatingAddButton, SectionTitle
├── constants/                # Design Tokens: Colors, Typography, Spacing, Radii (theme.ts)
├── lib/                      # Services (Firebase, Gemini AI, SRS Algorithm, Quiz Generator, Notifications)
├── store/                    # Zustand Global Store & Slices
├── package.json              # Dependencies & Terminal Scripts
└── tsconfig.json             # TypeScript Configuration
```

---

## 💻 Hướng Dẫn Thiết Lập & Khởi Chạy

### 1. Cài đặt thư viện phụ thuộc
Từ thư mục gốc của dự án, chạy lệnh:
```bash
npm install
```

### 2. Cấu hình biến môi trường
Tạo file `.env` ở thư mục gốc dự án và khai báo thông số Firebase cùng Gemini API Key:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

### 3. Khởi chạy ứng dụng
* **Chạy Server Development:**
  ```bash
  npm run start
  ```
* **Chạy trên iOS Simulator:**
  ```bash
  npm run ios
  ```
* **Chạy trên Android Emulator:**
  ```bash
  npm run android
  ```
* **Kiểm tra TypeScript Typecheck:**
  ```bash
  npm run typecheck
  ```
* **Kiểm tra Lỗi ESLint Code Style:**
  ```bash
  npm run lint
  ```
