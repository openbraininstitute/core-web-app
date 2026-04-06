import { expect, type Page } from '@playwright/test';

export class NotebooksPage {
  private readonly heroTitle;
  private readonly menuLogo;

  constructor(private page: Page) {
    this.heroTitle = this.page.getByRole('heading', {
      name: 'Notebooks',
      level: 1,
    });
    this.menuLogo = this.page.getByRole('heading', {
      name: 'Open Brain Institute',
    });
  }

  async goto(): Promise<void> {
    await this.page.goto('/notebooks');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.menuLogo).toBeVisible();
    await expect(this.heroTitle).toBeVisible();
  }
}
