import { expect, test } from '@playwright/test';

test('public landing page renders main content without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));

  const response = await page.goto('/');
  expect(response?.ok(), `GET / returned ${response?.status()}`).toBe(true);

  // The landing page renders the hero with an <h1> (see
  // src/ui/segments/landing/layout/hero/hero-client.tsx). It does not use a
  // <main> landmark on Home, so we assert on the hero heading instead.
  await expect(page.locator('h1').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('unauthenticated /app/virtual-lab redirects to log-in', async ({ page }) => {
  await page.goto('/app/virtual-lab');
  await expect(page).toHaveURL(/\/app\/log-in/);
});
