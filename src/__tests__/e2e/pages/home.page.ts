import { expect, type Page } from '@playwright/test';

export class HomePage {
  private readonly logo;
  private readonly heroTitle;
  private readonly virtualLabsLink;

  constructor(private page: Page) {
    this.logo = this.page.getByRole('link', {
      name: 'Open Brain Institute',
      exact: true,
    });
    this.heroTitle = this.page.getByRole('heading', {
      name: /Create your Virtual Lab/i,
      level: 1,
    });
    this.virtualLabsLink = this.page.getByRole('link', {
      name: 'Go to Virtual Labs',
      exact: true,
    });
  }

  async goto(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.logo).toBeVisible();
    await expect(this.heroTitle).toBeVisible();
    await expect(this.virtualLabsLink).toBeVisible();
  }
}
