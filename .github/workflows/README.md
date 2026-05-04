# Giải thích CI/CD Workflows

> Dành cho junior DevOps / người mới làm quen GitHub Actions.

---

## 2 workflow làm việc khác nhau

```
ci.yml      → Chạy khi bạn mở PR  (kiểm tra code trước khi merge)
deploy.yml  → Chạy khi merge vào main  (đưa code lên internet thật)
```

Hình dung như 2 nhân viên:
- **CI** = bảo vệ cửa, kiểm tra hàng trước khi vào kho
- **Deploy** = shipper, đưa hàng đã kiểm tra ra thị trường

---

## `ci.yml` — Workflow kiểm tra

**Kích hoạt khi nào?**

```yaml
on:
  pull_request:       # Khi bạn mở hoặc push thêm vào PR
    branches: [main]
  push:
    branches-ignore: [main]  # Khi push lên bất kỳ nhánh nào NGOÀI main
```

Tức là: **mỗi khi bạn push code lên một nhánh → CI chạy ngay.**

---

### Job 1: `ci` — Kiểm tra code

```
Bước 1: Checkout    → tải code về máy ảo GitHub
Bước 2: Setup pnpm  → cài pnpm
Bước 3: Setup Node  → cài Node.js v22
Bước 4: Install     → pnpm install (cài packages)
Bước 5: Lint        → kiểm tra code có viết đúng format không
Bước 6: Typecheck   → kiểm tra TypeScript có đúng kiểu dữ liệu không
Bước 7: Test        → chạy unit tests
```

Nếu bất kỳ bước nào ❌ → job dừng, PR bị block không cho merge.

---

### Job 2: `deploy-preview` — Tạo link preview cho PR

```yaml
needs: ci   # ← phải đợi job "ci" xanh hết mới chạy
```

Tức là: CI pass rồi mới deploy preview — không bao giờ preview code lỗi.

```
Bước 1-4: Giống ci (checkout + cài đặt)
Bước 5: Build web   → build React app thành file HTML/JS/CSS
Bước 6: Deploy lên Cloudflare Pages (nhánh riêng, không phải production)
Bước 7: Comment URL lên PR
```

Kết quả: PR của bạn có comment tự động như này:

```
🚀 Preview deployed
- Branch: ci-pipeline-test
- URL: https://ci-pipeline-test.mbti-web.pages.dev
```

Bạn click vào link → xem thử website trước khi merge.

---

## `deploy.yml` — Workflow deploy thật

**Kích hoạt khi nào?**

```yaml
on:
  push:
    branches: [main]   # Chỉ chạy khi có code vào nhánh main
```

Tức là: **chỉ khi merge PR vào main → deploy mới chạy.** Không bao giờ deploy từ nhánh khác.

---

### Các bước theo thứ tự

```
Bước 1-4: Checkout + cài đặt (giống ci)

Bước 5: Predeploy guard
   → Kiểm tra file wrangler.toml không có ID "fake" (placeholder)
   → Tránh vô tình deploy với config chưa điền thật

Bước 6: Build
   → Build toàn bộ project (API + web)

Bước 7: Apply D1 migrations
   → Chạy các file SQL migration lên database thật trên Cloudflare
   → Giống như "cập nhật cấu trúc database trước khi deploy code mới"

Bước 8: Deploy API
   → Đẩy code Hono API lên Cloudflare Workers (backend)

Bước 9: Deploy Web
   → Đẩy React app lên Cloudflare Pages (frontend)
```

> **Tại sao thứ tự Database → API → Web quan trọng?**
> Nếu deploy Web trước, người dùng sẽ dùng frontend mới gọi vào API cũ — API cũ chưa có endpoint mới → lỗi. Đảm bảo database cập nhật trước, API hiểu schema mới, cuối cùng frontend mới được phép lên.

---

## Sơ đồ toàn cảnh

```
Bạn push code lên nhánh "feature-xyz"
        ↓
   ci.yml chạy
   ├── Job "ci": Lint → Typecheck → Test
   │         ↓ (nếu pass)
   └── Job "deploy-preview": Build → Deploy preview → Comment PR URL

Bạn merge PR vào main
        ↓
   deploy.yml chạy
   └── Job "deploy": Guard → Build → DB migrate → Deploy API → Deploy Web
                                                               ↓
                                               mbti.thanghost.io.vn live!
```

---

## Tóm lại 1 câu

**CI là vệ sĩ kiểm tra trước cửa, Deploy là shipper giao hàng sau khi vệ sĩ gật đầu.**
