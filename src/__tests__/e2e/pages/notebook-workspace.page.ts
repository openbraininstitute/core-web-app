import { expect, type Page } from '@playwright/test';

import {
  expectSemanticColumnHeaders,
  normalizedLocatorTexts,
  semanticColumnHeaders,
} from './listing-table';

export class NotebookWorkspacePage {
  constructor(
    private readonly page: Page,
    private readonly virtualLabId: string,
    private readonly projectId: string
  ) {}

  readonly layout = this.page.getByTestId('notebooks-layout');
  readonly dataTableContainer = this.page.getByTestId('data-table-container');
  readonly filterPanel = this.page.getByTestId('listing-view-filter-panel');

  async goto(scope: 'public' | 'private' = 'public'): Promise<void> {
    await this.page.goto(
      `/app/virtual-lab/${this.virtualLabId}/${this.projectId}/notebooks/${scope}`,
      { waitUntil: 'domcontentloaded' }
    );
    await expect(this.layout).toBeVisible();
    await expect(this.page.getByRole('link', { name: 'Public' })).toBeVisible();
    await expect(this.page.getByRole('link', { name: 'Project' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: /Upload notebook/i })).toBeVisible();
    await expect(this.page.getByRole('button', { name: /Open JupyterHub/i })).toBeVisible();
    await expect(this.dataTableContainer).toBeVisible();
  }

  async switchToProjectScope(): Promise<void> {
    await this.page.getByRole('link', { name: 'Project' }).click();
    await expect(this.page).toHaveURL(/\/notebooks\/private/);
  }

  async openFilterPanel(): Promise<void> {
    await this.page.getByLabel('listing-view-filter-button').click();
    await expect(this.filterPanel).toBeVisible();
  }

  async closeFilterPanel(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.filterPanel).toBeHidden();
  }

  async columnHeaders(): Promise<string[]> {
    return semanticColumnHeaders(this.dataTableContainer);
  }

  async expectColumnHeaders(expected: string[]): Promise<void> {
    await expectSemanticColumnHeaders(this.dataTableContainer, expected);
  }

  async filterLabels(): Promise<string[]> {
    return normalizedLocatorTexts(this.filterPanel.getByTestId('filter-panel-item-label'));
  }

  async expectFilterLabels(expected: string[]): Promise<void> {
    await expect(async () => {
      expect(await this.filterLabels()).toEqual(expected);
    }).toPass({ timeout: 30_000 });
  }
}
