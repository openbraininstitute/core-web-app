import { expect, type Page } from '@playwright/test';

export class ProjectHomePage {
  private readonly projectLeftMenu;
  private readonly projectMainContent;
  private readonly mainDataCards;
  private readonly getStartedLink;

  constructor(
    private page: Page,
    private vlabId: string,
    private projectId: string
  ) {
    this.projectLeftMenu = this.page.getByTestId('project-left-menu');
    this.projectMainContent = this.page.getByTestId('project-main-content');
    this.mainDataCards = this.page.getByTestId('main-data-category-cards');
    this.getStartedLink = this.page.getByTestId('project-left-menu-item-get-started');
  }

  async goto(): Promise<void> {
    await this.page.goto(`/app/virtual-lab/${this.vlabId}/${this.projectId}`, {
      waitUntil: 'domcontentloaded',
    });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.projectLeftMenu).toBeVisible();
    await expect(this.projectMainContent).toBeVisible();
    await expect(this.getStartedLink).toBeVisible();
    await expect(this.mainDataCards).toBeVisible();
  }
}
