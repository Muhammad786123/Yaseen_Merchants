import 'fake-indexeddb/auto';
import assert from 'assert';
import { db, clearAllDatabaseData } from '../src/db/database.js';
import { saleService } from '../src/services/saleService.js';
import { purchaseService } from '../src/services/purchaseService.js';
import { cashBookService } from '../src/services/cashBookService.js';
import { cashService, calculateCashBalanceFromEntries } from '../src/services/cashService.js';
import { partyService } from '../src/services/partyService.js';

async function runTests() {
  console.log('=== Starting Cash Book & Bank Visibility of Sale/Purchase Receipts Test ===\n');
  await clearAllDatabaseData();

  const today = '2026-10-22';

  // 1. Setup Cash account with initial balance 1,000
  await db.accounts.add({
    id: 'acc_cash',
    code: '1001',
    name: 'Cash',
    type: 'Cash',
    balance: 1000,
    openingBalance: 1000,
  });

  // Setup Bank account
  await db.accounts.add({
    id: 'acc_bank_meezan',
    code: '99101',
    name: 'Meezan Bank - Current',
    bankName: 'Meezan Bank',
    accountTitle: 'Current',
    type: 'Bank',
    balance: 50000,
    openingBalance: 50000,
  });

  // Setup Customer Lala
  const lalaId = 'party_lala';
  await db.parties.add({
    id: lalaId,
    code: '1002',
    name: 'Lala',
    type: 'Customer',
    balance: 0,
    openingBalance: 0,
  });

  // Setup Supplier Khan
  const khanId = 'party_khan';
  await db.parties.add({
    id: khanId,
    code: '1003',
    name: 'Khan',
    type: 'Supplier',
    balance: 0,
    openingBalance: 0,
  });

  // Verify Initial State
  let cashAcc = await db.accounts.get('acc_cash');
  assert.strictEqual(Number(cashAcc.balance), 1000, 'Initial cash should be 1,000');
  console.log('Step 1 PASSED: Initial cash is 1,000');

  // 2. Create a sale of 10,000 to Lala with received 0
  const sale1 = await saleService.add({
    date: today,
    customerId: lalaId,
    customerName: 'Lala',
    items: [
      { itemName: 'Raw Cotton', count: 10, quantity: 100, rate: 100, amount: 10000, unitType: 'KG' },
    ],
    total: 10000,
    received: 0,
    receivedAccount: 'Cash',
  });

  console.log('Created sale:', sale1.no);
  assert.strictEqual(sale1.no, 'SAL-0001');

  // Lala balance: -10,000 (debtor / Benaam: negative in this system, Dr/بنام)
  let lala = await db.parties.get(lalaId);
  assert.strictEqual(Number(lala.balance), -10000, 'Lala balance should be -10,000 (10,000 Benaam)');

  // Cash unchanged at 1,000
  cashAcc = await db.accounts.get('acc_cash');
  assert.strictEqual(Number(cashAcc.balance), 1000, 'Cash should still be 1,000');

  // 3. Edit sale: set Amount Received = 100, Received Into Account = 'Cash Book' (or 'Cash')
  const updatedSale = await saleService.update(sale1.id, {
    date: today,
    customerId: lalaId,
    customerName: 'Lala',
    items: sale1.items,
    total: 10000,
    received: 100,
    receivedAccount: 'Cash Book',
  });

  // Lala ledger shows 100 Jama -> balance is -10,000 + 100 = -9,900 Benaam
  lala = await db.parties.get(lalaId);
  assert.strictEqual(Number(lala.balance), -9900, 'Lala balance should be -9,900 (9,900 Benaam)');
  console.log('Step 2 PASSED: Lala balance after 100 received is 9,900 Benaam (-9900)');

  // Cash account balance is 1,100
  cashAcc = await db.accounts.get('acc_cash');
  assert.strictEqual(Number(cashAcc.balance), 1100, 'Dashboard/Account cash should be 1,100');

  // 4. Test Cash Book retrieval for that date
  const dayBook = await cashBookService.getDayBook(today);
  assert.strictEqual(dayBook.systemEntries.length, 1, 'Should find 1 system entry in Day Book');
  const sysEntry = dayBook.systemEntries[0];
  assert.strictEqual(sysEntry.partyName, 'Lala');
  assert.strictEqual(Number(sysEntry.credit), 100, 'System entry credit (Jama) should be 100');
  assert.strictEqual(Number(sysEntry.debit), 0, 'System entry debit (Benaam) should be 0');
  assert.strictEqual(sysEntry.sourceVoucher, 'SAL-0001');

  // Calculate Cash Book balances
  const allEntries = await db.cashBookEntries.toArray();
  const allAccounts = await db.accounts.toArray();
  const previousCashBalance = calculateCashBalanceFromEntries(allEntries, allAccounts, {
    beforeDate: today,
  });
  assert.strictEqual(previousCashBalance, 1000, 'Previous cash balance before date should be 1,000');

  const totalCredit = dayBook.systemEntries.reduce((s, e) => s + Number(e.credit || 0), 0);
  const totalDebit = dayBook.systemEntries.reduce((s, e) => s + Number(e.debit || 0), 0);
  const currentClosingBalance = previousCashBalance + totalCredit - totalDebit;

  assert.strictEqual(totalCredit, 100, 'Total credit should be 100');
  assert.strictEqual(totalDebit, 0, 'Total debit should be 0');
  assert.strictEqual(currentClosingBalance, 1100, 'Closing balance should be 1,100');
  assert.strictEqual(currentClosingBalance, Number(cashAcc.balance), 'Closing balance MUST equal Dashboard cash');
  console.log('Step 3 PASSED: Cash Book shows row SAL-0001 Lala 100, closing balance = 1,100 (matches Dashboard cash)');

  // 5. Change amount to 50
  await saleService.update(sale1.id, {
    date: today,
    customerId: lalaId,
    customerName: 'Lala',
    items: sale1.items,
    total: 10000,
    received: 50,
    receivedAccount: 'Cash',
  });

  lala = await db.parties.get(lalaId);
  assert.strictEqual(Number(lala.balance), -9950, 'Lala balance should be -9,950 (9,950 Benaam)');

  cashAcc = await db.accounts.get('acc_cash');
  assert.strictEqual(Number(cashAcc.balance), 1050, 'Cash should be 1,050');

  const dayBook50 = await cashBookService.getDayBook(today);
  assert.strictEqual(dayBook50.systemEntries.length, 1);
  assert.strictEqual(Number(dayBook50.systemEntries[0].credit), 50, 'Row credit should change to 50');

  const allEntries50 = await db.cashBookEntries.toArray();
  const totalCredit50 = dayBook50.systemEntries.reduce((s, e) => s + Number(e.credit || 0), 0);
  const closing50 = previousCashBalance + totalCredit50;
  assert.strictEqual(closing50, 1050, 'Closing balance should be 1,050');
  assert.strictEqual(closing50, Number(cashAcc.balance), 'Closing balance matches Dashboard cash (1,050)');
  console.log('Step 4 PASSED: Changing received to 50 updates row to 50 and closing balance to 1,050');

  // 6. Delete the sale: row disappears and cash returns to 1,000
  await saleService.delete(sale1.id);

  cashAcc = await db.accounts.get('acc_cash');
  assert.strictEqual(Number(cashAcc.balance), 1000, 'Cash should return to 1,000');

  const dayBookDeleted = await cashBookService.getDayBook(today);
  assert.strictEqual(dayBookDeleted.systemEntries.length, 0, 'System entry should disappear on sale delete');

  const allEntriesDeleted = await db.cashBookEntries.toArray();
  const totalCreditDeleted = dayBookDeleted.systemEntries.reduce((s, e) => s + Number(e.credit || 0), 0);
  const closingDeleted = previousCashBalance + totalCreditDeleted;
  assert.strictEqual(closingDeleted, 1000, 'Closing balance returns to 1,000');
  assert.strictEqual(closingDeleted, Number(cashAcc.balance), 'Closing balance matches Dashboard cash (1,000)');
  console.log('Step 5 PASSED: Deleting sale removes row and restores cash to 1,000');

  // 7. Test Purchase with Cash payment
  const pur1 = await purchaseService.add({
    date: today,
    supplierId: khanId,
    supplierName: 'Khan',
    warehouseId: 'wh_1',
    warehouseName: 'Main Warehouse',
    items: [
      { itemName: 'Raw Cotton', count: 5, quantity: 50, rate: 100, amount: 5000, unitType: 'KG' },
    ],
    total: 5000,
    paid: 300,
    paymentAccount: 'Cash Book',
  });

  cashAcc = await db.accounts.get('acc_cash');
  assert.strictEqual(Number(cashAcc.balance), 700, 'Cash should reduce by 300 to 700');

  const dayBookPur = await cashBookService.getDayBook(today);
  assert.strictEqual(dayBookPur.systemEntries.length, 1);
  const purEntry = dayBookPur.systemEntries[0];
  assert.strictEqual(purEntry.partyName, 'Khan');
  assert.strictEqual(Number(purEntry.debit), 300, 'Purchase payment should be 300 Benaam (Debit)');
  assert.strictEqual(Number(purEntry.credit), 0);
  assert.strictEqual(purEntry.sourceVoucher, 'PUR-0001');

  const closingPur = previousCashBalance + 0 - 300;
  assert.strictEqual(closingPur, 700);
  assert.strictEqual(closingPur, Number(cashAcc.balance));
  console.log('Step 6 PASSED: Purchase cash payment shows as 300 Benaam, closing balance = 700');

  // 8. Test Bank Account receipt from Sale
  const bankSale = await saleService.add({
    date: today,
    customerId: lalaId,
    customerName: 'Lala',
    items: [
      { itemName: 'Raw Cotton', count: 2, quantity: 20, rate: 100, amount: 2000, unitType: 'KG' },
    ],
    total: 2000,
    received: 500,
    receivedAccount: 'Meezan Bank - Current',
  });

  const meezanAcc = await db.accounts.get('acc_bank_meezan');
  assert.strictEqual(Number(meezanAcc.balance), 50500, 'Meezan Bank balance should increase by 500 to 50,500');

  const bankReceipt = (await db.receipts.toArray()).find((r) => r.sourceVoucher === bankSale.no);
  assert.ok(bankReceipt, 'Bank receipt should exist');
  assert.strictEqual(Number(bankReceipt.amount), 500);
  assert.strictEqual(bankReceipt.sourceVoucher, bankSale.no);
  console.log('Step 7 PASSED: Sale received into Bank creates linked receipt with source voucher and updates bank balance');

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
