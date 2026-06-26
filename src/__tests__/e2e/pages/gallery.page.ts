import { expect, type Page } from '@playwright/test';

export class GalleryPage {
  private readonly heroTitle;
  private readonly heroSubtitle;
  private readonly galleryItems;

  constructor(private page: Page) {
    this.heroTitle = this.page.getByRole('heading', {
      name: 'Gallery',
      level: 1,
    });
    this.heroSubtitle = this.page.getByRole('heading', {
      name: /Discover image and video assets/i,
      level: 2,
    });
    this.galleryItems = this.page.getByTestId('gallery-media-item');
  }

  async goto(): Promise<void> {
    await this.page.goto('/gallery', { waitUntil: 'domcontentloaded' });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heroTitle).toBeVisible();
    await expect(this.heroSubtitle).toBeVisible();
    await expect(this.galleryItems.first()).toBeAttached();
  }
}
