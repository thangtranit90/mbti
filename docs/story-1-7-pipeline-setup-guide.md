# Hướng dẫn kích hoạt CI/CD Pipeline (Story 1.7)

> **Dành cho:** Junior DevOps / Developer lần đầu setup GitHub Actions + Cloudflare
>
> **Thời gian ước tính:** 20–30 phút
>
> **Mức độ:** Tất cả các bước đều thực hiện qua trình duyệt hoặc terminal — không cần code

---

## Trước khi bắt đầu — Kiểm tra điều kiện

Bạn cần có sẵn:

- [ ] Tài khoản **Cloudflare** và đã đăng nhập trên trình duyệt
- [ ] Tài khoản **GitHub** có quyền Admin trên repo này
- [ ] **Wrangler CLI** đã login (`wrangler whoami` hiện tên account → OK)
- [ ] **gh CLI** đã login (xem giải thích bên dưới)

---

## `gh` là gì? Tại sao cần nó?

`gh` là **GitHub CLI** — công cụ dòng lệnh chính thức của GitHub, giúp bạn thao tác với GitHub (tạo PR, quản lý secrets, xem issues...) ngay trong terminal mà không cần mở trình duyệt.

**Cài đặt:**

```bash
# macOS
brew install gh

# Kiểm tra đã cài chưa
gh --version
```

**Đăng nhập lần đầu:**

```bash
gh auth login
# Chọn: GitHub.com → HTTPS → Login with a web browser
# Trình duyệt tự mở, bạn authorize là xong
```

**Tại sao dùng `gh` để set secrets thay vì GitHub UI?**

Vì khi bạn gõ token vào terminal qua `gh secret set ... < /dev/stdin`, token **không bao giờ xuất hiện trong lịch sử lệnh** (`history`). Nếu dùng `--body "token-here"`, token sẽ lưu trong `~/.bash_history` — ai đọc được file đó là lộ token. Đây là best practice bảo mật.

---

## Bước 1 — Tạo Cloudflare Pages Project

**Đây là gì?** Cloudflare Pages là dịch vụ host website tĩnh (frontend React của bạn). Bước này tạo "chỗ chứa" cho website trên Cloudflare — thực hiện **1 lần duy nhất**.

```bash
# Chạy từ thư mục apps/web
cd apps/web
wrangler pages project create mbti-web --production-branch main
```

**Giải thích lệnh:**
- `wrangler pages project create` — tạo project mới trên Cloudflare Pages
- `mbti-web` — tên project (phải khớp với tên trong file `apps/web/wrangler.toml`)
- `--production-branch main` — nhánh `main` là nhánh production (deploy thật)

**Xác nhận thành công:**

```bash
wrangler pages project list
# Phải thấy: mbti-web trong danh sách
```

**Quay về thư mục gốc sau khi xong:**

```bash
cd ../..
```

---

## Bước 2 — Tạo Cloudflare API Token

**Đây là gì?** API Token là "chìa khóa" cho phép GitHub Actions tự động deploy lên Cloudflare thay bạn. Token này sẽ được lưu bí mật trong GitHub — Cloudflare sẽ nhận ra GitHub Actions như chính bạn.

**Các bước:**

1. Vào: **https://dash.cloudflare.com/profile/api-tokens**
2. Nhấn **"Create Token"**
3. Chọn template **"Edit Cloudflare Workers"** → nhấn **"Use template"**
4. Template có sẵn 3 permissions — bạn cần **thêm 2 cái nữa**:
   - Nhấn **"+ Add more"**
   - Thêm: `Account` → `D1` → `Edit`
   - Nhấn **"+ Add more"** lần nữa
   - Thêm: `Account` → `Cloudflare Pages` → `Edit`
5. Phần **"Account Resources"**: chọn account `1d2219b9236cf74b59467af456e0fbab`
6. Phần **"Zone Resources"**: để trống (dự án này không dùng custom domain giai đoạn này)
7. Nhấn **"Continue to summary"** → **"Create Token"**
8. **Copy token ngay lập tức** — Cloudflare chỉ hiện 1 lần duy nhất!
9. Lưu vào **password manager** (1Password / Bitwarden / LastPass)

> ⚠️ **Quan trọng:** Token này có quyền deploy code lên Cloudflare account của bạn. Đừng share, đừng commit vào git, đừng để vào chat/email.

---

## Bước 3 — Đẩy code lên GitHub và thêm Secrets

