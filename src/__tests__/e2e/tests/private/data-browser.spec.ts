import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import {
  DATA_BROWSER_ENTITIES,
  getDataBrowserEntity,
  getExpectedColumnHeaders,
  getExpectedFilterLabels,
} from '../../fixtures/listing-expectations';
import { expect, test } from '../../fixtures/test-fixtures';
import { DataBrowserPage } from '../../pages/data-browser.page';

test.describe('Data browser page', () => {
  test.describe.configure({ mode: 'parallel' });

  const cellMorphology = getDataBrowserEntity(ExtendedEntitiesTypeDict.CellMorphology);
  const electricalRecording = getDataBrowserEntity(
    ExtendedEntitiesTypeDict.ElectricalCellRecording
  );
  const meModel = getDataBrowserEntity(ExtendedEntitiesTypeDict.Memodel);
  const singleNeuronSimulation = getDataBrowserEntity(
    ExtendedEntitiesTypeDict.SingleNeuronSimulation
  );

  test('shows sidebar counter loading placeholders before counts resolve', async ({
    page,
    e2eState,
  }) => {
    const dataBrowser = new DataBrowserPage(page, e2eState.virtualLabId, e2eState.projectId);
    const releaseEntityCore = await dataBrowser.delayEntityCoreRequests();

    await dataBrowser.goto();
    try {
      await dataBrowser.expectEntityLinkLoading(cellMorphology);
    } finally {
      await releaseEntityCore();
    }
    await dataBrowser.expectEntityLinkVisibleWithRootCount(cellMorphology);
  });

  test('shows table loading state before listing data resolves', async ({ page, e2eState }) => {
    const dataBrowser = new DataBrowserPage(page, e2eState.virtualLabId, e2eState.projectId);

    await dataBrowser.gotoEntity(cellMorphology);
    await dataBrowser.selectAllSpecies();
    await dataBrowser.expectColumnHeaders(
      getExpectedColumnHeaders({ dataType: cellMorphology.type })
    );
    const releaseEntityCore = await dataBrowser.delayEntityCoreRequests();
    await dataBrowser.fillSearch(`obi-e2e-loading-state-${Date.now()}`);

    try {
      await dataBrowser.expectTableLoading();
    } finally {
      await releaseEntityCore();
    }
    await dataBrowser.expectEntityLinkCurrentCount(cellMorphology, 0);
  });

  test('loads the data workspace and sidebar entity counts', async ({ page, e2eState }) => {
    const dataBrowser = new DataBrowserPage(page, e2eState.virtualLabId, e2eState.projectId);

    await dataBrowser.goto();

    expect(page.url()).toContain(dataBrowser.basePath);
    await expect(dataBrowser.dataTypeItems).toBeVisible();
    await dataBrowser.expectEntityLinkVisibleWithRootCount(cellMorphology);
  });

  test('updates active sidebar count when search filters the listing', async ({
    page,
    e2eState,
  }) => {
    const dataBrowser = new DataBrowserPage(page, e2eState.virtualLabId, e2eState.projectId);

    await dataBrowser.gotoEntity(cellMorphology);
    const initialCounts = await dataBrowser.expectEntityLinkVisibleWithCounts(cellMorphology);
    test.skip(
      initialCounts.root === 0,
      'Staging has no public morphology data to verify count changes.'
    );

    await dataBrowser.fillSearch(`obi-e2e-no-results-${Date.now()}`);
    await dataBrowser.expectEntityLinkCurrentCount(cellMorphology, 0);
  });

  test('switches public and project scope without leaving the active listing', async ({
    page,
    e2eState,
  }) => {
    const dataBrowser = new DataBrowserPage(page, e2eState.virtualLabId, e2eState.projectId);

    await dataBrowser.gotoEntity(cellMorphology);
    await dataBrowser.switchScope('project');
    await dataBrowser.expectScope('project');
    await dataBrowser.expectColumnHeaders(
      getExpectedColumnHeaders({ dataType: cellMorphology.type })
    );
    await dataBrowser.expectEntityLinkVisibleWithCounts(cellMorphology);

    await dataBrowser.switchScope('public');
    await dataBrowser.expectScope('public');
    await dataBrowser.expectColumnHeaders(
      getExpectedColumnHeaders({ dataType: cellMorphology.type })
    );
  });

  test('updates species mode and brain-region URL state from real controls', async ({
    page,
    e2eState,
  }) => {
    const dataBrowser = new DataBrowserPage(page, e2eState.virtualLabId, e2eState.projectId);

    await dataBrowser.gotoEntity(cellMorphology);
    await dataBrowser.selectAllSpecies();
    await expect(dataBrowser.brainRegionHierarchy).toBeHidden();

    await dataBrowser.selectFirstFocusedSpecies();
    await dataBrowser.openBrainRegionHierarchy();
    await dataBrowser.selectAnotherVisibleBrainRegion();

    await expect(page.getByTestId('brain-region-switcher')).toBeVisible();
  });

  test('switches data categories and navigates to another data type', async ({
    page,
    e2eState,
  }) => {
    const dataBrowser = new DataBrowserPage(page, e2eState.virtualLabId, e2eState.projectId);

    await dataBrowser.goto();
    await dataBrowser.selectDataCategory('Model');
    await dataBrowser.expectEntityLinkVisibleWithRootCount(meModel);

    await dataBrowser.selectDataCategory('Simulations');
    await dataBrowser.expectEntityLinkVisibleWithRootCount(singleNeuronSimulation);

    await dataBrowser.selectDataCategory('Experimental');
    await dataBrowser.openEntityFromLeftMenu(electricalRecording);
    await dataBrowser.expectColumnHeaders(
      getExpectedColumnHeaders({ dataType: electricalRecording.type })
    );
  });

  test('keeps filter panel usable while facet options are loading', async ({ page, e2eState }) => {
    const dataBrowser = new DataBrowserPage(page, e2eState.virtualLabId, e2eState.projectId);
    const releaseEntityCore = await dataBrowser.delayEntityCoreRequests();

    await dataBrowser.gotoEntityPath(cellMorphology);
    await dataBrowser.openFilterPanel();
    try {
      await dataBrowser.expectFilterPanelLoading();
    } finally {
      await releaseEntityCore();
    }
    await dataBrowser.expectFilterLabels(
      getExpectedFilterLabels({ dataType: cellMorphology.type })
    );
    await dataBrowser.closeFilterPanel();
  });

  test('renders pagination controls when result count spans multiple pages', async ({
    page,
    e2eState,
  }) => {
    const dataBrowser = new DataBrowserPage(page, e2eState.virtualLabId, e2eState.projectId);

    await dataBrowser.gotoEntity(cellMorphology);
    const counts = await dataBrowser.expectEntityLinkVisibleWithCounts(cellMorphology);
    test.skip(
      counts.current <= 10,
      'Staging has no paginated morphology result set for this region.'
    );
    await dataBrowser.expectPaginationVisible();
  });

  for (const entity of DATA_BROWSER_ENTITIES) {
    test(`${entity.group} ${entity.title} exposes exact listing columns and filters`, async ({
      page,
      e2eState,
    }) => {
      const dataBrowser = new DataBrowserPage(page, e2eState.virtualLabId, e2eState.projectId);

      await dataBrowser.gotoEntity(entity);
      await dataBrowser.expectColumnHeaders(getExpectedColumnHeaders({ dataType: entity.type }));

      await dataBrowser.openFilterPanel();
      await dataBrowser.expectFilterLabels(getExpectedFilterLabels({ dataType: entity.type }));
    });
  }
});
