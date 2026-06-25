import { expect, test } from '@playwright/test';

import { HomePage } from '../../pages/home.page';

test.describe('Home page', () => {
  test('should load and display expected public content', async ({ page }) => {
    const homePage = new HomePage(page);

    await homePage.goto();
    await homePage.expectLoaded();

    await expect(page).toHaveURL(/\/$/);
    expect(page.url()).not.toContain('/app/log-in');
    await expect(page).toHaveTitle(/.+/);
  });
});
