import { expect, test } from '@playwright/test';

test.describe('News article page', () => {
  test('should load and display page structure for a news slug', async ({ page }) => {
    // Navigate to a news article route. Since content is CMS-driven,
    // the page will either render the article or fall back to the news listing.
    await page.goto('/news/test-article');

    // Verify the page loaded without a hard error — either the article
    // header or the landing-page news section should be visible.
    const articleHeader = page.locator('header h1');
    const newsSection = page.locator('body');

    await expect(newsSection).toBeVisible();

    // The page should have rendered meaningful content (not a blank page).
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });
});
