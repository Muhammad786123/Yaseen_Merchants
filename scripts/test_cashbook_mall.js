import 'fake-indexeddb/auto';
import assert from 'assert';
import { db, clearAllDatabaseData } from '../src/db/database.js';
import { cashBookService } from '../src/services/cashBookService.js';
import { salePurchaseService } from '../src/services/salePurchaseService.js';
import { capitalService } from '../src/services/capitalService.js';

async function runTests() {
  console.log('--- Starting Cash Book Mall A/C & Net P/L Verification ---');
  await clearAllDatabaseData();

  // 1. Setup Initial Accounts
  // Physical Cash account with opening 3,426,000
  await db.accounts.add({
    id: 'acc_cash',
    code: '1001',
    name: 'Cash in Hand',
    type: 'Cash',
    balance: 3426000,
    openingBalance: 3426000,
  });

  // Capital with 3,426,000 credit
  await capitalService.addEntry({
    date: '2026-10-01',
    description: 'Initial Capital',
    amount: 3426000,
    type: 'Add',
  });

  // Verify initial state
  const initAccounts = await db.accounts.toArray();
  const initCash = initAccounts.find((a) => a.name.toLowerCase().includes('cash'));
  assert.strictEqual(Number(initCash.balance), 3426000, 'Initial cash should be 3,426,000');

  const initCapital = await capitalService.getBalance();
  assert.strictEqual(Number(initCapital), 3426000, 'Initial capital should be 3,426,000');

  const initSummary = await salePurchaseService.getSummary();
  assert.strictEqual(Number(initSummary.netBalance), 0, 'Initial Mall balance should be 0');

  console.log('✓ Initial setup verified: Cash 3,426,000, Capital 3,426,000, Mall 0');

  // 2. Post Cash Book with Trading Accounts
  // Row 1: Debit 5,000 to "Mall A/C - مال کھاتہ" (Expense: Labour)
  // Row 2: Credit 20,000 to "Sale A/C - سیل" (Cash Sale)
  const bookNo = 101;
  const entriesToSave = [
    {
      accountType: 'mall',
      accountId: '99010',
      accountNo: '99010',
      accountName: 'Mall A/C - مال کھاتہ',
      head: 'Mall',
      detail: 'Labour - factory wages',
      debit: 5000,
      credit: 0,
    },
    {
      accountType: 'mall',
      accountId: '99011',
      accountNo: '99011',
      accountName: 'Sale A/C - سیل',
      head: 'Sale',
      detail: 'Cash waste sale',
      debit: 0,
      credit: 20000,
    },
  ];

  console.log('Saving Cash Book with Debit 5k (Mall A/C) and Credit 20k (Sale A/C)...');
  await cashBookService.saveBook({
    cashBookNo: bookNo,
    date: '2026-10-12',
    rows: entriesToSave,
  });

  // 3. Verify Cash Balance
  const postAccounts = await db.accounts.toArray();
  const postCash = postAccounts.find((a) => a.name.toLowerCase().includes('cash'));
  // Opening 3,426,000 + Credit 20,000 - Debit 5,000 = 3,441,000
  console.log('Post Cash Balance:', postCash.balance);
  assert.strictEqual(Number(postCash.balance), 3441000, 'Cash balance must be 3,441,000');
  console.log('✓ Cash balance correctly updated to 3,441,000');

  // 4. Verify Mall A/C Summary and Adjustments
  const postSummary = await salePurchaseService.getSummary();
  console.log('Mall Summary:', postSummary);
  // cashBookAdjustments = Credit 20,000 - Debit 5,000 = +15,000
  assert.strictEqual(Number(postSummary.cashBookAdjustments), 15000, 'Cash book mall adjustments must be +15,000');
  assert.strictEqual(Number(postSummary.netBalance), 15000, 'Mall net balance must be +15,000');
  console.log('✓ Mall A/C summary correctly reflects +15,000 net position');

  // 5. Verify Mall A/C Ledger & Statement Rows
  const ledger = await salePurchaseService.getLedger();
  console.log('Ledger items count:', ledger.length);
  const cbRows = ledger.filter((l) => l.category === 'CashBook');
  assert.strictEqual(cbRows.length, 2, 'Ledger must contain 2 CashBook rows');

  const rowLabour = cbRows.find((r) => r.head === 'Mall');
  const rowSale = cbRows.find((r) => r.head === 'Sale');
  assert(rowLabour, 'Labour/Mall entry exists');
  assert(rowSale, 'Sale entry exists');
  assert.strictEqual(Number(rowLabour.debit), 5000, 'Labour debit 5,000');
  assert.strictEqual(Number(rowLabour.credit), 0, 'Labour credit 0');
  assert.strictEqual(Number(rowSale.debit), 0, 'Sale debit 0');
  assert.strictEqual(Number(rowSale.credit), 20000, 'Sale credit 20,000');
  console.log('✓ Mall Ledger correctly contains both Cash Book rows with heads');

  // 6. Verify Cash Book entries in DB have accountName preserved
  const allCbEntries = await db.cashBookEntries.toArray();
  const cbDbEntries = allCbEntries.filter((e) => Number(e.cashBookNo) === bookNo);
  assert.strictEqual(cbDbEntries.length, 2);
  assert.strictEqual(cbDbEntries[0].accountName, 'Mall A/C - مال کھاتہ');
  assert.strictEqual(cbDbEntries[1].accountName, 'Sale A/C - سیل');
  console.log('✓ Cash book entries correctly preserved accountName in database');

  // 7. Verify Trial Balance & Net P/L calculation
  // Total Assets = Cash (3,441,000)
  // Capital = 3,426,000
  // Payable = 0
  // Net P/L = Assets - Capital - Payable = 3,441,000 - 3,426,000 - 0 = +15,000
  // Gross Profit = Mall Net Balance = 15,000
  // TB Debit: Cash (3,441,000)
  // TB Credit: Capital (3,426,000) + Mall (15,000) = 3,441,000
  const tbCashDr = Number(postCash.balance);
  const tbCapitalCr = Number(initCapital);
  const tbMallCr = Number(postSummary.netBalance);
  const totalTbDebit = tbCashDr;
  const totalTbCredit = tbCapitalCr + tbMallCr;
  assert.strictEqual(totalTbDebit, totalTbCredit, 'Trial Balance Debit must equal Credit');
  console.log(`✓ Trial Balance is perfectly balanced: Dr ${totalTbDebit} == Cr ${totalTbCredit}`);

  const netProfit = totalTbDebit - tbCapitalCr - 0;
  assert.strictEqual(netProfit, 15000, 'Net Profit must be 15,000');
  const grossProfit = postSummary.netBalance;
  assert.strictEqual(Math.abs(netProfit - grossProfit), 0, 'Net Profit equals Gross profit when balanced');
  console.log('✓ Net Profit (Assets - Capital - Payable) is 15,000, matching Gross Profit');

  // 8. Verify Cash Book Deletion
  console.log('Deleting Cash Book...');
  await cashBookService.deleteBook(bookNo);

  const delAccounts = await db.accounts.toArray();
  const delCash = delAccounts.find((a) => a.name.toLowerCase().includes('cash'));
  assert.strictEqual(Number(delCash.balance), 3426000, 'Cash balance must return to 3,426,000 after deletion');

  const delSummary = await salePurchaseService.getSummary();
  assert.strictEqual(Number(delSummary.netBalance), 0, 'Mall balance must return to 0 after deletion');

  const delLedger = await salePurchaseService.getLedger();
  assert.strictEqual(delLedger.length, 0, 'Ledger must have 0 rows after deletion');
  console.log('✓ Cash and Mall balances perfectly restored after Cash Book deletion');

  console.log('ALL CASH BOOK MALL A/C AND NET P/L TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
