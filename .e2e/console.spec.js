const { test, expect } = require('@playwright/test');

const ROUTES = [
  '/',
  '/conjunctions',
  '/conjunctions/CJ-4471',
  '/fleet',
  '/fleet/OG-2',
  '/maneuvers',
  '/maneuvers/MNV-0912',
  '/catalog',
  '/catalog/34454',
  '/sources',
  '/sources/leolabs',
  '/settings',
];

/**
 * Open the command palette, tolerating the window between first paint and
 * hydration. The keydown listener is attached by an effect, so a press that
 * lands before React mounts is simply dropped — real behaviour, not a bug, but
 * a race a test can lose on a cold bundle.
 */
async function openPalette(page) {
  await expect(async () => {
    await page.keyboard.press('ControlOrMeta+k');
    await expect(
      page.getByRole('dialog', { name: 'Command palette' })
    ).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20000 });
}

test.describe('console', () => {
  test('renders all three panes and the source strip', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Active conjunctions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /probability of collision/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Maneuver planner' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Tracking source freshness' })).toBeVisible();
  });

  test('selecting a conjunction in the queue drives the planner', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/');

    // Default selection is the critical event.
    await expect(page.getByText('Effect on CJ-4471')).toBeVisible();

    await page.getByRole('button', { name: /STARLINK-1436/ }).first().click();
    await expect(page.getByText('Effect on CJ-4462')).toBeVisible();
  });

  test('a passed decision deadline disables the commit control', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/');

    // CJ-4474's deadline is behind the scenario epoch.
    await page.getByRole('button', { name: /SL-16 R\/B DEB/ }).first().click();
    // Exact, because the queue row carries the same "window closed" phrase.
    const commit = page.getByRole('button', { name: 'Window closed', exact: true });
    await expect(commit).toBeVisible();
    await expect(commit).toBeDisabled();
  });

  test('the timeline lane count matches the screening queue', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/');
    await expect(
      page.getByRole('img', { name: /probability of collision over time for 8/i })
    ).toBeVisible();
  });
});

test.describe('navigation', () => {
  test('every route renders its heading without error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    for (const route of ROUTES) {
      await page.goto(route);
      // Visible-only: below xl the console hides two of its three panel
      // headings behind the segmented control, and they come first in the DOM.
      await expect(page.locator('h1:visible, h2:visible').first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test('command palette opens and navigates', async ({ page, isMobile }) => {
    // ⌘K is a desktop affordance; on touch the bottom bar is the way around.
    test.skip(!!isMobile, 'no hardware keyboard');
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/');

    await openPalette(page);

    await page.getByLabel('Search').fill('Halcyon');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/fleet\/OG-5/);
  });
});

test.describe('responsive', () => {
  const SIZES = [
    { width: 1920, height: 1080, name: 'desktop' },
    { width: 1280, height: 900, name: 'laptop' },
    { width: 834, height: 1112, name: 'tablet' },
    { width: 390, height: 844, name: 'phone' },
  ];

  for (const size of SIZES) {
    test(`no horizontal overflow at ${size.name}`, async ({ page }) => {
      await page.setViewportSize(size);
      for (const route of ROUTES) {
        await page.goto(route);
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth
        );
        expect(overflow, `${route} at ${size.name}`).toBeLessThanOrEqual(1);
      }
    });
  }

  test('below xl the console uses a segmented control', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Timeline is the default pane; the queue is hidden until selected.
    await expect(page.getByRole('heading', { name: /probability of collision/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Active conjunctions' })).toBeHidden();

    await page.getByRole('button', { name: 'Queue', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Active conjunctions' })).toBeVisible();
  });

  test('at xl all three panes are visible at once', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Queue', exact: true })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Active conjunctions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Maneuver planner' })).toBeVisible();
  });
});

