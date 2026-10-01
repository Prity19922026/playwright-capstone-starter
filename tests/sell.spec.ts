import { test, expect } from '../fixtures';
import { SellPage } from '../pages/SellPage';
import type { APIRequestContext } from '@playwright/test';

// All five tests open the sell form for the first holding, "Bluechip Growth Fund".
// The sell form has two groups of radio buttons (Market and Settlement type), a quantity,
// a confirmation checkbox and a "Submit for Redemption" button.

async function holdingQuantity(
  api: APIRequestContext,
  accountId: string,
  holdingName: string,
): Promise<number> {
 const response = await api.get(`http://localhost:4000/api/accounts/${accountId}/holdings`);
  expect(response.ok()).toBeTruthy();

  const holdings = (await response.json()) as {
    name: string;
    quantity: number;
  }[];

  const holding = holdings.find(({ name }) => name === holdingName);
  if (!holding) {
    throw new Error(`Holding not found: ${holdingName}`);
  }

  return holding.quantity;
}

// Selenium: SellTests.sellCashOnNse
//   Choose market NSE, settlement Cash, quantity 1, confirm, submit.
//   Expect the confirmation heading "Transaction submitted and under process",
//   the status "processing" and the settlement "cash".
test('07 Selling on NSE with cash settlement is confirmed', async ({ loggedInPage }) => {
  const sell = new SellPage(loggedInPage.page);

  await sell.openForFirstHolding();
  await sell.chooseMarket('NSE');
  await sell.chooseSettlement('Cash');
  await sell.enterQuantity('1');
  await sell.confirmDetails();
  await sell.submit();

  await expect(sell.confirmationHeading).toBeVisible();
  await expect(sell.status).toBeVisible();
  
  await expect(sell.settlement).toBeVisible();
});

// Selenium: SellTests.chequeNeedsBranch
//   Choose Cheque, quantity 1, confirm, submit, without filling in a branch.
//   Expect the alert "Cheque settlement requires a branch" and to stay on the sell page.
test('08 Cheque settlement without a branch is rejected', async ({ loggedInPage }) => {
  const { page } = loggedInPage;
  const sell = new SellPage(page);

  await sell.openForFirstHolding();
  await sell.chooseSettlement('Cheque');
  await sell.enterQuantity('1');
  await sell.confirmDetails();
  await sell.submit();

  await expect(page.getByRole('alert')).toHaveText('Cheque settlement requires a branch');
  await expect(page).toHaveURL(/\/sell\//);
});

// Selenium: SellTests.chequeWithBranchConfirms
//   Choose NSE and Cheque, branch "Fort, Mumbai", quantity 1, confirm, submit.
//   Expect the settlement "cheque" and the status "processing".
test('09 Cheque settlement with a branch is confirmed', async ({ loggedInPage }) => {
  const { page } = loggedInPage;
  const sell = new SellPage(page);

  await sell.openForFirstHolding();
  await sell.chooseMarket('NSE');
  await sell.chooseSettlement('Cheque');
  await sell.enterChequeBranch('Fort, Mumbai');
  await sell.enterQuantity('1');
  await sell.confirmDetails();
  await sell.submit();

  await expect(page.getByText('cheque', { exact: true })).toBeVisible();
  await expect(sell.status).toHaveText('processing');
});

// Selenium: SellTests.oversellIsRejected
//   Quantity 9999, confirm, submit. Expect an alert like "Only 120 units available to sell".
//   The number depends on the account, so match the shape of the sentence.
test('10 Selling more than is held is rejected', async ({ loggedInPage }) => {
  const { page } = loggedInPage;
  const sell = new SellPage(page);

  await sell.openForFirstHolding();
  await sell.enterQuantity('9999');
  await sell.confirmDetails();
  await sell.submit();

  await expect(page.getByRole('alert')).toHaveText(/^Only .* units available to sell$/);
});

// Selenium: SellTests.saleReducesQuantityOnServer
//   Ask the API for the holding's quantity, sell 2 through the UI, ask the API again,
//   expect the quantity to be 2 lower. Playwright's request fixture replaces the Java HttpClient.
test('11 A sale reduces the quantity held on the server', async ({ loggedInPage, api }) => {
  const { page, account } = loggedInPage;

  const before = await holdingQuantity(api, account.accountId, 'Bluechip Growth Fund');

  const sell = new SellPage(page);
  await sell.openForFirstHolding();
  await sell.enterQuantity('2');
  await sell.confirmDetails();
  await sell.submit();
  await expect(sell.confirmationHeading).toBeVisible();

  const after = await holdingQuantity(api, account.accountId, 'Bluechip Growth Fund');
  expect(after).toBe(before - 2);
});
