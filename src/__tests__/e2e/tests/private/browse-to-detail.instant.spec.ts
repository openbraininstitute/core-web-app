import { instant } from '@next/playwright';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { getDataBrowserEntity } from '../../fixtures/listing-expectations';
import { expect, test } from '../../fixtures/test-fixtures';
import { DataBrowserPage } from '../../pages/data-browser.page';

const cellMorphology = getDataBrowserEntity(ExtendedEntitiesTypeDict.CellMorphology);

test('entity detail shell commits immediately from the browse mini detail', async ({
  page,
  e2eState,
}) => {
  const dataBrowser = new DataBrowserPage(page, e2eState.virtualLabId, e2eState.projectId);

  await dataBrowser.gotoEntity(cellMorphology);
  await dataBrowser.selectAllSpecies();

  const firstRow = page.locator('[data-testid^="data-grid-row-"]').first();
  await expect(firstRow).toBeVisible();
  await firstRow.click();

  const detailsLink = page.getByTestId('mini-detail-view-details');
  await expect(page.getByTestId('mini-viewer')).toBeVisible();
  await expect(detailsLink).toBeVisible();

  await instant(page, async () => {
    await detailsLink.click();
    await expect(page).toHaveURL(/\/data\/view\/cell-morphology\/[^/]+\/overview\?s=all$/);
    await expect(page.getByTestId('data-view-loading')).toBeVisible();
    await expect(page.getByTestId('data-view-breadcrumb')).toHaveCount(0);
  });

  await expect(page.getByTestId('data-view-breadcrumb')).toBeVisible();
  await expect(page.getByTestId('data-view-loading')).toHaveCount(0);
});
