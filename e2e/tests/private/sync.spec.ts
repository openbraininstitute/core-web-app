import { expect, test } from '../../fixtures/test-fixtures';

test.describe('Sync page', () => {
  test('should load for authenticated user without redirecting to login', async ({ page }) => {
    await page.goto('/app/virtual-lab/sync');
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/app/virtual-lab/sync');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
