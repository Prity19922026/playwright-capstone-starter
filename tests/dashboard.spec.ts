import { test, expect } from '../fixtures';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';

// Selenium: DashboardTests.dashboardListsHoldings
//   Logs in as the shared demo account, then checks: 3 holdings, the first one is
//   "Bluechip Growth Fund", and its details start with "NSE".
test('04 Dashboard lists the holdings for the account', async ({ loggedInPage }) => {
  const dashboard = new DashboardPage(loggedInPage.page);

  await expect(dashboard.holdingRows()).toHaveCount(3);
  await expect(dashboard.firstHoldingName()).toHaveText('Bluechip Growth Fund');
  await expect(dashboard.firstHoldingMeta()).toContainText(/^NSE/);
});

// Selenium: DashboardTests.emptyAccountShowsMessage
//   Logs in as the account "emptyholder" and expects the text "No holdings remaining."
//   and zero holdings. Playwright can create an account that has no holdings on demand.
test('05 An account with no holdings shows the empty message', async ({ page, createAccount }) => {
  const account = await createAccount({ holdings: [] });

  const login = new LoginPage(page);
  await login.open();
  await login.login('Retail Banking', account.username, account.password);
  await login.expectOnDashboard();

  const dashboard = new DashboardPage(page);
  await expect(page.getByText('No holdings remaining.')).toBeVisible();
  await expect(dashboard.holdingRows()).toHaveCount(0);
});
