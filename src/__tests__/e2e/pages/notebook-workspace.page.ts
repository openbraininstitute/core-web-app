import { expect, type Page } from '@playwright/test';

import {
  expectSemanticColumnHeaders,
  normalizedLocatorTexts,
  semanticColumnHeaders,
} from './listing-table';

type NotebookScope = 'public' | 'project';

/** kebab extended-entity-type route segments (notebooks no longer use slug URLs) */
const TYPE_SEGMENT = {
  template: 'analysis-notebook-template',
  result: 'analysis-notebook-result',
} as const;

export class NotebookWorkspacePage {
  constructor(
    private readonly page: Page,
    private readonly virtualLabId: string,
    private readonly projectId: string
  ) {}

  readonly layout = this.page.getByTestId('notebooks-layout');
  readonly dataTableContainer = this.page.getByTestId('data-table-container');
  readonly filterPanel = this.page.getByTestId('listing-view-filter-panel');
  readonly leftMenu = this.page.getByTestId('notebook-left-menu');
  readonly publicTab = this.page.getByTestId('scope-selector-tab-public');
  readonly projectTab = this.page.getByTestId('scope-selector-tab-project');
  readonly notebooksCountLink = this.page.getByTestId(
    'notebook-count-link-analysis_notebook_template'
  );
  readonly resultsCountLink = this.page.getByTestId('notebook-count-link-analysis_notebook_result');

  private browseUrl(type: keyof typeof TYPE_SEGMENT, scope: NotebookScope): string {
    return `/app/virtual-lab/${this.virtualLabId}/${this.projectId}/notebooks/browse/${TYPE_SEGMENT[type]}?scope=${scope}`;
  }

  async goto(scope: NotebookScope = 'public', type: keyof typeof TYPE_SEGMENT = 'template') {
    await this.page.goto(this.browseUrl(type, scope), { waitUntil: 'domcontentloaded' });
    await expect(this.layout).toBeVisible();
    await expect(this.publicTab).toBeVisible();
    await expect(this.projectTab).toBeVisible();
    await expect(this.page.getByRole('button', { name: /Upload notebook/i })).toBeVisible();
    await expect(this.page.getByRole('button', { name: /Open JupyterHub/i })).toBeVisible();
    await expect(this.leftMenu).toBeVisible();
    await expect(this.notebooksCountLink).toBeVisible();
    await expect(this.resultsCountLink).toBeVisible();
    await expect(this.dataTableContainer).toBeVisible();
  }

  /** the sidebar count renders as "<filtered> of <total>"; returns the live total via data attrs */
  async notebooksTotalCount(): Promise<number | null> {
    const value = await this.notebooksCountLink
      .getByTestId('notebook-count-analysis_notebook_template')
      .getAttribute('data-total');
    return value === null ? null : Number(value);
  }

  async openResults(): Promise<void> {
    await this.resultsCountLink.click();
    await expect(this.page).toHaveURL(/\/notebooks\/browse\/analysis-notebook-result/);
  }

  async switchToProjectScope(): Promise<void> {
    await this.projectTab.click();
    await expect(this.page).toHaveURL(/[?&]scope=project/);
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
