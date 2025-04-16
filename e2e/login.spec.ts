import { test, expect } from '@playwright/test';

test('Login to open brain institute', async ({ page }) => {
  // Set a longer timeout for this test
  test.slow();

  // Navigate to the app
  await page.goto('http://localhost:3000/app/virtual-lab');

  // Wait for the page to be fully loaded
  await page.waitForLoadState('networkidle');

  // Make the form container visible and ensure it worked
  await page.evaluate(() => {
    const formContainer = document.querySelector('.form-container');
    if (formContainer instanceof HTMLElement) {
      formContainer.style.display = 'block';
      formContainer.style.visibility = 'visible';
      formContainer.style.opacity = '1';
      return true;
    }
    return false;
  });

  // Wait a moment for the visibility changes to take effect
  await page.waitForTimeout(1000);

  // Explicitly wait for the form elements to be visible
  await page.waitForSelector('input.login-form-input[name="username"]', {
    state: 'visible',
    timeout: 10000,
  });
  await page.waitForSelector('input.login-form-input[name="password"]', {
    state: 'visible',
    timeout: 10000,
  });

  const username = process.env.TEST_USERNAME;
  const password = process.env.TEST_PASSWORD;

  // Fill in login credentials with additional safeguards
  await page.fill('input.login-form-input[name="username"]', username!);
  await page.fill('input.login-form-input[name="password"]', password!);

  // Press Enter to submit the form
  await page.press('input.login-form-input[name="password"]', 'Enter');

  // Wait for navigation to complete
  await Promise.race([
    page.waitForNavigation({ timeout: 20000 }),
    page.waitForURL(/app\/virtual-lab/, { timeout: 20000 }),
  ]);

  // Verify login was successful
  await expect(page).toHaveURL(/app\/virtual-lab/);
});
