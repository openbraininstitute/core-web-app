import { test, expect } from '@playwright/test';
import { completeLogin } from './utils/auth';

test('Login to open brain institute', async ({ page }) => {
  test.slow();
  await page.goto('http://localhost:3000/app/virtual-lab');
  await completeLogin(page);
  await expect(page).toHaveURL(/app\/virtual-lab/);
});
