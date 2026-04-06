import { expect, type Page } from '@playwright/test';

export class GalleryPage {
  private readonly heroTitle;
  private readonly heroSubtitle;
  private readonly galleryContent;

  constructor(private page: Page) {
    this.heroTitle = this.page.getByRole('heading', {
      name: 'Gallery',
      level: 1,
    });
    this.heroSubtitle = this.page.getByRole('heading', {
      name: /Discover image and video assets/i,
      level: 2,
    });
    this.galleryContent = this.page.locator('.grid.grid-cols-2');
  }

  async goto(): Promise<void> {
    await this.page.goto('/gallery');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heroTitle).toBeVisible();
    await expect(this.heroSubtitle).toBeVisible();
    await expect(this.galleryContent).toBeVisible();
  }
}
