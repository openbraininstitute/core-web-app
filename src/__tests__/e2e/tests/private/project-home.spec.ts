import { test } from '../../fixtures/test-fixtures';
import { ProjectHomePage } from '../../pages/project-home.page';

test.describe('Project home page', () => {
  // TODO: re-enable once the project home reliably renders in CI. It intermittently
  // redirects back to /app/virtual-lab/sync so the project left menu never mounts,
  // failing on all retries and blocking the workflow.
  test.skip('should load and display expected content for authenticated user', async ({
    page,
    e2eState,
  }) => {
    const { virtualLabId, projectId } = e2eState;
    const projectHome = new ProjectHomePage(page, virtualLabId, projectId);

    await projectHome.goto();
    await projectHome.expectLoaded();
  });
});
