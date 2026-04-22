import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';

import {
  getExpectedColumnHeaders,
  getExpectedFilterLabels,
} from '../../fixtures/listing-expectations';
import { test } from '../../fixtures/test-fixtures';
import { NotebookWorkspacePage } from '../../pages/notebook-workspace.page';

test.describe('Notebooks page', () => {
  test('loads public and project notebook listings with exact columns and filters', async ({
    page,
    e2eState,
  }) => {
    const notebooks = new NotebookWorkspacePage(page, e2eState.virtualLabId, e2eState.projectId);

    await notebooks.goto('public');
    await notebooks.expectColumnHeaders(
      getExpectedColumnHeaders({
        dataType: ExtendedEntitiesTypeDict.Notebook,
        section: WorkspaceSection.Notebooks,
        scope: WorkspaceScope.Public,
      })
    );
    await notebooks.openFilterPanel();
    await notebooks.expectFilterLabels(
      getExpectedFilterLabels({
        dataType: ExtendedEntitiesTypeDict.Notebook,
        section: WorkspaceSection.Notebooks,
        scope: WorkspaceScope.Public,
      })
    );
    await notebooks.closeFilterPanel();

    await notebooks.switchToProjectScope();
    await notebooks.expectColumnHeaders(
      getExpectedColumnHeaders({
        dataType: ExtendedEntitiesTypeDict.Notebook,
        section: WorkspaceSection.Notebooks,
        scope: WorkspaceScope.Project,
      })
    );
    await notebooks.openFilterPanel();
    await notebooks.expectFilterLabels(
      getExpectedFilterLabels({
        dataType: ExtendedEntitiesTypeDict.Notebook,
        section: WorkspaceSection.Notebooks,
        scope: WorkspaceScope.Project,
      })
    );
  });
});
