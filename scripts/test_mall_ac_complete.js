import 'fake-indexeddb/auto';
import assert from 'assert';
import { db, clearAllDatabaseData } from '../src/db/database.js';
import { journalService } from '../src/services/journalService.js';
import { purchaseService } from '../src/services/purchaseService.js';
import { saleService } from '../src/services/saleService.js';
import { expenseService } from '../src/services/expenseService.js';
import { salePurchaseService } from '../src/services/salePurchaseService.js';

async function runTest() {
  console.log('--- Testing Mall A/C (Sale Purchase Ledger) & Trial Balance Reconciliation ---');
  await clearAllDatabaseData();

  // 1. Setup Parties and Items
  const sup1 = { id: 'sup_1', code: '1001', name: 'Al-Madina Cotton Mill', type: 'Supplier', balance: 0 };
  const cust1 = { id: 'cust_1', code: '2001', name: 'Crescent Weaving Corp', type: 'Customer', balance: 0 };
  await db.parties.bulkAdd([sup1, cust1]);

  const item1 = { id: 'item_1', name: 'Comber Noil', type: 'Raw Material' };
  await db.items.add(item1);

  // 2. Client data: Opening JV 237,000 Mall A/C
  // JV lines:
  // Mall A/C Debit 237,000
  // Capital Credit 237,000
  console.log('1. Adding Opening JV 237,000 Mall A/C...');
  const jv = await journalService.add({
    date: '2026-10-09',
    narration: 'Opening adjustment voucher',
    lines: [
      { accountType: 'mall', accountId: 'mall', accountName: 'Mall A/C (Goods / Raw Material Inventory)', detail: 'Opening Stock Mall Debit', debit: 237000, credit: 0 },
      { accountType: 'capital', accountId: 'capital', accountName: 'Capital Account', detail: 'Capital Credit', debit: 0, credit: 237000 },
    ],
  });

  // 3. Client data: Sale 500 KG @ 60 = 30,000
  console.log('2. Adding Sale 500 KG @ 60 = 30,000...');
  const sale = await saleService.add({
    date: '2026-10-10',
    customerId: cust1.id,
    customerName: cust1.name,
    items: [{ itemId: item1.id, itemName: item1.name, quantity: 10, weight: 500, rate: 60, total: 30000 }],
    total: 30000,
    paid: 0,
  });

  // 4. Client data: Purchase 1,000 KG @ 50 = 50,000
  console.log('3. Adding Purchase 1,000 KG @ 50 = 50,000...');
  const purchase = await purchaseService.add({
    date: '2026-10-11',
    supplierId: sup1.id,
    supplierName: sup1.name,
    items: [{ itemId: item1.id, itemName: item1.name, quantity: 20, weight: 1000, rate: 50, total: 50000 }],
    total: 50000,
    paid: 0,
  });

  // 5. Client data: Expense 5,000
  console.log('4. Adding Expense 5,000...');
  const exp = await expenseService.add({
    date: '2026-10-12',
    category: 'Factory Rent',
    amount: 5000,
    description: 'Factory rent October',
  });

  // Calculate Trial Balance mallNetPosition formula:
  // mallNetPosition = totalSales - (totalPurchases + totalExpenses) + jvMallCredit + cashBookMallAdj
  const purchases = await db.purchases.toArray();
  const sales = await db.sales.toArray();
  const expenses = await db.expenses.toArray();
  const journalEntries = await db.journalEntries.toArray();
  const rawCashBook = await db.cashBookEntries.toArray();

  const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.total || 0), 0);
  const totalSales = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const jvMallCredit = journalEntries
    .flatMap((j) => j.lines || [])
    .filter((l) => l.accountType === 'mall' || l.accountType === 'expense')
    .reduce((s, l) => s + Number(l.credit || 0) - Number(l.debit || 0), 0);
  const cashBookMallAdj = rawCashBook
    .filter((e) => e.accountType === 'mall')
    .reduce((s, e) => s + Number(e.credit || 0) - Number(e.debit || 0), 0);

  const mallNetPosition = totalSales - (totalPurchases + totalExpenses) + jvMallCredit + cashBookMallAdj;
  console.log('Trial Balance mallNetPosition:', mallNetPosition);
  // totalSales = 30000
  // totalPurchases = 50000
  // totalExpenses = 5000
  // jvMallCredit = 0 - 237000 = -237000
  // cashBookMallAdj = 0
  // mallNetPosition = 30000 - 55000 - 237000 = -262000 (Debit 262,000 / Benaam)
  assert.strictEqual(mallNetPosition, -262000, 'mallNetPosition should be -262,000');

  // Now check salePurchaseService.getSummary()
  const summary = await salePurchaseService.getSummary();
  console.log('salePurchaseService.getSummary():', summary);
  assert.strictEqual(summary.netBalance, mallNetPosition, 'Mall summary netBalance must equal mallNetPosition');

  // Check ledger entries
  const ledger = await salePurchaseService.getLedger();
  console.log('Ledger row count:', ledger.length);
  assert.strictEqual(ledger.length, 4, 'Must have exactly 4 rows: 1 JV, 1 Sale, 1 Purchase, 1 Expense');

  console.log('>>> ALL RECONCILIATION CHECKS PASSED! <<<');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
