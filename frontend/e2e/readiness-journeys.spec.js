import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const competition = {
  id: 'comp-1',
  name: 'AI Innovation Challenge',
  description: 'Create an accessible solution for small local communities.',
  status: 'COMPLETED',
  category: 'Programming & Technology',
  participationType: 'INDIVIDUAL',
  startDate: '2026-10-01T00:00:00Z',
  endDate: '2026-10-04T00:00:00Z',
  scoringCriteria: ['Originality', 'Execution'],
  imageUrls: [],
  isPublic: true,
};
const work = {
  id: 'sub-1',
  competitionId: 'comp-1',
  title: 'Nebula Community Tools',
  description: 'A complete submission with a long description that wraps on narrow mobile screens.',
  fileName: 'nebula-project.pdf',
  fileUrl: '/submissions/sub-1/download',
  reviewStatus: 'APPROVED',
  competitionStatus: 'COMPLETED',
  canScore: true,
  hasScored: false,
  scoringCriteria: competition.scoringCriteria,
};
const score = {
  submissionId: 'sub-1',
  competitionId: 'comp-1',
  judgeComments: 'Accessible and well built.',
  totalScore: 7.5,
  scores: [
    { criterion: 'Originality', score: 8 },
    { criterion: 'Execution', score: 7 },
  ],
};
const readiness = {
  competitionId: 'comp-1',
  isPublic: true,
  status: 'COMPLETED',
  canAward: false,
  minimumJudgeCount: 3,
  approvedCount: 2,
  eligibleCount: 1,
  blockers: ['Every approved work must have 3 valid judges.'],
  submissions: [
    {
      submissionId: 'sub-1',
      title: 'Nebula Community Tools',
      judgeCount: 3,
      totalScore: 8.2,
      eligible: true,
      blockers: [],
      criterionScores: { Originality: 8.3, Execution: 8.1 },
    },
    {
      submissionId: 'sub-2',
      title: 'Unfinished scoring entry',
      judgeCount: 2,
      totalScore: 7.4,
      eligible: false,
      blockers: ['One more judge is needed.'],
      criterionScores: { Originality: 7.4, Execution: 7.4 },
    },
  ],
};

async function authenticate(page, role, theme) {
  await page.addInitScript(
    ({ accountRole, accountTheme }) => {
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('userId', 'account-1');
      localStorage.setItem('email', 'account@example.com');
      localStorage.setItem('role', accountRole);
      localStorage.setItem('theme', accountTheme);
    },
    { accountRole: role, accountTheme: theme },
  );
}
async function fulfill(route, data, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
}
async function fixtures(page) {
  await page.route('**/competitions/comp-1', (route) => fulfill(route, competition));
  await page.route('**/competitions/managed/comp-1', (route) => fulfill(route, competition));
  await page.route('**/competitions/list**', (route) =>
    fulfill(route, { data: [competition], total: 1, pages: 1 }),
  );
  await page.route('**/judges/submissions/sub-1**', (route) => fulfill(route, work));
  await page.route('**/judges/sub-1/detail', (route) => fulfill(route, score));
  await page.route('**/judges/score', (route) => fulfill(route, { success: true, data: 'Saved' }));
  await page.route('**/winners/eligibility**', (route) => fulfill(route, readiness));
  await page.route('**/winners/list**', (route) => fulfill(route, {
    data: [{ submissionId: 'sub-1', title: 'Nebula Community Tools', submitterName: 'Community Maker', awards: ['Champion'], totalScore: 8.2 }],
    total: 1, page: 1, pages: 1,
  }));
}
async function assertAccessible(page) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
          .every((animation) => ['finished', 'idle'].includes(animation.playState)),
      ),
    )
    .toBe(true);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    result.violations,
    JSON.stringify(
      result.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => node.target),
      })),
    ),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

