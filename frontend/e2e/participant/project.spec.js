import { test, expect } from '@playwright/test';

test.use({ browserName: 'chromium' });

test.describe('Project Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('userId', 'mock-user-id');
      localStorage.setItem('role', 'Participant');
    });

    await page.route('**/users/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: 'mock-user-id',
          role: 'Participant',
          name: 'Mock User',
          email: 'mock@example.com'
        }),
      });
    });

    // Mock personal registration data
    await page.route('**/registrations/my**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              competitionId: 'comp-1',
              competitionName: 'Mock Competition 1',
              category: 'Technology',
              status: 'ONGOING',
              hasSubmitted: false
            }
          ],
          total: 25,
          page: 1,
          size: 10,
          pages: 3
        }),
      });
    });

    await page.goto('http://localhost:3000/project/mock@example.com', { waitUntil: 'networkidle' });
  });

  test('display Joined Competitions', async ({ page }) => {
    await expect(page.getByText('Joined Competitions')).toBeVisible({ timeout: 10000 });
  });

  test('display Team view', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Team' })).toBeVisible();
  });

  test('display personal competition table', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible();
  });


  test('pagination control', async ({ page }) => {
    await expect(page.getByText('Page 1 of 3')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Next page' })).toBeEnabled();
  });


  test('Submit for personal registration', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  });
});
