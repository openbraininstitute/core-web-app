import { expect, test } from '@playwright/test';

test.describe('News article page', () => {
  test('should load public news page and render meaningful content', async ({ page }) => {
    await page.goto('/news', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/news\/?$/);
    expect(page.url()).not.toContain('/app/log-in');

    await expect(page.getByRole('link', { name: 'Open Brain Institute' })).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveTitle(/.+/);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });
});
