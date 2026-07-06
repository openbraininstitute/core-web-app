import { expect } from '@playwright/test';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';

import {
  getExpectedColumnHeaders,
  getExpectedFilterLabels,
} from '../../fixtures/listing-expectations';
import { test } from '../../fixtures/test-fixtures';
import { NotebookWorkspacePage } from '../../pages/notebook-workspace.page';

test.describe('Notebooks workspace', () => {
  test('lists template notebooks with the expected columns and filters across scopes', async ({
    page,
    e2eState,
  }) => {
    const notebooks = new NotebookWorkspacePage(page, e2eState.virtualLabId, e2eState.projectId);

    await notebooks.goto('public');
    await notebooks.expectColumnHeaders(
      getExpectedColumnHeaders({
        dataType: ExtendedEntitiesTypeDict.AnalysisNotebookTemplate,
        section: WorkspaceSection.Notebooks,
        scope: WorkspaceScope.Public,
      })
    );
    await notebooks.openFilterPanel();
    await notebooks.expectFilterLabels(
      getExpectedFilterLabels({
        dataType: ExtendedEntitiesTypeDict.AnalysisNotebookTemplate,
        section: WorkspaceSection.Notebooks,
        scope: WorkspaceScope.Public,
      })
    );
    await notebooks.closeFilterPanel();

    await notebooks.switchToProjectScope();
    await notebooks.expectColumnHeaders(
      getExpectedColumnHeaders({
        dataType: ExtendedEntitiesTypeDict.AnalysisNotebookTemplate,
        section: WorkspaceSection.Notebooks,
        scope: WorkspaceScope.Project,
      })
    );
    await notebooks.openFilterPanel();
    await notebooks.expectFilterLabels(
      getExpectedFilterLabels({
        dataType: ExtendedEntitiesTypeDict.AnalysisNotebookTemplate,
        section: WorkspaceSection.Notebooks,
        scope: WorkspaceScope.Project,
      })
    );
  });

  test('shows a Notebooks/Results sidebar and switches to the Results listing', async ({
    page,
    e2eState,
  }) => {
    const notebooks = new NotebookWorkspacePage(page, e2eState.virtualLabId, e2eState.projectId);

    await notebooks.goto('public');

    // sidebar renders a live total count for the notebooks listing
    const total = await notebooks.notebooksTotalCount();
    expect(total === null || Number.isFinite(total)).toBe(true);

    await notebooks.openResults();
    await notebooks.expectColumnHeaders(
      getExpectedColumnHeaders({
        dataType: ExtendedEntitiesTypeDict.AnalysisNotebookResult,
        section: WorkspaceSection.Notebooks,
        scope: WorkspaceScope.Public,
      })
    );
  });
});
