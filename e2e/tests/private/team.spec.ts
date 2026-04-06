import { expect, test } from '../../fixtures/test-fixtures';

test.describe('Team page', () => {
  test('should load and display expected content for authenticated user', async ({
    page,
    e2eState,
  }) => {
    const { virtualLabId, projectId } = e2eState;
    const teamPath = `/app/virtual-lab/${virtualLabId}/${projectId}/team`;

    await page.goto(teamPath);
    await page.waitForLoadState('domcontentloaded');

    // Assert the page loads without redirecting away
    expect(page.url()).toContain(teamPath);

    // Assert the "members" heading is visible
    await expect(page.getByText('members')).toBeVisible();

    // Assert the "Add member" button is rendered
    await expect(page.getByTestId('add-member-btn')).toBeVisible();
  });
});
