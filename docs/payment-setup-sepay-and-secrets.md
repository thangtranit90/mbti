# Hướng dẫn cấu hình thanh toán: SePay + Worker Secrets

> Cập nhật: 2026-05-15 · Story 5.4 đã hoàn tất — **SePay đã được code đầy đủ**,
> PayOS đã gỡ bỏ. Cổng chính: **SePay (VietQR)**. Cổng phụ: **Stripe** (thẻ quốc tế).

---

## 0. Trạng thái code (đã xong)

| Thành phần | Đường dẫn | Trạng thái |
|---|---|---|
| Tạo VietQR | `apps/api/src/lib/payment.ts → createSePayCheckout` | ✅ |
| Endpoint checkout | `POST /api/payments/checkout` | ✅ trả QR data |
| **IPN webhook** | `POST /api/payments/sepay-ipn` | ✅ xác thực `Apikey`, idempotent |
| Poll trạng thái | `GET /api/payments/:paymentId/status` | ✅ |
| Migration | `migrations/0010_payments_sepay_gateway.sql` | ✅ |
| UI QR | `apps/web/.../PaymentQR.tsx` + CouplePack + Gap unlock | ✅ |

Tests: API 93/93, Web 30/30 pass. **Chỉ còn cần cấu hình SePay + set secrets.**

---

## 1. Việc cần làm trên màn hình SePay (theo ảnh — Bước 2)

Bạn đang ở **Bước 2 – Thông tin tích hợp & cấu hình**, môi trường **TEST**.

### 1.1. Lưu lại thông tin tích hợp

Copy & cất vào password manager (KHÔNG commit vào git):

| Trường | Ví dụ trong ảnh | Ghi chú |
|---|---|---|
| `MERCHANT ID` | `SP-TEST-VTA49638` | Định danh merchant (môi trường test) |
| `SECRET KEY` | (bấm con mắt để hiện) | Coi như mật khẩu |

> Đây là thông tin **TEST**. Sau khi qua **Bước 4 (production)**, SePay cấp bộ
> mới — phải set lại secrets (§3).

### 1.2. Điền ô "Cấu hình IPN nhận thông báo"

Thay `https://yoursite.com/sepay/ipn` bằng URL webhook thật:

```
https://mbti-api.<SUBDOMAIN-CLOUDFLARE>.workers.dev/api/payments/sepay-ipn
```

> Tìm `<SUBDOMAIN>`: Cloudflare Dashboard → Workers & Pages → **mbti-api** →
> mục Triggers/Routes. Hoặc chạy:
> `cd apps/api && pnpm exec wrangler deployments list`

Bấm **Lưu lại**, rồi bấm **Gửi test** → endpoint phải trả `{"success": true}`
(code đã sẵn sàng, chỉ cần secret `SEPAY_IPN_API_KEY` ở §3 đã set đúng).

### 1.3. Tạo API Key cho IPN

Code xác thực mọi IPN bằng header `Authorization: Apikey <KEY>`.

- Vào SePay → mục **Cấu hình API / Công ty** → tạo một **API Key cho webhook**.
- Key này = secret `SEPAY_IPN_API_KEY` (§3). Nếu SePay tách riêng "API Key cho
  IPN" trong chính màn hình cấu hình webhook thì dùng đúng key đó.

### 1.4. Thông tin tài khoản ngân hàng nhận tiền

VietQR cần số TK + mã ngân hàng. Lấy ở SePay → mục **Tài khoản ngân hàng**:

| Cần lấy | Thành secret | Ví dụ |
|---|---|---|
| Số tài khoản nhận tiền | `SEPAY_BANK_ACCOUNT` | `0123456789` |
| Mã ngân hàng VietQR | `SEPAY_BANK_CODE` | `970436` (Vietcombank), `970415` (VietinBank), `970422` (MBBank) |
| Tên ngân hàng hiển thị | `SEPAY_BANK_NAME` | `Vietcombank` |

### 1.5. Qua Bước 3 → 4

- **Bước 3:** chỉ qua khi `Gửi test` IPN trả `{"success": true}`.
- **Bước 4:** SePay cấp thông tin **production** + bật giao dịch thật → quay lại §3 set lại secrets production.

---

## 2. Luồng hoạt động (để hiểu khi test)

1. User bấm "Thanh toán" → `POST /api/payments/checkout` tạo `payments` row
   (`status=pending`, `provider_ref=QM…`), trả về **ảnh VietQR + số TK + nội dung**.
2. UI hiện màn QR (`PaymentQR.tsx`). User mở app ngân hàng, quét, chuyển tiền —
   **giữ nguyên nội dung chuyển khoản** `QM…` (đã nhúng sẵn trong QR).
3. Tiền về TK → SePay bắn `POST /api/payments/sepay-ipn` (header `Authorization: Apikey …`).
4. Webhook: xác thực key → tìm `payments` theo `QM…` trong `code`/`content` →
   `status=completed` → trả `{"success": true}`.
