import { expect, test } from '../../fixtures/test-fixtures';

test.describe('Notebooks page', () => {
  test('should load and display expected content for authenticated user', async ({
    page,
    e2eState,
  }) => {
    const { virtualLabId, projectId } = e2eState;
    const notebooksPath = `/app/virtual-lab/${virtualLabId}/${projectId}/notebooks/public`;

    await page.goto(notebooksPath);
    await page.waitForLoadState('domcontentloaded');

    // Assert the page loads without redirecting away
    expect(page.url()).toContain(`/app/virtual-lab/${virtualLabId}/${projectId}/notebooks`);

    // Assert the notebooks layout container is visible
    await expect(page.locator('#notebooks-layout')).toBeVisible();

    // Assert the scope selector links (Public / Project) are rendered
    await expect(page.getByRole('link', { name: 'Public' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Project' })).toBeVisible();
  });
});
