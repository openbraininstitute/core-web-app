import { Page } from '@playwright/test';

export const TEST_USERNAME = process.env.TEST_USERNAME;
export const TEST_PASSWORD = process.env.TEST_PASSWORD;

export async function makeLoginFormVisible(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const formContainer = document.querySelector('.form-container');
    if (formContainer instanceof HTMLElement) {
      formContainer.style.display = 'block';
      formContainer.style.visibility = 'visible';
      formContainer.style.opacity = '1';
      return true;
    }
    return false;
  });
}

export async function fillLoginCredentials(
  page: Page,
  username = TEST_USERNAME,
  password = TEST_PASSWORD
): Promise<void> {
  // make form elements to be visible
  await page.waitForSelector('input.login-form-input[name="username"]', {
    state: 'visible',
    timeout: 10000,
  });
  await page.waitForSelector('input.login-form-input[name="password"]', {
    state: 'visible',
    timeout: 10000,
  });
  await page.fill('input.login-form-input[name="username"]', username!);
  await page.fill('input.login-form-input[name="password"]', password!);
}

export async function submitLoginForm(page: Page): Promise<void> {
  await page.press('input.login-form-input[name="password"]', 'Enter');
  await Promise.race([
    page.waitForNavigation({ timeout: 20000 }),
    page.waitForURL(/app\//, { timeout: 20000 }),
  ]);
}

export async function completeLogin(
  page: Page,
  username = TEST_USERNAME,
  password = TEST_PASSWORD
): Promise<void> {
  await page.waitForLoadState('networkidle');
  await makeLoginFormVisible(page);
  await page.waitForTimeout(1000);
  await fillLoginCredentials(page, username, password);
  await submitLoginForm(page);
}