**Đây là gì?** GitHub Secrets là nơi lưu thông tin nhạy cảm (như API token) để GitHub Actions dùng khi chạy pipeline — các giá trị này **không bao giờ hiển thị** trong log hay code.

### Bước 3a — Tạo repo GitHub và push code lên (bắt buộc làm trước)

`gh secret set` cần biết phải lưu secret vào repo nào. Nếu repo local chưa kết nối GitHub, lệnh sẽ báo lỗi `no git remotes found`.

Chạy lệnh sau để **tạo repo và push code lên cùng lúc**:

```bash
gh repo create mbti --private --source=. --remote=origin --push
```

**Giải thích từng flag:**
- `mbti` — tên repo sẽ tạo trên GitHub (đổi tên khác nếu muốn)
- `--private` — repo chỉ mình bạn thấy (đổi `--public` nếu muốn public)
- `--source=.` — lấy toàn bộ code từ thư mục hiện tại
- `--remote=origin` — đặt tên kết nối là `origin` (tên chuẩn, không cần đổi)
- `--push` — push code lên GitHub luôn sau khi tạo

Sau khi chạy xong, terminal hiện URL dạng `https://github.com/username/mbti` → đó là repo của bạn.

**Kiểm tra đã kết nối chưa:**

```bash
git remote -v
# Phải thấy: origin  https://github.com/username/mbti.git
```

### Bước 3b — Thêm Secrets

**Lệnh thêm CLOUDFLARE_API_TOKEN (token vừa tạo ở Bước 2):**

```bash
gh secret set CLOUDFLARE_API_TOKEN < /dev/stdin
```

Sau khi chạy lệnh này, terminal sẽ **chờ bạn nhập**. Paste token vào, rồi nhấn:
- **macOS/Linux:** `Ctrl + D`
- **Windows:** `Ctrl + Z` rồi `Enter`

Bạn sẽ thấy: `✓ Set Actions secret CLOUDFLARE_API_TOKEN for ...`

**Lệnh thêm CLOUDFLARE_ACCOUNT_ID (đây là ID không phải secret, nhưng lưu vào đây cho tiện):**

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID --body "1d2219b9236cf74b59467af456e0fbab"
```

> Account ID không phải thông tin bí mật (không có quyền gì nếu chỉ biết ID này), nên dùng `--body` cho tiện.

**Kiểm tra secrets đã được thêm:**

```bash
gh secret list
# Phải thấy: CLOUDFLARE_API_TOKEN và CLOUDFLARE_ACCOUNT_ID
```

---

## Bước 4 — Cấu hình Branch Protection trên GitHub

**Đây là gì?** Branch Protection là tính năng GitHub ngăn code bị lỗi merge vào `main`. Bạn cấu hình để nhánh `main` **bắt buộc phải pass CI** (lint + typecheck + test) trước khi được merge.

**Lưu ý:** Bước này làm sau khi Bước 5 chạy ít nhất 1 lần — vì dropdown "Required status checks" chỉ hiện tên job `ci` sau khi pipeline đã chạy 1 lần.

**Các bước trên GitHub UI:**

1. Vào repo trên GitHub → **Settings** (tab trên cùng)
2. Sidebar trái → **Branches**
3. Nhấn **"Add branch protection rule"** (hoặc "Add rule")
4. **Branch name pattern:** gõ `main`
5. Tích các ô sau:
   - ☑ **Require a pull request before merging**
   - ☑ **Require status checks to pass before merging**
     - ☑ **Require branches to be up to date before merging**
     - Ô tìm kiếm **"Search for status checks"**: gõ `ci` → chọn job `ci` từ dropdown
   - ☑ **Do not allow bypassing the above settings**
6. Nhấn **"Create"** hoặc **"Save changes"**

> 💡 **Nếu không thấy `ci` trong dropdown:** Chạy Bước 5 trước, đợi pipeline xong, rồi quay lại đây.

---

## Bước 5 — Mở Validation PR để Test Pipeline

**Đây là gì?** Tạo một PR "giả" (empty commit) để xem CI pipeline có chạy đúng không mà không sợ ảnh hưởng code thật.

> ⚠️ **Quan trọng — commit code thật trước!**
> Trước khi tạo PR test, bạn phải commit toàn bộ code thật đang có lên `main`. Nếu bỏ qua bước này, các file như workflow CI, vitest config, CORS fix... sẽ không có trên GitHub và pipeline sẽ fail.

```bash
# --- Phần 1: Commit code thật lên main ---

