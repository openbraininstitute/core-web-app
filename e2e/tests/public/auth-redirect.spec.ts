import { expect, test } from '@playwright/test';

test.describe('Auth redirect', () => {
  test('should redirect unauthenticated user to login page', async ({ page }) => {
    await page.goto('/app/');
    await page.waitForURL('**/app/log-in');
    expect(page.url()).toContain('/app/log-in');
  });
});
