import { expect, test } from '@playwright/test';

test.describe('SFN 2025 page', () => {
  test('should load and display expected content', async ({ page }) => {
    await page.goto('/sfn-2025');

    // Verify the hero heading is visible
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('SfN 2025');

    // Verify event details are present
    await expect(page.getByText('San Diego Convention Center')).toBeVisible();
    await expect(page.getByText('Booth #3631')).toBeVisible();

    // Verify the main content area rendered
    const content = page.locator('body');
    await expect(content).toBeVisible();
    const bodyText = await content.innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });
});
