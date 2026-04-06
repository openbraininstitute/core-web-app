import { expect, test } from '@playwright/test';

import { NotebooksPage } from '../../pages/notebooks.page';

test.describe('Notebooks page', () => {
  test('should load and display expected content', async ({ page }) => {
    const notebooksPage = new NotebooksPage(page);
    await notebooksPage.goto();
    await notebooksPage.expectLoaded();
  });
});
