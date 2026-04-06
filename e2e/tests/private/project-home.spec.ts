import { expect, test } from '../../fixtures/test-fixtures';
import { ProjectHomePage } from '../../pages/project-home.page';

test.describe('Project home page', () => {
  test('should load and display expected content for authenticated user', async ({
    page,
    e2eState,
  }) => {
    const { virtualLabId, projectId } = e2eState;
    const projectHome = new ProjectHomePage(page, virtualLabId, projectId);

    await projectHome.goto();
    await projectHome.expectLoaded();
  });
});
