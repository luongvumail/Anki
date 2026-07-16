# Stats Dashboard Design

## Context

Màn hình Thống kê hiện tại có nhiều vấn đề: thanh progress bar thiếu Learning, biểu đồ ghi sai tiêu đề, danh hiệu vô nghĩa, không có thông tin "hôm nay cần ôn bao nhiêu từ". Người dùng cần một dashboard thực tế hơn, bám sát lịch trình SRS (Spaced Repetition System).

## Sections

### 1. Streak + Tổng quan học tập

- 🔥 Streak hiện tại (từ `profile.streak`)
- 3 ô: **Đang học** / **Ôn tập** / **Đã thuộc** (từ `local_progress.status`)

### 2. Mục tiêu hôm nay (SRS-based)

Không phải mục tiêu cứng "20 từ/ngày", mà dựa trên lịch SRS:

| Thông số        | SQL Query                                                                   |
| --------------- | --------------------------------------------------------------------------- |
| Cần ôn hôm nay  | `SELECT COUNT(*) FROM local_progress WHERE next_review_at <= end_of_today`  |
| Quá hạn (bỏ lỡ) | `SELECT COUNT(*) FROM local_progress WHERE next_review_at < start_of_today` |
| Đã ôn hôm nay   | `SELECT COUNT(*) FROM review_logs WHERE date(created_at) = date('now')`     |
| % hoàn thành    | `đã_ôn / cần_ôn * 100`                                                      |

- Hiển thị % hoàn thành dạng Progress Circle (component đã có sẵn: `ProgressCircle.tsx`)
- Nếu `cần_ôn = 0`, hiển thị "Hôm nay không có từ cần ôn 🎉"

### 3. Biểu đồ ôn tập 7 / 30 ngày

- Dữ liệu từ `review_logs` (đã có, chỉ mở rộng query)
- Mặc định: 7 ngày
- Có nút chuyển: **7 ngày** ↔ **30 ngày**
- Cột dọc: số lần ôn tập
- Số 0: cột màu mờ
- > 0: cột màu hồng (#FF2D55)
- Empty state: "Chưa có dữ liệu ôn tập"

### 4. Lịch sử SRS chi tiết

- Danh sách từng từ với: `simplified`, `pinyin`, `status`, `repetitions`, `next_review_at`
- Filter: Tất cả / Đang học / Ôn tập / Đã thuộc
- Search: theo `simplified`, `pinyin`, `han_viet`, `definition_vi`
- Pull-to-refresh
- Empty state cho mỗi filter

## Data Sources

| Source           | File        | Notes                       |
| ---------------- | ----------- | --------------------------- |
| local_progress   | `sqlite.ts` | SRS progress per word       |
| local_vocabulary | `sqlite.ts` | Word definitions            |
| review_logs      | `sqlite.ts` | Review history (local only) |
| profile          | `store.ts`  | Streak                      |

## New SQL Queries Needed

Add to `localProgress` in `sqlite.ts`:

```typescript
// Số từ cần ôn hôm nay
getDueTodayCount: (endOfToday: string): number

// Số từ quá hạn
getOverdueCount: (startOfToday: string): number

// Số lần ôn hôm nay
getTodayReviewCount: (todayDate: string): number

// Lịch sử 30 ngày
getHistory30Days: (): { study_date: string; count: number }[]

// Tất cả từ kèm progress (cho lịch sử SRS chi tiết)
// Đã có: localVocab.getAllWithProgress()
```

## Files to Modify

| File                       | Change                                       |
| -------------------------- | -------------------------------------------- |
| `src/services/sqlite.ts`   | Thêm 4 query helpers mới vào `localProgress` |
| `src/app/(tabs)/stats.tsx` | Rewrite toàn bộ UI                           |

## Files to Keep Unchanged

- `src/services/store.ts` — không cần sửa
- `src/services/sync.ts` — không cần sửa
- `src/utils/srs.ts` — không cần sửa
- `src/components/ProgressCircle.tsx` — tái sử dụng component có sẵn

## Verification

1. Test trên mock data: thêm từ, vuốt vài lượt, vào Stats xem số liệu
2. Kiểm tra các empty state
3. Chuyển 7 ngày ↔ 30 ngày, verify biểu đồ cập nhật
4. Filter/search trong SRS history, verify kết quả