5. UI đang poll `GET /api/payments/:id/status` mỗi 4s → thấy `completed` →
   hiện "Thanh toán thành công", mở khóa Gap Report / sinh Couple Report.

> Idempotent: SePay retry nhiều lần cùng giao dịch vẫn an toàn (chỉ update khi
> `status != 'completed'`).

---

## 3. Set secrets cho production Worker

> KHÔNG để secrets trong `wrangler.toml` / git. Dùng `wrangler secret put`,
> nhập giá trị qua prompt (lưu mã hoá ở Cloudflare).

```bash
cd apps/api
```

### 3.1. Bộ secrets SePay (BẮT BUỘC — cổng chính)

```bash
pnpm exec wrangler secret put SEPAY_IPN_API_KEY     # API Key webhook ở §1.3
pnpm exec wrangler secret put SEPAY_BANK_ACCOUNT    # số TK nhận tiền §1.4
pnpm exec wrangler secret put SEPAY_BANK_CODE       # mã NH VietQR §1.4 (vd 970436)
pnpm exec wrangler secret put SEPAY_BANK_NAME       # tên NH hiển thị §1.4
```

### 3.2. Bộ secrets Stripe (tuỳ chọn — chỉ nếu bật thẻ quốc tế)

```bash
pnpm exec wrangler secret put STRIPE_SECRET_KEY
pnpm exec wrangler secret put STRIPE_WEBHOOK_SECRET
```

> Không set Stripe cũng được — khi thiếu SePay env hệ thống mới fallback Stripe;
> còn nếu SePay env đủ thì mặc định luôn dùng SePay.

### 3.3. (Khuyến nghị) Origin web cho URL redirect Stripe

```bash
pnpm exec wrangler secret put PUBLIC_WEB_ORIGIN
# vd: https://<domain-web-thật>   (chỉ Stripe dùng; SePay không cần)
```

### 3.4. Kiểm tra

```bash
pnpm exec wrangler secret list
```

Phải thấy tối thiểu 4 secret `SEPAY_*`. Sau khi set xong, **deploy lại** để
Worker nạp secret mới (push lên `main` hoặc `pnpm -F api exec wrangler deploy`).

> ⚠️ Bước 4 SePay (production) sẽ cấp `SEPAY_IPN_API_KEY` / thông tin mới —
> chạy lại các lệnh §3.1 với giá trị production để **ghi đè**, rồi deploy lại.

---

## 4. Checklist Go-live

- [ ] §1.1 — Lưu `MERCHANT ID` + `SECRET KEY`
- [ ] §1.3 — Tạo API Key webhook
- [ ] §1.4 — Lấy số TK + mã NH + tên NH
- [ ] §3.1 — `wrangler secret put` đủ 4 `SEPAY_*`
- [ ] Deploy lại Worker (push `main`) để nạp secret
- [ ] §1.2 — Điền IPN URL, **Lưu lại**, bấm **Gửi test** → nhận `{"success": true}`
- [ ] SePay Bước 3 → Bước 4 (production)
- [ ] §3.1 — Set lại secrets bằng giá trị **production**, deploy lại
- [ ] Test thật: tạo 1 đơn (gap_report 49.000đ), quét QR, chuyển khoản số tiền
      đúng + nội dung `QM…`, chờ ≤1 phút → màn hình tự chuyển "Thành công",
      kiểm tra `payments.status='completed'` (D1)
- [ ] Kiểm tra log webhook ở SePay dashboard không có retry lỗi

---

## 5. An toàn (NFR8)

- KHÔNG log `SECRET KEY`, `SEPAY_IPN_API_KEY`, hay header `Authorization`.
- KHÔNG commit secrets vào git / `wrangler.toml` / `.dev.vars` (đảm bảo
  `.dev.vars` nằm trong `.gitignore`).
- Webhook **xác thực trước, ghi DB sau** — sai/thiếu key → 401, KHÔNG đụng D1.
- Idempotent bắt buộc — SePay retry tới 7 lần (Fibonacci, ≤5h) nếu không nhận
  được `{"success": true}` trong 30s.

---

## 6. Local dev (tuỳ chọn)

Tạo `apps/api/.dev.vars` (đã trong `.gitignore`):

```
SEPAY_IPN_API_KEY=dev-test-key
SEPAY_BANK_ACCOUNT=0123456789
SEPAY_BANK_CODE=970436
SEPAY_BANK_NAME=Vietcombank
```

Giả lập IPN khi dev:

```bash
curl -X POST http://localhost:8787/api/payments/sepay-ipn \
  -H "Authorization: Apikey dev-test-key" \
  -H "Content-Type: application/json" \
  -d '{"id":"t1","transferType":"in","transferAmount":49000,"code":"QMXXXXXX","content":"QMXXXXXX"}'
# → {"success":true}  (thay QMXXXXXX bằng transferContent thật từ checkout)
```
