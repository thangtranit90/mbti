import { test, expect } from '@playwright/test';

test.describe('ConsentGate — no session token', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    // Session token lives in localStorage (not cookies) — must clear it too
    await context.addInitScript(() => {
      localStorage.removeItem('mbti-session-token');
    });
  });

  test('clicking Bắt đầu redirects to home page when no session token', async ({ page }) => {
    await page.goto('/consent');

    await expect(page).toHaveURL(/\/consent/);

    // getByRole excludes aria-hidden elements, avoiding strict-mode collision with the hidden <input>
    await page.getByRole('checkbox', { name: /Tôi xác nhận mình từ 18 tuổi/ }).click();
    await page.getByRole('checkbox', { name: /Tôi đồng ý cho phép thu thập/ }).click();
    await page.getByRole('button', { name: 'Bắt đầu' }).click();

    // Without a session token, ConsentGate.handleSubmit() calls navigate('/')
    await expect(page).toHaveURL(/\/$/, { timeout: 5_000 });
  });

  test('submit without checking shows validation errors — does NOT navigate', async ({ page }) => {
    await page.goto('/consent');

    // Button uses aria-disabled (not disabled attr) so onClick still fires — force click to bypass Playwright's enabled check
    await page.getByRole('button', { name: 'Bắt đầu' }).click({ force: true });

    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page).toHaveURL(/\/consent/);
  });
});

test.describe('ConsentGate — stale session token', () => {
  test('stale token (401 from API) clears localStorage and redirects home', async ({ context, page }) => {
    await context.clearCookies();
    // Inject a fake stale token — SessionProvider will skip init, PATCH will 401
    await context.addInitScript(() => {
      localStorage.setItem('mbti-session-token', 'fake-stale-token-that-does-not-exist');
    });

    await page.goto('/consent');
    await expect(page).toHaveURL(/\/consent/);

    await page.getByRole('checkbox', { name: /Tôi xác nhận mình từ 18 tuổi/ }).click();
    await page.getByRole('checkbox', { name: /Tôi đồng ý cho phép thu thập/ }).click();
    await page.getByRole('button', { name: 'Bắt đầu' }).click();

    // 401 → ConsentGate clears token and navigates home
    await expect(page).toHaveURL(/\/$/, { timeout: 8_000 });

    // Token must be cleared from localStorage
    const storedToken = await page.evaluate(() => localStorage.getItem('mbti-session-token'));
    expect(storedToken).toBeNull();
  });
});
