import { expect, test } from '@playwright/test';

import { GalleryPage } from '../../pages/gallery.page';

test.describe('Gallery page', () => {
  test('should load and display expected content', async ({ page }) => {
    const galleryPage = new GalleryPage(page);
    await galleryPage.goto();
    await galleryPage.expectLoaded();
  });
});
