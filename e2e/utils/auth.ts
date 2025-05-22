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
  await page.waitForURL(/.*/, { timeout: 20000 });
  // Navigation complete - don't check specific URL pattern yet since
  // we might get redirected to terms form first
}

export async function handleTermsAcceptance(page: Page): Promise<boolean> {
  try {
    const termsForm = await page.waitForSelector('form.form-actions', {
      timeout: 5000,
      state: 'visible',
    });

    if (termsForm) {
      console.log('Terms form detected, accepting terms...');
      await page.click('input#kc-accept[name="accept"][value="Accept"]');
      await page.waitForURL(/app\//, { timeout: 20000 });
      return true;
    }
  } catch (e) {
    console.log('No terms form detected, continuing...');
  }
  return false;
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
  await handleTermsAcceptance(page);

  await page.waitForURL(/app\//, { timeout: 5000 });
}
