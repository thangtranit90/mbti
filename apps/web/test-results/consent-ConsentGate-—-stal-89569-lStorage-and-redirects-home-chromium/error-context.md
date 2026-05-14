# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: consent.spec.ts >> ConsentGate — stale session token >> stale token (401 from API) clears localStorage and redirects home
- Location: e2e/consent.spec.ts:38:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/$/
Received string:  "https://trigger-ci-check.mbti-web-a2k.pages.dev/consent"
Timeout: 8000ms

Call log:
  - Expect "toHaveURL" with timeout 8000ms
    12 × unexpected value "https://trigger-ci-check.mbti-web-a2k.pages.dev/consent"

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - paragraph [ref=e5]: Đây là công cụ tự phản chiếu — không phải đánh giá lâm sàng
  - generic [ref=e6]:
    - generic [ref=e7] [cursor=pointer]:
      - checkbox "Tôi xác nhận mình từ 18 tuổi trở lên" [checked] [ref=e8]:
        - img [ref=e10]
      - checkbox [checked] [ref=e12]
      - generic [ref=e13]: Tôi xác nhận mình từ 18 tuổi trở lên
    - generic [ref=e14] [cursor=pointer]:
      - checkbox "Tôi đồng ý cho phép thu thập câu trả lời để tạo kết quả MBTI. Xem chính sách bảo mật" [checked] [ref=e15]:
        - img [ref=e17]
      - checkbox [checked] [ref=e19]
      - generic [ref=e20]:
        - text: Tôi đồng ý cho phép thu thập câu trả lời để tạo kết quả MBTI.
        - link "Xem chính sách bảo mật" [ref=e21]:
          - /url: /privacy
  - button "Bắt đầu" [active] [ref=e22]
  - alert [ref=e23]: Không lưu được lựa chọn. Vui lòng thử lại.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('ConsentGate — no session token', () => {
  4  |   test.beforeEach(async ({ context }) => {
  5  |     await context.clearCookies();
  6  |     // Session token lives in localStorage (not cookies) — must clear it too
  7  |     await context.addInitScript(() => {
  8  |       localStorage.removeItem('mbti-session-token');
  9  |     });
  10 |   });
  11 | 
  12 |   test('clicking Bắt đầu redirects to home page when no session token', async ({ page }) => {
  13 |     await page.goto('/consent');
  14 | 
  15 |     await expect(page).toHaveURL(/\/consent/);
  16 | 
  17 |     // getByRole excludes aria-hidden elements, avoiding strict-mode collision with the hidden <input>
  18 |     await page.getByRole('checkbox', { name: /Tôi xác nhận mình từ 18 tuổi/ }).click();
  19 |     await page.getByRole('checkbox', { name: /Tôi đồng ý cho phép thu thập/ }).click();
  20 |     await page.getByRole('button', { name: 'Bắt đầu' }).click();
  21 | 
  22 |     // Without a session token, ConsentGate.handleSubmit() calls navigate('/')
  23 |     await expect(page).toHaveURL(/\/$/, { timeout: 5_000 });
  24 |   });
  25 | 
  26 |   test('submit without checking shows validation errors — does NOT navigate', async ({ page }) => {
  27 |     await page.goto('/consent');
  28 | 
  29 |     // Button uses aria-disabled (not disabled attr) so onClick still fires — force click to bypass Playwright's enabled check
  30 |     await page.getByRole('button', { name: 'Bắt đầu' }).click({ force: true });
  31 | 
  32 |     await expect(page.getByRole('alert').first()).toBeVisible();
  33 |     await expect(page).toHaveURL(/\/consent/);
  34 |   });
  35 | });
  36 | 
  37 | test.describe('ConsentGate — stale session token', () => {
  38 |   test('stale token (401 from API) clears localStorage and redirects home', async ({ context, page }) => {
  39 |     await context.clearCookies();
  40 |     // Inject a fake stale token — SessionProvider will skip init, PATCH will 401
  41 |     await context.addInitScript(() => {
  42 |       localStorage.setItem('mbti-session-token', 'fake-stale-token-that-does-not-exist');
  43 |     });
  44 | 
  45 |     await page.goto('/consent');
  46 |     await expect(page).toHaveURL(/\/consent/);
  47 | 
  48 |     await page.getByRole('checkbox', { name: /Tôi xác nhận mình từ 18 tuổi/ }).click();
  49 |     await page.getByRole('checkbox', { name: /Tôi đồng ý cho phép thu thập/ }).click();
  50 |     await page.getByRole('button', { name: 'Bắt đầu' }).click();
  51 | 
  52 |     // 401 → ConsentGate clears token and navigates home
> 53 |     await expect(page).toHaveURL(/\/$/, { timeout: 8_000 });
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  54 | 
  55 |     // Token must be cleared from localStorage
  56 |     const storedToken = await page.evaluate(() => localStorage.getItem('mbti-session-token'));
  57 |     expect(storedToken).toBeNull();
  58 |   });
  59 | });
  60 | 
```