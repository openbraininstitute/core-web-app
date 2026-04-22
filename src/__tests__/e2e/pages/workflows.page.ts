import { expect, type Page } from '@playwright/test';

import {
  expectSemanticColumnHeaders,
  normalizeListingText,
  semanticColumnHeaders,
} from './listing-table';

const EMPTY_ACTIVITY_TEXT = "You don't have any activities yet";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class WorkflowsPage {
  constructor(
    private readonly page: Page,
    private readonly virtualLabId: string,
    private readonly projectId: string
  ) {}

  readonly scrollableSelector = this.page.getByTestId('workflow-scrollable-selector');
  readonly activityContent = this.page.getByTestId('workflow-activity-content');
  readonly activityTable = this.page.getByTestId('activity-table-with-filters');

  async goto(): Promise<void> {
    await this.page.goto(`/app/virtual-lab/${this.virtualLabId}/${this.projectId}/workflows`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(this.scrollableSelector).toBeVisible();
    await expect(this.activityContent).toBeVisible();
    await expect(this.page.getByTestId('workflow-category-menu')).toBeVisible();
    await expect(this.activityTable).toBeVisible();
    await this.dismissOnboarding();
  }

  async selectHomeCategory(label: string, value = label.toLowerCase()): Promise<void> {
    await this.dismissOnboarding();
    await this.page
      .getByTestId('workflow-category-menu')
      .getByRole('button', { name: new RegExp(`^${escapeRegExp(label)}\\b`, 'i') })
      .click();
    await expect(this.page).toHaveURL(new RegExp(`(?:\\?|&)activity=${value}(?:&|$)`), {
      timeout: 30_000,
    });
  }

  async expectHomeTypeMenu(activity: string): Promise<void> {
    await expect(this.page.getByTestId(`workflow-types-menu-${activity}`)).toBeVisible({
      timeout: 30_000,
    });
  }

  async activityColumnHeaders(): Promise<string[]> {
    return semanticColumnHeaders(this.activityTable);
  }

  async expectActivityColumnHeaders(expected: string[]): Promise<void> {
    await expectSemanticColumnHeaders(this.activityTable, expected);
  }

  async expectActivityListingReady(expectedHeaders: string[]): Promise<void> {
    /*
     * Fresh E2E projects commonly have no workflow activity. In that valid state the
     * listing renders an empty message instead of semantic column headers.
     */
    await expect(async () => {
      const headers = await this.activityColumnHeaders();
      const text = normalizeListingText(await this.activityTable.innerText());

      if (text.includes(EMPTY_ACTIVITY_TEXT) && headers.length === 0) {
        expect(text).toContain(EMPTY_ACTIVITY_TEXT);
        return;
      }

      expect(headers).toEqual(expectedHeaders);
    }).toPass({ timeout: 30_000 });
  }

  private async dismissOnboarding(): Promise<void> {
    const onboardingCard = this.page.locator('#onboarding-card');

    /*
     * The onboarding card appears only for some fresh accounts/projects and can cover
     * workflow controls. Treat it as optional so reused local accounts keep working.
     */
    await onboardingCard.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
    if (!(await onboardingCard.isVisible().catch(() => false))) {
      return;
    }

    await onboardingCard
      .getByRole('button', { name: /^(Skip|Get started)$/ })
      .click({ timeout: 5_000 });
    await expect(onboardingCard).toBeHidden({ timeout: 10_000 });
  }
}
