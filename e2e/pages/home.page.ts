import { expect, type Page } from '@playwright/test';

export class HomePage {
  private readonly logo;
  private readonly heroTitle;
  private readonly virtualLabsLink;

  constructor(private page: Page) {
    this.logo = this.page.getByRole('heading', {
      name: 'Open Brain Institute',
    });
    this.heroTitle = this.page.locator('h1');
    this.virtualLabsLink = this.page.getByRole('link', {
      name: /Virtual Labs/i,
    });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.logo).toBeVisible();
    await expect(this.heroTitle).toBeVisible();
    await expect(this.virtualLabsLink).toBeVisible();
  }
}