# Xem những file nào đang thay đổi
git status

# Thêm tất cả vào staging
git add .

# Commit toàn bộ
git commit -m "feat: Story 1.7 - CI/CD pipeline with GitHub Actions"

# Push lên nhánh main
git push

# --- Phần 2: Tạo PR test pipeline (empty commit) ---

# Tạo nhánh mới từ main
git checkout -b ci-pipeline-test

# Tạo commit rỗng — không cần git add vì không có file nào thay đổi
# --allow-empty cho phép commit khi không có gì thay đổi
git commit --allow-empty -m "ci: validate Story 1.7 pipeline"

# Push nhánh test lên GitHub
git push -u origin ci-pipeline-test

# Tạo Pull Request
gh pr create \
  --title "Validate Story 1.7 pipeline" \
  --body "Empty commit to test ci.yml + deploy-preview + branch protection."
```

**Những gì bạn cần thấy trong tab Actions sau khi PR được tạo:**

| Job | Kết quả mong đợi |
|-----|-----------------|
| `ci` | ✅ Pass (lint → typecheck → test đều xanh) |
| `deploy-preview` | ✅ Pass + comment trên PR có preview URL |

**Preview URL trông như thế này:**

> 🚀 **Preview deployed**
> - Branch: `ci-pipeline-test`
> - URL: `https://ci-pipeline-test.mbti-web.pages.dev`

Nếu thấy URL này trên PR → **pipeline đang hoạt động đúng!**

---

## Bước 6 — Merge PR và Xác nhận Deploy Production

**Merge PR** trên GitHub UI (hoặc dùng `gh pr merge`).

Sau khi merge → vào tab **Actions** → thấy workflow `deploy` đang chạy:

| Step | Mô tả |
|------|-------|
| Install | Cài packages |
| Predeploy guard | Kiểm tra wrangler.toml không có placeholder IDs |
| Build | Build frontend + API |
| Apply D1 migrations | Chạy migration SQL lên Cloudflare D1 (database thật) |
| Deploy api | Deploy Hono API lên Cloudflare Workers |
| Deploy web | Deploy React SPA lên Cloudflare Pages (production) |

Tất cả 6 step đều ✅ → thành công!

---

## Bước 7 — Gắn Custom Domain `mbti.thanghost.io.vn`

**Đây là gì?** Sau khi Pages project đã deploy xong (Bước 6), bạn gắn domain riêng vào. Vì domain `thanghost.io.vn` đã dùng Cloudflare nameservers, Cloudflare sẽ **tự tạo DNS record** cho bạn — không cần cấu hình thủ công.

**Các bước trên Cloudflare Dashboard:**

1. Vào **dash.cloudflare.com** → **Workers & Pages**
2. Chọn project **mbti-web**
3. Tab **Custom domains** → nhấn **"Set up a custom domain"**
4. Nhập: `mbti.thanghost.io.vn` → nhấn **Continue**
5. Cloudflare hiện DNS record cần tạo — nhấn **"Activate domain"**
6. Đợi ~1–2 phút → domain chuyển sang trạng thái **Active** ✅

> 💡 **Tại sao không cần cấu hình DNS thủ công?** Vì `thanghost.io.vn` đang dùng Cloudflare làm DNS provider, Cloudflare tự thêm CNAME record `mbti → mbti-web.pages.dev` cho bạn ngay lập tức.

**Verify domain đã hoạt động:**

```bash
curl -I https://mbti.thanghost.io.vn
# Kết quả mong đợi: HTTP/2 200
```

---

## Bước 8 — Verify Production

Sau khi domain active, test toàn bộ:

```bash
# Test frontend qua custom domain
curl -I https://mbti.thanghost.io.vn
# Kết quả mong đợi: HTTP/2 200

# Test API (Workers URL — tìm ở: Cloudflare → Workers & Pages → tên worker → Overview)
curl https://<worker-name>.<account>.workers.dev/api/health
# Kết quả mong đợi: {"data":{"status":"ok"},"error":null}
```

> **Lưu ý:** API vẫn dùng `*.workers.dev` ở giai đoạn này. Custom domain cho API (ví dụ `api.mbti.thanghost.io.vn`) sẽ được cấu hình ở story sau khi feature routes đã có.

---

