import { WORKFLOW_ACTIVITY_COLUMN_HEADERS } from '../../fixtures/listing-expectations';
import { test } from '../../fixtures/test-fixtures';
import { WorkflowsPage } from '../../pages/workflows.page';

test.describe('Workflows page', () => {
  test('loads workflow selectors and activity listing inside the project workspace', async ({
    page,
    e2eState,
  }) => {
    const workflows = new WorkflowsPage(page, e2eState.virtualLabId, e2eState.projectId);

    await workflows.goto();
    await workflows.expectActivityListingReady(WORKFLOW_ACTIVITY_COLUMN_HEADERS);

    await workflows.selectHomeCategory('Simulate');
    await workflows.expectHomeTypeMenu('simulate');
  });
});
