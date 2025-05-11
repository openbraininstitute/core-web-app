import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { completeLogin, handleTermsAcceptance } from './utils/auth';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  await page.goto('http://localhost:3000/app/virtual-lab');
  await completeLogin(page);
  await expect(page).toHaveURL(/app\/virtual-lab/);

  await page.context().storageState({ path: authFile });
});
