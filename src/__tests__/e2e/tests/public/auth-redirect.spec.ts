import { expect, test } from '@playwright/test';

test.describe('Auth redirect', () => {
  test('should redirect unauthenticated user to login page', async ({ page }) => {
    await page.goto('/app/', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/(\/app\/log-in|openid-connect\/auth)/);
    expect(page.url()).toMatch(/(\/app\/log-in|openid-connect\/auth)/);
  });
});
