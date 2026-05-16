# Epic 7 — Admin & Privacy User Guide

Hướng dẫn sử dụng khu vực quản trị (Admin) và tính năng quyền riêng tư (PDPA)
của nền tảng MBTI. _Cập nhật: 2026-05-16._

- Admin UI: **https://mbti.thanghost.io.vn/admin**
- Thông tin đăng nhập production: xem file mật (gitignored)
  `docs/epic7-admin-credentials-and-secrets.md` hoặc password manager của team.

---

## 1. Đăng nhập Admin (Story 7.1)

1. Mở `https://mbti.thanghost.io.vn/admin` → tự động chuyển tới
   `/admin/login` nếu chưa đăng nhập.
2. Nhập **Tài khoản** (`admin`) và **Mật khẩu** → bấm **Đăng nhập**.
3. Phiên đăng nhập kéo dài **24 giờ**, sau đó cần đăng nhập lại.
4. Bấm **Đăng xuất** (góc phải header) để thoát sớm.

Sai mật khẩu → thông báo "Sai tài khoản hoặc mật khẩu". Phiên người dùng ẩn
danh (anonymous) **không** có quyền vào Admin — đây là hệ thống token tách biệt
hoàn toàn.

## 2. Dashboard (Story 7.1 / 7.2)

Trang chính `/admin` hiển thị 4 ô số liệu:

| Ô | Ý nghĩa |
|---|---------|
| Tổng bài test hoàn thành | Tổng số kết quả test còn hiệu lực |
| Link mời đang hoạt động | Số invite link chưa hết hạn |
| Tỉ lệ chia sẻ (7 ngày) | Ước lượng: invite tạo / test hoàn thành trong 7 ngày |
| Tỉ lệ hoàn thành | Ước lượng từ dữ liệu D1 |

> Hai tỉ lệ là số liệu ước lượng từ D1 (proxy). Số liệu phân tích chi tiết
> dùng PostHog (mục Analytics).

**Cảnh báo ngưỡng nội dung**: phần dưới dashboard liệt kê các MBTI type có
**< 3 bài viết** (badge vàng). Dùng để biết type nào cần bổ sung nội dung.

## 3. Quản lý nội dung — Articles (Story 7.2)

Vào tab **Content** (`/admin/content`).

**Tạo bài mới:**
1. Điền **Tiêu đề**, **slug** (dạng `kebab-case`, ví dụ `intj-career-tips`),
   chọn **MBTI type**, chọn trạng thái **Nháp** hoặc **Xuất bản**, nhập **Nội dung**.
2. Bấm **Tạo bài viết**.
3. Nếu slug đã tồn tại → báo lỗi "Slug already exists" (slug phải duy nhất).

**Sửa / Xoá:** trong danh sách bên dưới, mỗi bài có nút **Sửa** (đổ dữ liệu lên
form) và **Xoá**. Type thiếu bài (< 3) được đánh dấu cảnh báo vàng.

Bài ở trạng thái **Xuất bản** xuất hiện ngay trong feed công khai
(`/feed?type=...`) ở lần tải kế tiếp — **không cần deploy lại**. Bài **Nháp**
không hiển thị công khai.

## 4. Duyệt Insight (Story 7.3)

Vào tab **Insights** (`/admin/insights`). Insight được nhóm theo 16 MBTI type,
mỗi insight có:

- **Trạng thái**: `approved` (xanh), `pending` (vàng), `rejected` (đỏ).
- **Nguồn**: `curated` (biên tập tay) hoặc `ai` (AI sinh).

Thao tác trên mỗi insight:
- **Duyệt** → chuyển `approved`. Chỉ insight `approved` mới được phục vụ trên
  trang kết quả người dùng.
- **Từ chối** → chuyển `rejected`, loại khỏi pool phục vụ; insight `approved`
  kế tiếp của type đó sẽ được dùng thay.
- Sửa trực tiếp nội dung trong ô text rồi bấm **Lưu nội dung**.

> Toàn bộ insight có sẵn (Epic 3) đã được tự động đặt `approved` khi triển khai
> Epic 7, nên trang kết quả không bị gián đoạn.

## 5. Analytics (Story 7.4)

Vào tab **Analytics** (`/admin/analytics`):
- Tổng số bài test, lượt chia sẻ 7 ngày.
- Tỉ lệ nguồn insight: **AI vs Curated** (thanh ngang).
- Phân bố bài test theo từng MBTI type (biểu đồ thanh).

> Đây là số liệu suy ra từ D1 (proxy). Sự kiện chi tiết (`test_completed`,
> `result_shared`) được gửi sang PostHog phía server/client; bảng phân tích sâu
> nằm trên dashboard PostHog (khi `POSTHOG_API_KEY` được cấu hình).

## 6. Quyền riêng tư người dùng — Xoá dữ liệu (PDPA, Story 7.4)

**Người dùng cuối** có thể tự yêu cầu xoá dữ liệu:

1. Truy cập trang **`/privacy`** (ví dụ
   `https://mbti.thanghost.io.vn/privacy`).
2. Bấm **Xoá dữ liệu của tôi** → **Xác nhận xoá vĩnh viễn**.
3. Hệ thống đánh dấu xoá (soft delete) toàn bộ: kết quả test, link mời, phiếu
   đánh giá, báo cáo tương hợp của người dùng đó, và xoá phiên đăng nhập —
   ngay trong request (đáp ứng yêu cầu PDPA 30 ngày của NFR11).

**Xoá vĩnh viễn tự động:** một Cron chạy **hàng ngày lúc 03:00 UTC** sẽ
hard-delete vĩnh viễn mọi bản ghi đã soft-delete **quá 30 ngày** (FR39).
Admin cũng có thể kích hoạt thủ công: `POST /api/privacy/purge` kèm header
`X-Admin-Token` (yêu cầu đăng nhập admin).

## 7. Xử lý sự cố

| Triệu chứng | Nguyên nhân / Cách xử lý |
|-------------|--------------------------|
| Login luôn báo sai mật khẩu | Hash sai hoặc iterations > 100000. Tạo lại hash bằng `node apps/api/scripts/hash-admin-password.mjs` (đã ghim 100000) rồi `wrangler secret put ADMIN_PASSWORD_HASH` + `wrangler deploy`. |
| Vào `/admin` bị đẩy về login liên tục | Token hết hạn 24h hoặc bị xoá khi gặp 403. Đăng nhập lại. |
| Bài viết mới không lên feed | Kiểm tra trạng thái phải là **Xuất bản** (không phải Nháp). |
| Insight không hiện trên trang kết quả | Insight phải ở trạng thái `approved`. |
| Analytics trống | Bình thường nếu chưa có dữ liệu; số liệu PostHog cần `POSTHOG_API_KEY`. |

## 8. API tham chiếu nhanh (admin — cần header `X-Admin-Token`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/admin/login` | Đăng nhập (public) → `{ adminToken }` |
| GET | `/api/admin/metrics` | Số liệu dashboard |
| GET/POST | `/api/admin/articles` | Liệt kê / tạo bài viết |
| PATCH/DELETE | `/api/admin/articles/:id` | Sửa / xoá bài viết |
| GET/POST | `/api/admin/insights` | Liệt kê (nhóm theo type) / tạo insight |
| PATCH | `/api/admin/insights/:id` | Duyệt/từ chối/sửa nội dung |
| GET | `/api/admin/analytics` | Số liệu phân tích (proxy D1) |
| DELETE | `/api/privacy/delete-me` | Người dùng tự xoá dữ liệu (cần `X-Session-Token`) |
| POST | `/api/privacy/purge` | Hard-delete > 30 ngày (admin/cron) |
