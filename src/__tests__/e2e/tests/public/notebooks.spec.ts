import { expect, test } from '@playwright/test';

import { NotebooksPage } from '../../pages/notebooks.page';

test.describe('Notebooks page', () => {
  test('should load and display expected public content', async ({ page }) => {
    const notebooksPage = new NotebooksPage(page);

    await notebooksPage.goto();
    await notebooksPage.expectLoaded();

    await expect(page).toHaveURL(/\/notebooks\/?$/);
    expect(page.url()).not.toContain('/app/log-in');
    await expect(page).toHaveTitle(/.+/);
  });
});
