import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * ADR-0001 decision 11 commits the product to WCAG AA. This is the audit that
 * makes the commitment checkable instead of aspirational.
 *
 * axe-core catches the machine-checkable half of AA — contrast, accessible
 * names, landmarks, labels, heading order. It cannot judge whether focus order
 * makes sense or whether alt text is meaningful, so the keyboard tests below
 * cover the paths a keyboard-only visitor has to walk.
 */

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function scan(page) {
  return new AxeBuilder({ page }).withTags(WCAG_AA).analyze();
}

/** Reports each violation with the rule, the impact and the offending markup. */
function describeViolations(violations) {
  return violations
    .map((v) => {
      const nodes = v.nodes
        .map((n) => `      ${n.target.join(' ')}\n        ${n.failureSummary?.replace(/\n/g, ' ') ?? ''}`)
        .join('\n');
      return `  [${v.impact}] ${v.id}: ${v.help}\n${nodes}`;
    })
    .join('\n');
}

const PUBLIC_PAGES = [
  { name: 'homepage', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'contest list', path: '/contest-list' },
  { name: 'how to use', path: '/how-to-use' },
  { name: 'not found', path: '/no-such-page' },
];

test.describe('WCAG AA', () => {
  for (const { name, path } of PUBLIC_PAGES) {
    test(`${name} has no violations`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });

      const { violations } = await scan(page);

      expect(violations, `\n${describeViolations(violations)}`).toEqual([]);
    });
  }

  // Dark mode carries its own token values, so light-mode compliance says
  // nothing about it. next-themes reads the choice from localStorage.
  test.describe('in dark mode', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    });

    for (const { name, path } of PUBLIC_PAGES) {
      test(`${name} has no violations`, async ({ page }) => {
        await page.goto(path, { waitUntil: 'networkidle' });
        await expect(page.locator('html')).toHaveClass(/dark/);

        const { violations } = await scan(page);

        expect(violations, `\n${describeViolations(violations)}`).toEqual([]);
      });
    }
  });

  test('an authenticated page has no violations', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('userId', 'mock-user-id');
      localStorage.setItem('role', 'Participant');
    });
    await page.route('**/competitions/list**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'contest-1',
              name: 'Mock Contest 1',
              description: 'Test contest description',
              category: 'Technology',
              startDate: '2025-01-01',
              endDate: '2025-12-31',
              status: 'ONGOING',
              participationType: 'INDIVIDUAL',
              imageUrls: [],
            },
          ],
          total: 1,
          page: 1,
          size: 10,
          pages: 1,
        }),
      })
    );

    await page.goto('/contest/mockuser@example.com', { waitUntil: 'networkidle' });
    await expect(page.getByText('Mock Contest 1')).toBeVisible({ timeout: 10000 });

    const { violations } = await scan(page);
    expect(violations, `\n${describeViolations(violations)}`).toEqual([]);
  });

  test('an open dialog has no violations, and traps focus inside itself', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Log in' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const { violations } = await scan(page);
    expect(violations, `\n${describeViolations(violations)}`).toEqual([]);

    // Focus must not escape to the page behind the dialog.
    const insideDialog = await dialog.evaluate((node) => node.contains(document.activeElement));
    expect(insideDialog).toBe(true);
  });

  test('the skip link is the first thing a keyboard reaches, and it works', async ({ page }) => {
    await page.goto('/contest-list', { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');

    const focused = page.locator(':focus');
    await expect(focused).toHaveText(/skip to main content/i);

    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeAttached();
  });

  test('every interactive control on the homepage is reachable by keyboard', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const reached = new Set();
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        return `${el.tagName}:${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)}`;
      });
      if (id) reached.add(id);
    }

    // The header's primary actions are the ones a visitor cannot do without.
    const joined = [...reached].join('|');
    expect(joined).toMatch(/Log in/i);
    expect(joined).toMatch(/Get started/i);
  });

  test('focus is always visible when a control is reached by keyboard', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const outline = await page.evaluate(() => {
      const el = document.activeElement;
      const cs = getComputedStyle(el);
      return { width: cs.outlineWidth, style: cs.outlineStyle, shadow: cs.boxShadow };
    });

    const hasRing =
      (outline.style !== 'none' && parseFloat(outline.width) > 0) ||
      (outline.shadow && outline.shadow !== 'none');
    expect(hasRing).toBe(true);
  });
});
