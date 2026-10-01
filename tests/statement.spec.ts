import { test, expect } from '../fixtures';
import { StatementPage } from '../pages/StatmentPage';

// The dashboard has a "View statement" link that opens the statement in a NEW WINDOW.
// Selenium handled that with getWindowHandles() and switchTo().window().

// Selenium: StatementTests.statementOpensInNewWindow
//   Click the link, wait until there are two windows, switch to the new one, expect the
//   heading "Account Statement", close it, and return to the dashboard.
test('13 The statement opens in a new window', async ({ loggedInPage }) => {
  const { page, account } = loggedInPage;

  const popupPromise = await page.waitForEvent('popup');
  await page.getByRole('link', { name: 'View statement' }).click();

  const statementPage = await popupPromise;
  const statement = new StatementPage(statementPage);

  await expect(statement.heading()).toHaveText('Account Statement');

  await statementPage.close();

  await expect(page.getByRole('heading', { level: 1 }))
    .toHaveText(`Welcome, ${account.username}`);
});

test('14 The terms can be accepted inside the iframe', async ({ loggedInPage }) => {
  const { page, account } = loggedInPage;

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'View statement' }).click();

  const statementPage = await popupPromise;
  const statement = new StatementPage(statementPage);

  try {
    expect(await statement.acceptTermsInFrame()).toBe('Terms accepted');
    await expect(statement.heading()).toHaveText('Account Statement');
  } finally {
    await statementPage.close();
  }
});

// Selenium: StatementTests.marketFilterMultiSelect
//   The statement has a "Markets" multi-select. Choose BSE (1 holding, "National Infra Bond"),
//   then NSE and BSE together (3 holdings), then clear it (3 holdings again).
//   Selenium used the Select class: selectByValue, getAllSelectedOptions, deselectAll.
test('15 The market filter accepts several selections', async ({ loggedInPage }) => {
  const { page } = loggedInPage;
  const statementLink = page.getByRole('link', { name: 'View statement' });

  await expect(statementLink).toBeVisible();

  const [statementPage] = await Promise.all([
    page.context().waitForEvent('page'),
    statementLink.click(),
  ]);

  const statement = new StatementPage(statementPage);
  const marketFilter = statement.marketFilter();

  try {
    await expect(statement.heading()).toHaveText('Account Statement');
    await expect(statement.rows()).toHaveCount(3);

    await marketFilter.selectOption('BSE');
    await expect(statement.rows()).toHaveCount(1);
    await expect(statement.rows()).toContainText('National Infra Bond');

    await marketFilter.selectOption(['BSE', 'NSE']);
    await expect(statement.rows()).toHaveCount(3);
    await expect(marketFilter.locator('option:checked')).toHaveCount(2);

    await marketFilter.selectOption([]);
    await expect(statement.rows()).toHaveCount(3);
    await expect(marketFilter.locator('option:checked')).toHaveCount(0);
  } finally {
    await statementPage.close();
  }
});