test.describe('detail routes', () => {
  const CASES = [
    { from: '/catalog', to: /\/catalog\/34454/, heading: /COSMOS 2251 DEB/ },
    { from: '/maneuvers', to: /\/maneuvers\/MNV-0912/, heading: /MNV-0912/ },
    { from: '/sources', to: /\/sources\//, heading: /Space-Track|LeoLabs|COMSPOC/ },
  ];

  for (const c of CASES) {
    test(`${c.from} rows open their detail page`, async ({ page }) => {
      await page.setViewportSize({ width: 1600, height: 1000 });
      await page.goto(c.from);
      await page.locator('tbody tr').first().click();
      await expect(page).toHaveURL(c.to);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(c.heading);
    });
  }

  test('a catalog object lists the conjunctions it drives', async ({ page }) => {
    await page.goto('/catalog/34454');
    await expect(
      page.getByRole('heading', { name: /conjunctions against the fleet/i })
    ).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CJ-4471' })).toBeVisible();
  });

  test('a source lists the conjunctions it screened', async ({ page }) => {
    await page.goto('/sources/leolabs');
    await expect(page.getByRole('cell', { name: 'CJ-4471' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CJ-4465' })).toBeVisible();
  });

  test('a historical burn degrades gracefully when its event has cleared', async ({ page }) => {
    // MNV-0909 references CJ-4442, which is no longer in the active set.
    await page.goto('/maneuvers/MNV-0909');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('MNV-0909');
    await expect(page.getByText('CJ-4442 (cleared)')).toBeVisible();
    await expect(page.getByText(/no downstream screening on file/i)).toBeVisible();
  });

  test('conjunction detail cross-links to fleet, catalog, and source', async ({ page }) => {
    await page.goto('/conjunctions/CJ-4471');
    await expect(page.getByRole('link', { name: /OG-2 Meridian-2/ })).toHaveAttribute(
      'href',
      '/fleet/OG-2'
    );
    await expect(page.getByRole('link', { name: '34454' })).toHaveAttribute(
      'href',
      '/catalog/34454'
    );
    await expect(page.getByRole('link', { name: /LeoLabs/ })).toHaveAttribute(
      'href',
      '/sources/leolabs'
    );
  });

  test('an unknown record renders the styled 404', async ({ page }) => {
    await page.goto('/catalog/00000');
    await expect(page.getByRole('heading', { name: 'No such record' })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to console/i })).toBeVisible();
  });
});

test.describe('link integrity', () => {
  test('every internal link resolves to a real record', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });

    // Collect every internal href reachable from the index pages.
    const found = new Set();
    for (const route of ROUTES) {
      await page.goto(route);
      const hrefs = await page.$$eval('a[href^="/"]', (as) =>
        as.map((a) => a.getAttribute('href'))
      );
      hrefs.forEach((h) => found.add(h));
    }

    expect(found.size).toBeGreaterThan(10);

    const broken = [];
    for (const href of [...found]) {
      const res = await page.goto(href);
      if (res && res.status() >= 400) {
        broken.push(`${href} -> HTTP ${res.status()}`);
        continue;
      }
      const isNotFound = await page
        .getByRole('heading', { name: 'No such record' })
        .isVisible()
        .catch(() => false);
      if (isNotFound) broken.push(`${href} -> 404 boundary`);
    }
    expect(broken, 'dead internal links').toEqual([]);
  });
});

test.describe('command palette', () => {
  test('acts on the shown selection even when Enter follows typing immediately', async ({
    page,
    isMobile,
  }) => {
    test.skip(!!isMobile, 'no hardware keyboard');
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/');

    await openPalette(page);
    // No settle time between typing and Enter — this is the race that made the
    // palette navigate to the previous render's first result.
    await page.getByLabel('Search').fill('Halcyon');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/fleet\/OG-5/);
  });

  test('arrow keys move the selection', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'no hardware keyboard');
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/');

    await openPalette(page);
    await page.getByLabel('Search').fill('CJ-44');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/conjunctions\/CJ-44/);
  });

  test('reaches catalog objects and sources', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'no hardware keyboard');
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/');

    await openPalette(page);
    await page.getByLabel('Search').fill('LeoLabs');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/sources\/leolabs/);
  });
});