for (const width of [375, 768, 1440]) {
  for (const theme of ['light', 'dark']) {
    test(`Judge populated score form ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({
        colorScheme: theme,
        reducedMotion: theme === 'dark' ? 'reduce' : 'no-preference',
      });
      await authenticate(page, 'Judge', theme);
      await fixtures(page);
      await page.goto('/RatingDetail/comp-1/sub-1');
      await expect(page.getByRole('heading', { name: 'Nebula Community Tools' })).toBeVisible();
      await expect(page.getByLabel('Originality', { exact: true })).toHaveValue('5');
      await assertAccessible(page);
      await page.screenshot({
        path: `../.git/audit/2026-10-04/readiness-judge-${width}-${theme}.png`,
        fullPage: true,
      });
      await page.getByLabel('Originality', { exact: true }).fill('9.2');
      await page.getByLabel('Feedback').fill('Keep these notes while saving.');
      const sent = page.waitForRequest(
        (request) => request.url().endsWith('/judges/score') && request.method() === 'POST',
      );
      await page.getByRole('button', { name: 'Submit rating' }).click();
      const request = await sent;
      expect(request.postDataJSON().scores).toEqual([
        { criterion: 'Originality', score: 9.2 },
        { criterion: 'Execution', score: 5 },
      ]);
      await expect(page.getByText('Rating saved · 7.50 / 10')).toBeVisible();
      await expect(page.getByLabel('Originality', { exact: true })).toHaveValue('8');
      await assertAccessible(page);
      if (width < 768) {
        await page.getByRole('button', { name: 'Open navigation' }).click();
        await expect(
          page.getByRole('dialog').getByRole('link', { name: 'Scoring Queue' }),
        ).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
      } else {
        await page.getByRole('button', { name: 'Collapse sidebar' }).click();
        const collapsedLink = page.getByRole('link', { name: 'Scoring Queue', exact: true });
        await expect(collapsedLink).toHaveAttribute('aria-label', 'Scoring Queue');
        await expect(collapsedLink).toHaveCSS('min-height', '44px');
        await expect(collapsedLink).toHaveCSS('display', 'flex');
      }
    });

    test(`Organizer populated award readiness ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({
        colorScheme: theme,
        reducedMotion: theme === 'dark' ? 'reduce' : 'no-preference',
      });
      await authenticate(page, 'Organizer', theme);
      await fixtures(page);
      await page.goto('/submissions/comp-1/ratings');
      await expect(
        page.getByText('Unfinished scoring entry').filter({ visible: true }),
      ).toBeVisible();
      await expect(
        page.getByText('One more judge is needed.').filter({ visible: true }),
      ).toBeVisible();
      if (width < 768) {
        const row = page.getByRole('article', {
          name: 'Award eligibility for Unfinished scoring entry',
        });
        await expect(row.getByText('2 / 3')).toBeVisible();
        const blocker = row.getByText('One more judge is needed.');
        const box = await blocker.boundingBox();
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        await row.getByText('Criterion averages').click();
        await expect(row.getByText('Originality', { exact: true })).toBeVisible();
      }
      await expect(page.getByRole('button', { name: 'Auto Award Winners' })).toBeDisabled();
      await assertAccessible(page);
      await page.getByRole('button', { name: 'Total score / 10' }).click();
      // Reset the viewport after scrolling to an expanded mobile row so a
      // full-page capture does not paint the sticky shell halfway down it.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `../.git/audit/2026-10-04/readiness-organizer-${width}-${theme}.png`,
        fullPage: true,
      });
      await expect(page.locator('th[aria-sort]')).toHaveAttribute('aria-sort', 'ascending');
      await page.route('**/winners/eligibility**', (route) =>
        fulfill(route, {
          ...readiness,
          canAward: true,
          eligibleCount: 2,
          blockers: [],
          submissions: readiness.submissions.map((submission) => ({
            ...submission,
            judgeCount: 3,
            eligible: true,
            blockers: [],
          })),
        }),
      );
      await page.getByRole('button', { name: 'Refresh readiness' }).click();
      await expect(page.getByRole('button', { name: 'Auto Award Winners' })).toBeEnabled();
      let awards = 0;
      await page.route('**/winners/auto-award**', async (route) => {
        awards += 1;
        await page.route('**/winners/eligibility**', (target) =>
          fulfill(target, {
            ...readiness,
            status: 'AWARDED',
            canAward: false,
            eligibleCount: 2,
            blockers: [],
          }),
        );
        await fulfill(route, { success: true, data: 'Awarded' });
      });
      await page.getByRole('button', { name: 'Auto Award Winners' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      expect(awards).toBe(0);
      await assertAccessible(page);
      await dialog.getByRole('button', { name: 'Publish awards' }).click();
      await expect(page.getByRole('link', { name: 'View published results' })).toHaveAttribute(
        'href',
        '/results/comp-1',
      );
      expect(awards).toBe(1);
    });
  }
}

