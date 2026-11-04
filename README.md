# Anki - Hệ Thống Học Từ Vựng Tiếng Trung Tích Hợp AI & Chuẩn Thiết Kế Clean Surface

Ứng dụng học từ vựng tiếng Trung thông minh dựa trên phương pháp lặp lại ngắt quãng khoa học (**Spaced Repetition System - FSRS SuperMemo-2 / FFSRS**), kết hợp với trí tuệ nhân tạo (**Google Gemini AI**) và hệ thống giao diện **Clean Surface Design System**.

---

## 🌟 Điểm Nổi Bật Về Giao Diện & Trải Nghiệm (Design System)

- **Giao Diện Flashcard Full-Width Chi Tiết (`FlashcardView.tsx`):** Thiết kế tối giản, loại bỏ viền thừa. Khối **CẤU TRÚC TỪ & BỘ THỦ** và khối **CÂU VÍ DỤ** tự động giãn nở đúng 100% chiều ngang thẻ (`alignSelf: "stretch"`), tạo sự cân đối chuẩn xác dù câu ví dụ ngắn hay dài.
- **Hệ Thống Nút Bấm 2-Tier (`AppButton.tsx`):** Tối giản với 2 cấp độ (Primary Accent & Secondary Soft), tích hợp phản hồi rung cảm ứng lực (Haptic Feedback) mượt mà.
- **Nút Tròn Nổi AI Kéo Di Chuyển (`FloatingAddButton.tsx`):** Nút tròn AI 3D màu xanh lá (`52x52px`) cho phép người dùng **chạm giữ và kéo di chuyển tự do đến mọi vị trí trên màn hình** mà không che nội dung.
- **Modal Nạp Từ AI Tự Động Lọc Trùng (`AIAddCardModal.tsx`):** Màn hình nạp từ vựng bằng AI tích hợp bộ lọc từ trùng lặp tự động, thông báo duy nhất và nút "THÊM TẤT CẢ" 1 chạm.
- **Chuẩn Hoá Tương Phản Dark Mode 100% & Clean Code:** 100% tiêu đề & văn bản đọc sử dụng màu sắc tương phản cao, loại bỏ mỏi mắt. Đạt chuẩn **0 Errors, 0 Warnings** trên toàn bộ hệ thống linter ESLint (`npm run lint`).

---

## 🧠 Cơ Sở Khoa Học & Thuật Toán Học Tập

### 1. Thuật Toán Lặp Lại Ngắt Quãng (SuperMemo-2 FSRS / FFSRS)

- Áp dụng đường cong quên của Ebbinghaus để tự động tính toán thời điểm lật lại từ vựng chuẩn xác từng ngày.
- Người học đánh giá thẻ dựa trên các mức độ phản xạ để tự động điều chỉnh khoảng thời gian ôn tập.

### 2. Chế Độ Ôn Tập Phản Xạ Thích Ứng (Adaptive Quiz Mode)

- Ứng dụng tự động sinh ra 4 dạng bài tập trắc nghiệm khách quan:
  1. **Meaning Choice:** Chọn nghĩa Tiếng Việt từ chữ Hán (dành cho từ mới).
  2. **Pinyin Choice:** Chọn Pinyin & thanh điệu đúng trong 4 đáp án.
  3. **Listening Test:** Nghe phát âm TTS tiếng Trung và chọn chữ Hán khớp.
  4. **Cloze Test:** Điền chữ Hán còn thiếu vào câu ví dụ ngữ cảnh.

### 3. Trung Tâm Luyện Tập Tự Do (Practice Hub) & Mini-Games

- **🧩 Game Ghép Từ Nhanh 60s (Speed Match Arcade):** Thử thách 60 giây ghép cặp Chữ Hán ↔ Nghĩa/Pinyin rèn phản xạ nhanh tay lẹ mắt.
- **🔤 Xếp Từ Thành Câu (Sentence Builder):** Kéo/bấm từ xáo trộn để sắp xếp thành câu ví dụ chuẩn ngữ pháp.
- **🎖️ Điểm XP & Huy Hiệu Cá Nhân:** Tích lũy điểm XP để thăng cấp danh hiệu Hán ngữ (`初学者` ➔ `汉字宗师`) và mở khóa Bộ Huy Hiệu thành tích cá nhân.

---

## 🚀 Các Tính Năng Chính

- **⚡ Nạp Thẻ AI Tự Động (Gemini API):** Phân tích chữ Hán, Pinyin kèm dấu thanh, cấp độ HSK, bộ thủ, nghĩa tiếng Việt và câu ví dụ ngữ cảnh.
- **🔊 Phát Âm Text-to-Speech (TTS):** Hỗ trợ giọng đọc Hán ngữ chuẩn (`expo-speech`).
- **🔥 Chuỗi Streak & Thống Kê 7 Ngày:** Đếm chuỗi ngày học liên tục, biểu đồ 7 ngày gần nhất và bộ sưu tập huy hiệu cá nhân.
- **🌐 Hỗ Trợ Web PWA (Vĩnh Viễn trên iPhone):** Đóng gói Web PWA mượt mà, hỗ trợ thêm vào màn hình chính iPhone sử dụng vĩnh viễn không lo bị văng hay hết hạn 7 ngày.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

- **Core Framework:** React Native (v0.86) & Expo (SDK 57) bật **New Architecture**.
- **Routing:** Expo Router v3 (File-based Routing với 4 Tabs).
- **State Management:** Zustand (v5) chia nhỏ Slices (`deckSlice`, `cardSlice`, `userProgressSlice`).
- **Database & Auth:** Firebase Web SDK v12 (Authentication & Cloud Firestore).
- **AI Engine:** Google Generative AI SDK (Gemini 2.5 / 1.5 Flash).
- **Styling & Theme:** Vanilla CSS StyleSheet + App Design System Tokens (`DESIGN.md`, `theme.ts`).
- **Audio & Haptics:** Expo Speech, Expo Haptics, Expo Notifications.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
Anki/
├── app/                      # Expo Router File-based Routes
│   ├── (tabs)/               # Bottom Tabs: Học (index), Từ vựng (decks), Luyện tập (practice), Thống kê (stats)
│   ├── auth.tsx              # Màn hình Đăng nhập / Đăng ký tài khoản
│   ├── deck/[id].tsx         # Màn hình Chi tiết Bộ thẻ & Danh sách từ vựng
│   ├── study/[deckId].tsx    # Màn hình Ôn tập Flashcard & Quiz FSRS
│   └── _layout.tsx           # Root Layout & Bottom Tab configuration
├── components/               # Các Reusable Component chuẩn App
│   ├── add/                  # AIAddCardModal, CardPreview, DeckPicker
│   ├── home/                 # ActiveDeckHeroCard, AccountModal, ZigZagSkillPath
│   ├── practice/             # SpeedMatchModal, SentenceBuilderModal
│   ├── stats/                # BadgesGallery
│   ├── study/                # FlashcardView, QuizCardView, SessionDoneScreen
│   └── ui/                   # AppButton, AppCard, AppHeader, FloatingAddButton, SectionTitle, ProgressBar
├── constants/                # Design Tokens: Colors, Typography, Spacing, Radii (theme.ts)
├── lib/                      # Services (Firebase, AI, FSRS Algorithm, Quiz Generator, Notifications)
├── store/                    # Zustand Global Store & Slices (`userProgressSlice.ts`)
├── DESIGN.md                 # Single source of truth cho Design Tokens & Specs
├── README.md                 # Tài liệu hướng dẫn & tổng quan dự án
├── package.json              # Dependencies & Terminal Scripts
└── tsconfig.json             # TypeScript Configuration
```

