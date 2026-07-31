// test_participant/comments.spec.js
import { test, expect } from '@playwright/test';

test.use({ browserName: 'chromium' });

test.describe('Comments Page', () => {
  test.beforeEach(async ({ page }) => {
    // 注入localStorage
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('userId', 'mock-user-id');
      localStorage.setItem('role', 'Participant');
    });

    // Mock 用户信息接口
    await page.route('**/users/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: 'mock-user-id',
          email: 'mock@example.com',
          role: 'Participant',
        }),
      });
    });

    // Mock 评论列表接口
    await page.route('**/interactions/comments/list**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'comment-1',
              content: 'This is a test comment',
              userId: 'mock-user-id',
              createdAt: new Date().toISOString(),
              replies: [],
            },
          ],
          total: 12,
          page: 1,
          size: 5,
          pages: 3,
        }),
      });
    });

    // 去页面
    await page.goto('http://localhost:3000/comments/test-submission-id');
    await page.waitForLoadState('networkidle'); // 等所有请求完成
  });

  test('should Comments successfully', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible();
  });


  test('pagination control visible', async ({ page }) => {
    const pager = page.getByRole('navigation', { name: 'Comment pagination' });
    await expect(pager).toBeVisible();
    await expect(pager.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await expect(pager.getByRole('button', { name: 'Next' })).toBeEnabled();
  });
});