test('Private finalized awards remain in Organizer management without public sharing', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await authenticate(page, 'Organizer', 'dark');
  await fixtures(page);
  await page.route('**/winners/eligibility**', (route) => fulfill(route, {
    ...readiness, isPublic: false, status: 'AWARDED', canAward: false,
  }));
  let publicReads = 0;
  await page.route('**/winners/public-list**', (route) => {
    publicReads += 1;
    return fulfill(route, { message: 'Private competition' }, 404);
  });
  await page.goto('/submissions/comp-1/ratings');
  const finalized = page.getByRole('region', { name: 'Finalized awards' });
  await expect(finalized.getByText('Community Maker')).toBeVisible();
  await expect(finalized.getByText('Champion', { exact: true })).toBeVisible();
  await expect(finalized.getByText('8.20 / 10')).toBeVisible();
  await expect(page.getByRole('link', { name: 'View published results' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Auto Award Winners' })).toBeDisabled();
  expect(publicReads).toBe(0);
  await assertAccessible(page);
});

test('Participant cannot enter the Judge form through a legacy deep link', async ({ page }) => {
  await authenticate(page, 'Participant', 'light');
  await fixtures(page);
  let contexts = 0;
  await page.route('**/judges/submissions/**', async (route) => {
    contexts += 1;
    await fulfill(route, work);
  });
  await page.goto('/RatingDetail/comp-1/sub-1');
  await expect(page).toHaveURL('http://localhost:3000/');
  await expect(page.getByRole('heading', { name: 'Rate This Submission' })).toHaveCount(0);
  expect(contexts).toBe(0);
});

test('Obsolete revision deep links start a fresh score instead of reusing legacy grades', async ({
  page,
}) => {
  await authenticate(page, 'Judge', 'light');
  await fixtures(page);
  await page.route('**/judges/submissions/sub-1**', (route) =>
    fulfill(route, { ...work, revision: 2, requiresRescore: true, hasScored: false }),
  );
  let detailReads = 0;
  let saved = false;
  await page.route('**/judges/sub-1/detail', (route) => {
    detailReads += 1;
    return fulfill(
      route,
      saved
        ? score
        : {
            ...score,
            requiresRescore: true,
            totalScore: null,
            scores: [
              { criterion: 'Originality', score: 95 },
              { criterion: 'Execution', score: 90 },
            ],
          },
    );
  });
  await page.route('**/judges/score', (route) => {
    saved = true;
    return fulfill(route, { success: true, data: 'Saved' });
  });
  await page.goto('/ReRating/comp-1/sub-1');
  await expect(page.getByText(/new score after a file or scoring-rule update/)).toBeVisible();
  await expect(page.getByLabel('Originality', { exact: true })).toHaveValue('5');
  expect(detailReads).toBe(0);
  await page.getByRole('button', { name: 'Submit rating' }).click();
  await expect(page.getByText('Rating saved · 7.50 / 10')).toBeVisible();
  expect(saved).toBe(true);
  await assertAccessible(page);
});

test('Public browse requests page two and preserves filters on browser back', async ({ page }) => {
  await page.route('**/competitions/list**', (route) => {
    const params = new URL(route.request().url()).searchParams;
    const currentPage = Number(params.get('page'));
    return fulfill(route, {
      data: [
        {
          ...competition,
          id: `comp-${currentPage}`,
          name: currentPage === 2 ? 'Contest 13' : 'Contest 1',
        },
      ],
      total: 25,
      pages: 3,
      page: currentPage,
    });
  });
  await page.goto('/contest-list?status=COMPLETED&participationType=INDIVIDUAL');
  await expect(page.getByRole('status')).toContainText('25 results');
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByRole('link', { name: 'Contest 13', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/page=2/);
  await page.goBack();
  await expect(page.getByRole('link', { name: 'Contest 1', exact: true })).toBeVisible();
  await expect(page.getByLabel('Participation type')).toHaveValue('INDIVIDUAL');
  await assertAccessible(page);
});

test('Public results show persisted winners and scores', async ({ page }) => {
  await page.route('**/competitions/comp-1', (route) =>
    fulfill(route, { ...competition, status: 'AWARDED' }),
  );
  await page.route('**/winners/public-list**', (route) =>
    fulfill(route, {
      data: [
        {
          submissionId: 'sub-1',
          title: 'Nebula Community Tools',
          awards: ['Champion'],
          submitterName: 'Team Orbit',
          totalScore: 8.25,
        },
        {
          submissionId: 'old-sub',
          title: 'Historical entry',
          awards: ['Finalist'],
          submitterName: 'Team Archive',
          totalScore: null,
        },
      ],
      total: 2,
      pages: 1,
    }),
  );
  await page.goto('/results/comp-1');
  await expect(page.getByText('Champion', { exact: true })).toBeVisible();
  await expect(page.getByText('Team Orbit')).toBeVisible();
  await expect(page.getByText(/8\.25/)).toBeVisible();
  await expect(page.getByText('Score unavailable')).toBeVisible();
  await assertAccessible(page);
});

test('Organizer navigates all 27 contests, filters server results and confirms opening', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await authenticate(page, 'Organizer', 'light');
  let opened = false;
  await page.route('**/competitions/achieve/my**', (route) => {
    const params = new URL(route.request().url()).searchParams;
    const requested = Number(params.get('page'));
    return fulfill(route, {
      data: [
        {
          ...competition,
          id: `org-${requested}`,
          name: requested === 2 ? 'My Contest 11' : 'My Contest 1',
          status: params.get('status') || (opened ? 'ONGOING' : 'UPCOMING'),
        },
      ],
      total: 27,
      pages: 3,
      page: requested,
    });
  });
  await page.goto('/OrganizerContestList/account@example.com?participationType=TEAM');
  await expect(page.getByRole('status')).toContainText('27 results');
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('My Contest 11')).toBeVisible();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByLabel('Status', { exact: true }).selectOption('COMPLETED');
  await expect(page).toHaveURL(/status=COMPLETED/);
  await expect(page).not.toHaveURL(/page=2/);
  await assertAccessible(page);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.goBack();
  await expect(page.getByText('My Contest 11')).toBeVisible();
  await page.getByRole('button', { name: 'Start competition', exact: true }).click();
  expect(opened).toBe(false);
  await page.route('**/competitions/update/org-2', (route) => {
    expect(route.request().postDataJSON()).toEqual({ status: 'ONGOING' });
    opened = true;
    return fulfill(route, { success: true, data: 'Opened' });
  });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start competition', exact: true })
    .click();
  await expect(page.getByText('ONGOING', { exact: true })).toBeVisible();
  expect(opened).toBe(true);
  await assertAccessible(page);
});

test('Admin creates a real Judge account while preserving the Admin session', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await authenticate(page, 'Admin', 'light');
  await page.route('**/users/admin/list**', (route) =>
    fulfill(route, {
      data: [
        {
          id: 'participant-1',
          name: 'Test Participant',
          email: 'participant@example.com',
          role: 'Participant',
        },
      ],
      total: 1,
      pages: 1,
    }),
  );
  let created = false;
  await page.route('**/users/admin/accounts', (route) => {
    expect(route.request().postDataJSON()).toEqual({
      name: 'New Judge',
      email: 'judge@example.com',
      password: 'TestingPassword1',
      role: 'JUDGE',
    });
    created = true;
    return fulfill(route, {
      success: true,
      data: { id: 'judge-1', name: 'New Judge', role: 'Judge' },
    });
  });
  await page.goto('/AdminAccountManage');
  await expect(page.getByText('Test Participant')).toBeVisible();
  await page.getByRole('button', { name: 'Create judge', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('New Judge');
  await page.getByLabel('Email', { exact: true }).fill('judge@example.com');
  await page.getByLabel('Temporary password').fill('TestingPassword1');
  await assertAccessible(page);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(created).toBe(true);
  expect(
    await page.evaluate(() => ({
      token: localStorage.getItem('token'),
      role: localStorage.getItem('role'),
    })),
  ).toEqual({ token: 'mock-token', role: 'Admin' });
});
