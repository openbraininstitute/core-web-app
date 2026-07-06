import { expect, test } from '@playwright/test';

import { GalleryPage } from '../../pages/gallery.page';

test.describe('Gallery page', () => {
  test('should load and display expected public content', async ({ page }) => {
    const galleryPage = new GalleryPage(page);

    await galleryPage.goto();
    await galleryPage.expectLoaded();

    await expect(page).toHaveURL(/\/gallery\/?$/);
    expect(page.url()).not.toContain('/app/log-in');
  });
});