## Domain hiện tại của dự án

| | URL |
|---|---|
| **Frontend (production)** | `https://mbti.thanghost.io.vn` |
| **Frontend (Pages mặc định)** | `https://mbti-web.pages.dev` |
| **Frontend (PR preview)** | `https://<branch-name>.mbti-web.pages.dev` |
| **API (Workers)** | `https://<worker-name>.<account>.workers.dev` |

---

## Xử lý sự cố phổ biến

### ❌ `wrangler: command not found`

```bash
# Cài wrangler global
npm install -g wrangler
# Hoặc dùng pnpm
pnpm add -g wrangler
```

### ❌ `gh: command not found`

```bash
brew install gh   # macOS
gh auth login     # Sau đó đăng nhập
```

### ❌ CI fail với "frozen-lockfile"

```bash
# Cập nhật lockfile trước khi push
pnpm install
git add pnpm-lock.yaml
git commit -m "fix: update lockfile"
git push
```

### ❌ `deploy-preview` không chạy dù CI pass

Kiểm tra điều kiện fork: job `deploy-preview` chỉ chạy khi PR từ **cùng repo** (không phải fork). Nếu bạn đang dùng fork, đây là behavior đúng — preview không chạy trên fork để bảo vệ secrets.

### ❌ `gh repo create` báo lỗi `current directory is not a git repository`

Bạn đang chạy lệnh sai thư mục. Kiểm tra bạn đang ở đâu:

```bash
pwd
# Phải thấy đường dẫn tới thư mục gốc dự án, ví dụ:
# /Users/username/projects/MBTI
```

Di chuyển về đúng thư mục gốc rồi chạy lại:

```bash
cd /đường/dẫn/tới/MBTI   # thay bằng đường dẫn thật của bạn
gh repo create mbti --private --source=. --remote=origin --push
```

> 💡 **Mẹo nhớ:** Tất cả lệnh trong hướng dẫn này đều phải chạy từ **thư mục gốc monorepo** (chỗ có file `package.json` và thư mục `apps/`), trừ Bước 1 (`cd apps/web`).

### ❌ `gh secret set` báo lỗi `no git remotes found`

Repo local chưa kết nối với GitHub. Chạy lệnh này trước:

```bash
gh repo create mbti --private --source=. --remote=origin --push
```

Sau đó chạy lại `gh secret set`.

### ❌ Deploy workflow fail: `npm error Unsupported URL Type "workspace:"`

**Log đầy đủ:**
```
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "workspace:": workspace:*
```

**Nguyên nhân:** `wrangler-action` không tìm thấy `wrangler` trong `apps/web/node_modules/.bin/` nên nó tự cài bằng `npm install wrangler`. Nhưng `npm` đọc file `package.json` và gặp cú pháp `workspace:*` — đây là cú pháp riêng của `pnpm`, `npm` không hiểu và báo lỗi.

**Fix:** Thêm `wrangler` vào root `package.json` (đã được fix trong codebase này). Nếu bạn gặp lỗi này sau khi cập nhật dependencies:

```bash
# Thêm wrangler vào root devDependencies
pnpm add -D -w wrangler

# Cập nhật lockfile và commit
git add package.json pnpm-lock.yaml
git commit -m "fix: add wrangler to root devDependencies for CI compatibility"
git push
```

### ❌ D1 migrations fail trong deploy

Kiểm tra API token có quyền `D1: Edit` chưa (Bước 2). Nếu thiếu quyền, tạo lại token và cập nhật GitHub secret.

---

## Tóm tắt nhanh

```
Bước 1: wrangler pages project create mbti-web --production-branch main
Bước 2: Tạo API token trên Cloudflare dashboard (thêm D1:Edit + Pages:Edit)
Bước 3a: gh repo create mbti --private --source=. --remote=origin --push
Bước 3b: gh secret set CLOUDFLARE_API_TOKEN  +  gh secret set CLOUDFLARE_ACCOUNT_ID
Bước 4: GitHub → Settings → Branches → branch protection (sau khi Bước 5 xong)
Bước 5: git checkout -b ci-pipeline-test && git commit --allow-empty && gh pr create
Bước 6: Merge PR → xem deploy workflow chạy
Bước 7: Cloudflare → mbti-web → Custom domains → thêm mbti.thanghost.io.vn
Bước 8: curl https://mbti.thanghost.io.vn → HTTP/2 200  ✅
```
