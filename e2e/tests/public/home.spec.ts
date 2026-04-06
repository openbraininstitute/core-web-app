import { expect, test } from '@playwright/test';

import { HomePage } from '../../pages/home.page';

test.describe('Home page', () => {
  test('should load and display expected content', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.expectLoaded();
  });
});
