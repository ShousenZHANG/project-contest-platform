import { test, expect } from '@playwright/test';


test.use({ browserName: 'chromium' });

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {

    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('userId', 'mock-user-id');
      localStorage.setItem('email', 'mockuser@example.com');
      localStorage.setItem('role', 'Participant');
    });

    let profile = {
      name: 'Mock User',
      email: 'mockuser@example.com',
      description: 'This is a mock description.',
      avatarUrl: '/mock-avatar.png',
    };
    await page.route('http://localhost:8080/users/profile', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(profile),
        });
      } else if (request.method() === 'PUT') {
        const { name, email, description } = request.postDataJSON();
        profile = { ...profile, name, email, description };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(profile),
        });
      } else {
        await route.continue();
      }
    });


    await page.goto('/profile/mockuser@example.com');


    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Mock User');
  });


  test('should allow editing profile information and save', async ({ page }) => {
    await page.fill('input[name="name"]', 'New Name');
    await page.fill('input[name="email"]', 'newemail@example.com');
    await page.fill('textarea[name="description"]', 'I love frontend development.');

    const saved = page.waitForRequest(
      (request) => new URL(request.url()).pathname === '/users/profile' && request.method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Save' }).click();
    expect((await saved).postDataJSON()).toEqual({
      name: 'New Name',
      email: 'newemail@example.com',
      password: '',
      description: 'I love frontend development.',
    });

    // Sonner renders success toasts as a live region, not role="alert".
    await expect(page.getByText(/profile updated successfully/i)).toBeVisible();
    await expect(page).toHaveURL('/profile/mockuser@example.com');
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('mock-token');
  });

  test('changing the password clears the session and requires sign-in', async ({ page }) => {
    await page.getByLabel('Password', { exact: true }).fill('NewPassword123');
    const saved = page.waitForRequest(
      (request) => new URL(request.url()).pathname === '/users/profile' && request.method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Save' }).click();
    expect((await saved).postDataJSON()).toEqual({
      name: 'Mock User',
      email: 'mockuser@example.com',
      password: 'NewPassword123',
      description: 'This is a mock description.',
    });
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('status').filter({ hasText: 'Password updated. Please sign in again with your new password.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    expect(await page.evaluate(() => ({
      token: localStorage.getItem('token'),
      userId: localStorage.getItem('userId'),
      email: localStorage.getItem('email'),
      role: localStorage.getItem('role'),
    }))).toEqual({ token: null, userId: null, email: null, role: null });
  });

  test('should delete account successfully', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete Account' }).click();
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog.getByText('Delete Account')).toBeVisible();
  });
});
