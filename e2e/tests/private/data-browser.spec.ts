import { expect, test } from '../../fixtures/test-fixtures';

test.describe('Data browser page', () => {
  test('should load and display expected content for authenticated user', async ({
    page,
    e2eState,
  }) => {
    const { virtualLabId, projectId } = e2eState;
    const dataPath = `/app/virtual-lab/${virtualLabId}/${projectId}/data`;

    await page.goto(dataPath);
    await page.waitForLoadState('domcontentloaded');

    // Assert the page loads without redirecting away
    expect(page.url()).toContain(dataPath);

    // Assert the data layout container is visible
    await expect(page.locator('#data-layout')).toBeVisible();

    // Assert the scope selector (Public/Project tabs) is rendered
    await expect(page.getByTestId('scope-selector')).toBeVisible();
  });
});
