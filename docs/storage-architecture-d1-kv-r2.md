# Storage Architecture — D1, KV, R2

Tóm tắt 3 lớp lưu trữ Cloudflare được dùng trong dự án MBTI và vai trò từng loại.

> Nguồn: `_bmad-output/planning-artifacts/architecture.md`, `migrations/0001_initial_schema.sql`

---

## Tổng quan

| Storage | Loại dữ liệu | Use case chính |
|---|---|---|
| **Cloudflare D1** (SQLite) | Dữ liệu có cấu trúc, quan hệ | Test results, social graph, content, articles |
| **Cloudflare KV** | Key-value, đọc nhanh global, có TTL | Session tokens, invite state, edge cache |
| **Cloudflare R2** | Object/binary | OG images, result cards, compatibility reports |

---

## 1. Cloudflare D1 (SQLite) — Dữ liệu có cấu trúc, quan hệ

5 bảng đã định nghĩa trong `migrations/0001_initial_schema.sql`:

| Bảng | Lưu gì |
|---|---|
| `test_results` | Kết quả mỗi bài test 12 câu — MBTI type, điểm số, expected type (reverse mechanic), session_id, `deleted_at` (PDPA soft delete) |
| `invite_links` | Token UUID mỗi invite → bạn bè vote, `expired_at` 30 ngày, gắn với `inviter_user_id` |
| `perception_votes` | Vote của bạn bè trên hành vi user → đầu vào của Gap Visualization (Epic 4) |
| `curated_insights` | Nội dung insight thủ công cho 16 MBTI types — **fallback** khi Anthropic API timeout/fail |
| `articles` | Nội dung feed/blog (Epic 6) — phục vụ SSR cho SEO |

**Lý do chọn D1**:
- Workers-native binding (không HTTP overhead)
- SQL chuẩn, type-safe qua row interfaces ở `packages/shared`
- Encrypted at rest (AES-256)
- Schema versioned bằng `wrangler d1 migrations apply`

**Quy ước**:
- Column `snake_case`; API response transform sang `camelCase` ở edge layer
- Timestamps: `TEXT` ISO 8601 (không dùng INTEGER unix epoch)
- Boolean prefix `is_` hoặc `has_`
- Soft delete: cột `deleted_at TEXT NULL` trên user-data tables (PDPA)
- Truy cập **chỉ** qua helpers trong `apps/api/src/lib/db.ts` — không call `c.env.DB` trực tiếp trong route handler

---

## 2. Cloudflare KV — Session & state ngắn hạn, đọc nhanh global

| Key pattern | Lưu gì | TTL |
|---|---|---|
| `session:{uuid}` | Anonymous session của user — gắn mọi test/result/social data | 30 ngày |
| `admin_session:{uuid}` | Session admin sau khi login bằng `ADMIN_PASSWORD_HASH` | 24h |
| (cache keys) | Cache key-value persistent (insight responses, public content) | Tuỳ use case |

**Lý do chọn KV chứ không D1**:
- Sub-millisecond global reads
- Mọi request đều phải validate session — D1 sẽ chậm và tốn cho lookup tần suất cao
- Có TTL native, không cần cron cleanup

**Quy ước**:
- Truy cập **chỉ** qua `apps/api/src/lib/kv.ts`: `getSession`, `setSession`, `deleteSession`
- Route handler **không bao giờ** gọi `c.env.KV.get()` trực tiếp
- Auth middleware (`apps/api/src/middleware/auth.ts`) đọc header `X-Session-Token` → KV lookup → attach `userId` vào `c.var`

---

## 3. Cloudflare R2 — File / asset binary, generated

| Loại asset | Khi nào generate |
|---|---|
| **OG images** (Open Graph) cho từng `resultId` | Khi user share kết quả lần đầu → cache vào R2 → lần sau serve thẳng từ R2 |
| **Result cards** 9:16 (Stories format) — cho user download | Generate sau khi finish test, lưu R2 để re-serve |
| **Compatibility reports** (Couple/Friend Pack — Epic 5) | Sau khi thanh toán PayOS/Stripe success |

**Tech stack generation**: Satori + resvg-wasm trong Workers (edge-native, không Node.js).

**Lý do chọn R2 chứ không D1**:
- D1 không phù hợp chứa BLOB (row size limit)
- R2 chuyên cho object storage binary
- **Zero egress fee** — cực quan trọng vì OG images bị social crawlers (Facebook, Twitter, LINE...) fetch rất nhiều lần

**Quy ước**:
- Truy cập qua `apps/api/src/lib/r2.ts` (Story 1.6)
- Binding name: `ASSETS_BUCKET` trong `wrangler.toml`

---

## Flow ví dụ — User submit test

```
User submit test
  │
  ├─► KV: validate session token (X-Session-Token header)
  │       └─ miss/expired → 401 UNAUTHORIZED
  │
  ├─► D1: INSERT INTO test_results (...)
  │
  ├─► Anthropic API (gọi insight, timeout 2.5s)
  │     └─ timeout/fail? → D1: SELECT FROM curated_insights (fallback transparent)
  │
  └─► R2: generate + cache OG image cho resultId
         (chỉ khi share lần đầu; lần sau serve cached)
```

---

## 3 nguyên tắc cần nhớ

1. **D1** = dữ liệu quan hệ, query JOIN/WHERE (structured)
2. **KV** = key-value, đọc cực nhanh, có TTL (session, cache)
3. **R2** = file binary (image, PDF) — generated, cacheable, public-readable

---

## Phase 2+ (deferred)

Theo `architecture.md`:
- **D1 → Supabase PostgreSQL pivot**: nếu cần Row-Level Security (RLS) hoặc realtime subscriptions
- **Multi-region D1 read replicas**: Phase 3 khi mở rộng SEA
- **Durable Objects**: nếu social graph cần stateful sessions (thay polling hiện tại)

R2 và KV không có kế hoạch migrate.
