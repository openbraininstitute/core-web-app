import { expect, type Locator, type Page, type Route } from '@playwright/test';

import {
  expectSemanticColumnHeaders,
  normalizedLocatorTexts,
  normalizeListingText,
  semanticColumnHeaders,
} from './listing-table';

import type { DataBrowserEntity } from '../fixtures/listing-expectations';

type EntityLinkCounts = {
  current: number;
  root: number;
};

type BrainRegionTarget = {
  id: string;
  label: string;
};

type DataCategoryLabel = 'Experimental' | 'Model' | 'Simulations';
type Scope = 'public' | 'project';
type ReleaseNetworkDelay = () => Promise<void>;

function parseCounts(text: string): EntityLinkCounts {
  const match = normalizeListingText(text).match(/(\d+)\s*of\s*(\d+)/);
  if (!match) {
    throw new Error(`Could not parse entity link counts from "${text}".`);
  }
  return {
    current: Number(match[1]),
    root: Number(match[2]),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class DataBrowserPage {
  constructor(
    private readonly page: Page,
    private readonly virtualLabId: string,
    private readonly projectId: string
  ) {}

  readonly layout = this.page.locator('#data-layout');
  readonly dataTypeItems = this.page.getByTestId('data-type-items-container');
  readonly dataTableContainer = this.page
    .getByTestId('data-table-container')
    .or(this.page.getByTestId('data-table-with-filters'))
    .first();
  readonly filterPanel = this.page.getByTestId('listing-view-filter-panel');
  readonly brainRegionHierarchy = this.page.getByTestId('brain-region-hierarchy');

  get basePath(): string {
    return `/app/virtual-lab/${this.virtualLabId}/${this.projectId}/data`;
  }

  /**
   * holds every entity core api request (any URL matching the `api/entitycore`
   * route glob) in a pending state so a test can deterministically observe loading ui
   *
   * why this exists: data the page renders comes from entity core. In a fast test
   * environment those requests resolve almost instantly, so skeletons and spinners
   * flash by before assertions can catch them. By installing a route handler that
   * blocks on a promise "gate", the requests stay in-flight indefinitely, freezing
   * the ui in its loading state until the test is ready to move on
   *
   * what it does:
   * 1. creates a gate promise that the route handler awaits before continuing each request
   * 2. registers a playwright route for all entity core endpoints that parks requests on the gate
   * 3. returns a release function that opens the gate (letting parked requests continue)
   *    and removes the route handler, restoring normal network behavior
   *
   * the `route.continue().catch()` guards against requests that the browser already
   * aborted during navigation by the time the gate opens.
   *
   * @returns a release callback. call (and await) it to let the delayed requests
   *   proceed and to unregister the route handler.
   */
  async delayEntityCoreRequests(): Promise<ReleaseNetworkDelay> {
    let releaseRequests: () => void = () => undefined;
    const releaseGate = new Promise<void>((resolve) => {
      releaseRequests = resolve;
    });

    /*
     * keep entity core requests pending so tests can assert real loading ui.
     * the catch handles requests that are already aborted by navigation when the gate opens
     */
    const handler = async (route: Route) => {
      await releaseGate;
      await route.continue().catch(() => undefined);
    };

    await this.page.route('**/api/entitycore/**', handler);

    return async () => {
      releaseRequests();
      await this.page.unroute('**/api/entitycore/**', handler);
    };
  }

  async goto(): Promise<void> {
    await this.page.goto(this.basePath, { waitUntil: 'domcontentloaded' });
    await expect(this.layout).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByTestId('brain-region-entities-switcher')).toBeVisible({
      timeout: 30_000,
    });
  }

  async gotoEntityPath(entity: DataBrowserEntity, scope: Scope = 'public'): Promise<void> {
    await this.page.goto(`${this.basePath}/browse/entity/${entity.routeSegment}?scope=${scope}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(this.layout).toBeVisible({ timeout: 30_000 });
  }

  async gotoEntity(entity: DataBrowserEntity, scope: Scope = 'public'): Promise<void> {
    await this.gotoEntityPath(entity, scope);
    await expect(this.dataTableContainer).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByRole('table', { name: 'listing-view-table' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(this.page.getByLabel('listing-view-filter-button')).toBeVisible({
      timeout: 30_000,
    });
  }

  entityLink(entity: DataBrowserEntity): Locator {
    return this.page.locator(`[id="counter-${entity.type}"]`);
  }

  async expectEntityLinkLoading(entity: DataBrowserEntity): Promise<void> {
    const link = this.entityLink(entity);
    await expect(link).toBeVisible({ timeout: 30_000 });
    await expect(link.locator('[data-slot="skeleton"]')).not.toHaveCount(0, { timeout: 30_000 });
    await expect(link).toContainText(/of/i);
  }

  async expectEntityLinkVisibleWithCounts(entity: DataBrowserEntity): Promise<EntityLinkCounts> {
    const link = this.entityLink(entity);
    let counts: EntityLinkCounts | undefined;

    await expect(link).toBeVisible();
    await expect(async () => {
      counts = parseCounts(await link.innerText());
      expect(counts.root).toBeGreaterThanOrEqual(counts.current);
    }).toPass({ timeout: 30_000 });

    return counts as EntityLinkCounts;
  }

  async expectEntityLinkCurrentCount(entity: DataBrowserEntity, current: number): Promise<void> {
    const link = this.entityLink(entity);
    await expect(async () => {
      expect(parseCounts(await link.innerText()).current).toBe(current);
    }).toPass({ timeout: 30_000 });
  }

  async expectTableLoading(): Promise<void> {
    await expect(this.dataTableContainer).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByRole('table', { name: 'listing-view-table' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(this.dataTableContainer.getByRole('img', { name: /loading/i })).toBeVisible({
      timeout: 30_000,
    });
  }

  async fillSearch(query: string): Promise<void> {
    const searchInput = this.page.getByLabel('Search input');
    if (!(await searchInput.isVisible())) {
      await this.page.getByRole('button', { name: 'Open search' }).click();
    }
    await searchInput.fill(query);
  }

  async openFilterPanel(): Promise<void> {
    await this.page.getByLabel('listing-view-filter-button').click();
    await expect(this.filterPanel).toBeVisible({ timeout: 30_000 });
  }

  async closeFilterPanel(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.filterPanel).toBeHidden();
  }

  async expectFilterPanelLoading(): Promise<void> {
    await expect(this.filterPanel).toBeVisible({ timeout: 30_000 });
    await expect(this.filterPanel.getByRole('img', { name: /loading/i })).toBeVisible({
      timeout: 30_000,
    });
  }

  async expectPaginationVisible(): Promise<void> {
    await expect(this.page.getByTestId('listing-pagination')).toBeVisible({ timeout: 30_000 });
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
    const loadingIndicator = this.filterPanel.getByRole('img', { name: /loading/i });

    /*
     * Facet options load independently from table rows. Checking the spinner first makes
     * exact filter-label failures mean "wrong schema" instead of "panel is still fetching".
     */
    await expect(async () => {
      expect(await loadingIndicator.isVisible().catch(() => false)).toBe(false);
      expect(await this.filterLabels()).toEqual(expected);
    }).toPass({ timeout: 60_000 });
  }

  async selectAllSpecies(): Promise<void> {
    await this.page.locator('#species-selector').getByRole('combobox').click();
    await this.page.getByTestId('species-selector-option__all').click();
    await expect(this.page).toHaveURL(/(?:\?|&)s=all(?:&|$)/);
  }

  async selectFirstFocusedSpecies(): Promise<void> {
    await this.page.locator('#species-selector').getByRole('combobox').click();

    /*
     * Species options encode the hierarchy id in the DOM id. Selecting one should update
     * both hierarchy and brain-region URL state, which catches stale hierarchy wiring.
     */
    const speciesOption = await this.page
      .locator('[id^="species-selector-option__"]')
      .evaluateAll((options) => {
        for (const option of options) {
          const element = option as HTMLElement;
          if (element.id && element.id !== 'species-selector-option__all') {
            return {
              hierarchyId: element.id.replace('species-selector-option__', ''),
              id: element.id,
            };
          }
        }
        return null;
      });

    if (!speciesOption) {
      throw new Error('No focused species option found in species selector.');
    }

    await this.page.locator(`[id="${speciesOption.id}"]`).click();
    await expect(this.page).toHaveURL(
      new RegExp(`(?:\\?|&)h_id=${escapeRegExp(speciesOption.hierarchyId)}(?:&|$)`)
    );
    await expect(this.page).toHaveURL(/(?:\?|&)br_id=[^&]+(?:&|$)/);
  }

  async switchScope(scope: Scope): Promise<void> {
    await this.page.getByTestId(`scope-selector-tab-${scope}`).click();
    await expect(this.page).toHaveURL(new RegExp(`(?:\\?|&)scope=${scope}(?:&|$)`), {
      timeout: 30_000,
    });
  }

  async expectScope(scope: Scope): Promise<void> {
    await expect(this.page.getByTestId(`scope-selector-tab-${scope}`)).toHaveAttribute(
      'data-state',
      'active'
    );
  }

  async selectDataCategory(category: DataCategoryLabel): Promise<void> {
    await this.page.getByTestId('data-type-selector').getByRole('tab', { name: category }).click();
    await expect(
      this.page.getByTestId('data-type-selector').getByRole('tab', { name: category })
    ).toHaveAttribute('data-state', 'active');
  }

  async openEntityFromLeftMenu(entity: DataBrowserEntity): Promise<void> {
    await this.entityLink(entity).click();
    await expect(this.page).toHaveURL(
      new RegExp(`/data/browse/entity/${escapeRegExp(entity.routeSegment)}(?:\\?|$)`)
    );
    await expect(this.dataTableContainer).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByRole('table', { name: 'listing-view-table' })).toBeVisible({
      timeout: 30_000,
    });
  }

  async openBrainRegionHierarchy(): Promise<void> {
    await this.page.locator('[data-label="brain-region-switcher"]').click();
    await expect(this.brainRegionHierarchy).toBeVisible();
    await expect(this.brainRegionHierarchy).toHaveAttribute('aria-hidden', 'false');

    /*
     * The tree is populated asynchronously after the popover opens. Waiting for real
     * selectable nodes avoids racing against an empty container that is technically visible.
     */
    await expect(async () => {
      expect(
        await this.brainRegionHierarchy.locator('button[aria-label][id]').count()
      ).toBeGreaterThan(1);
    }).toPass({ timeout: 30_000 });
  }

  async selectAnotherVisibleBrainRegion(): Promise<BrainRegionTarget> {
    const currentRegionId = new URL(this.page.url()).searchParams.get('br_id');
    const findTarget = () =>
      this.brainRegionHierarchy
        .locator('button[aria-label][id]')
        .evaluateAll((buttons, selectedId) => {
          for (const button of buttons) {
            const element = button as HTMLElement;
            const label = element.getAttribute('aria-label');
            if (element.id && label && element.id !== selectedId && element.offsetParent !== null) {
              return { id: element.id, label };
            }
          }
          return null;
        }, currentRegionId);

    await expect(async () => {
      expect(await findTarget()).not.toBeNull();
    }).toPass({ timeout: 30_000 });

    const target = await findTarget();
    if (!target) {
      throw new Error('No alternate visible brain region was available to select.');
    }

    await this.brainRegionHierarchy.locator(`button[id="${target.id}"]`).click();
    await expect(this.page).toHaveURL(
      new RegExp(`(?:\\?|&)br_id=${escapeRegExp(target.id)}(?:&|$)`)
    );
    return target;
  }
}
