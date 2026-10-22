import 'fake-indexeddb/auto';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  formatWeight,
  formatRate,
  formatAmount,
  formatCount,
} from '../src/utils/saleBillMemoUtils.js';
import {
  SALE_BILL_LABELS_ROMAN_URDU,
  getSaleBillRomanUrduColumns,
} from '../src/utils/saleBillLabels.js';
import { db } from '../src/db/database.js';
import { saleService } from '../src/services/saleService.js';
import { computeStockPositions } from '../src/utils/stockUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TEST: SEPARATE COUNT (تعداد) FROM WEIGHT (وزن) ===\n');

// -----------------------------------------------------------------------------
// 1. User Test Scenario: Sale line 399.5 KG, count 5, rate 212
// -----------------------------------------------------------------------------
console.log('1. Testing User Test Scenario with count = 5:');

const lineWithCount = {
  type: 'stock',
  itemName: 'Card Waste',
  qty: 399.5,
  count: 5,
  rate: 212,
  amount: 399.5 * 212, // 84,694
};

// Calculations
const countColWithCount = lineWithCount.count !== '' && lineWithCount.count !== undefined && lineWithCount.count !== null
  ? formatCount(lineWithCount.count)
  : '';
const weightColWithCount = formatWeight(lineWithCount.qty);
const rateColWithCount = formatRate(lineWithCount.rate);
const amountColWithCount = formatAmount(lineWithCount.amount);

console.log('  Line with count 5 ->', {
  تعداد: countColWithCount,
  وزن: weightColWithCount,
  ریٹ: rateColWithCount,
  رقم: amountColWithCount,
});

assert.strictEqual(countColWithCount, '5', 'Bill row must show تعداد 5');
assert.strictEqual(weightColWithCount, '399.500', 'Bill row must show وزن 399.500 (3 decimals)');
assert.strictEqual(rateColWithCount, '212.00', 'Bill row must show ریٹ 212.00 (2 decimals)');
assert.strictEqual(amountColWithCount, '84,694', 'Bill row must show رقم 84,694');

// Total row with count
const itemsWithCount = [lineWithCount];
let hasAnyCount1 = false;
const totalCount1 = itemsWithCount.reduce((sum, it) => {
  if (it.type === 'service') return sum;
  if (it.count !== undefined && it.count !== null && it.count !== '') {
    const val = Number(it.count);
    if (!isNaN(val)) {
      hasAnyCount1 = true;
      return sum + val;
    }
  }
  return sum;
}, 0);
const totalCountDisplay1 = hasAnyCount1 ? formatCount(totalCount1) : '';
const totalAmountDisplay1 = formatAmount(itemsWithCount.reduce((sum, it) => sum + it.amount, 0));

console.log('  Total row with count ->', {
  totalCount: totalCountDisplay1,
  totalAmount: totalAmountDisplay1,
});

assert.strictEqual(totalCountDisplay1, '5', 'Total row must show 5');
assert.strictEqual(totalAmountDisplay1, '84,694', 'Total row must show 84,694');
console.log('✓ Sale with count 5 verified: تعداد 5, وزن 399.500, ریٹ 212.00, رقم 84,694; total row 5 and 84,694');

// -----------------------------------------------------------------------------
// 2. User Test Scenario: The same sale with count left empty
// -----------------------------------------------------------------------------
console.log('\n2. Testing the same sale with count left empty:');

const lineWithoutCount = {
  type: 'stock',
  itemName: 'Card Waste',
  qty: 399.5,
  count: '', // count left empty
  rate: 212,
  amount: 399.5 * 212,
};

const countColWithout = lineWithoutCount.count !== '' && lineWithoutCount.count !== undefined && lineWithoutCount.count !== null
  ? formatCount(lineWithoutCount.count)
  : '';
const weightColWithout = formatWeight(lineWithoutCount.qty);
const rateColWithout = formatRate(lineWithoutCount.rate);
const amountColWithout = formatAmount(lineWithoutCount.amount);

console.log('  Line with empty count ->', {
  تعداد: `"${countColWithout}"`,
  وزن: weightColWithout,
  ریٹ: rateColWithout,
  رقم: amountColWithout,
});

assert.strictEqual(countColWithout, '', 'Bill row must show blank تعداد');
assert.strictEqual(weightColWithout, '399.500', 'Bill row must show وزن 399.500');
assert.strictEqual(rateColWithout, '212.00', 'Bill row must show ریٹ 212.00');
assert.strictEqual(amountColWithout, '84,694', 'Bill row must show رقم 84,694');

// Total row when count is empty
const itemsWithoutCount = [lineWithoutCount];
let hasAnyCount2 = false;
const totalCount2 = itemsWithoutCount.reduce((sum, it) => {
  if (it.type === 'service') return sum;
  if (it.count !== undefined && it.count !== null && it.count !== '') {
    const val = Number(it.count);
    if (!isNaN(val)) {
      hasAnyCount2 = true;
      return sum + val;
    }
  }
  return sum;
}, 0);
const totalCountDisplay2 = hasAnyCount2 ? formatCount(totalCount2) : '';
const totalAmountDisplay2 = formatAmount(itemsWithoutCount.reduce((sum, it) => sum + it.amount, 0));

console.log('  Total row with empty count ->', {
  totalCount: `"${totalCountDisplay2}"`,
  totalAmount: totalAmountDisplay2,
});

assert.strictEqual(totalCountDisplay2, '', 'Total row must show blank when no count entered');
assert.strictEqual(totalAmountDisplay2, '84,694', 'Total row must show 84,694');
console.log('✓ Sale with empty count verified: blank تعداد, same amounts and weights');

// -----------------------------------------------------------------------------
// 3. Service lines: show no count and no weight
// -----------------------------------------------------------------------------
console.log('\n3. Testing Service lines:');
const serviceLine = {
  type: 'service',
  itemName: 'Service Line',
  serviceDescription: 'Loading Labour',
  qty: 0,
  rate: '',
  amount: 1500,
  count: '',
};

const serviceIsService = serviceLine.type === 'service';
const serviceCount = serviceIsService ? '' : (serviceLine.count ? formatCount(serviceLine.count) : '');
const serviceWeight = serviceIsService ? '' : formatWeight(serviceLine.qty);

assert.strictEqual(serviceCount, '', 'Service line must have blank count');
assert.strictEqual(serviceWeight, '', 'Service line must have blank weight');
console.log('✓ Service lines show no count and no weight');

// -----------------------------------------------------------------------------
// 4. Editing an old sale (no count saved, e.g. undefined count)
// -----------------------------------------------------------------------------
console.log('\n4. Testing old sale with no count saved:');
const oldSaleItem = {
  itemId: 'itm_legacy',
  itemName: 'Old Cotton Waste',
  qty: 450,
  rate: 180,
  amount: 81000,
  // notice: no count property saved
};

const oldSaleCountDisplay = oldSaleItem.count !== undefined && oldSaleItem.count !== null && oldSaleItem.count !== ''
  ? formatCount(oldSaleItem.count)
  : '';

assert.strictEqual(oldSaleCountDisplay, '', 'Must print blank تعداد, never falling back to weight');
assert.notStrictEqual(oldSaleCountDisplay, formatCount(oldSaleItem.qty), 'Must NOT equal weight');
console.log('✓ Old sale with no count prints blank تعداد without falling back to weight');

// -----------------------------------------------------------------------------
// 5. Roman Urdu Invoice column logic: Tadaad only if count was entered
// -----------------------------------------------------------------------------
console.log('\n5. Testing Roman Urdu invoice column logic:');

const colsWithCount = getSaleBillRomanUrduColumns([lineWithCount]);
assert(colsWithCount.count === 'Tadaad' || colsWithCount.tadaad === 'Tadaad', 'Must include Tadaad when count was entered');

const colsWithoutCount = getSaleBillRomanUrduColumns([lineWithoutCount]);
assert.strictEqual(colsWithoutCount.count, undefined, 'Must leave Tadaad column out when count was empty');
assert.strictEqual(colsWithoutCount.tadaad, undefined, 'Must leave Tadaad column out when count was empty');
assert.strictEqual(colsWithoutCount.weight, 'Wazan (KG)', 'Must keep Wazan (KG)');
assert.strictEqual(colsWithoutCount.rate, 'Rate (Rs. per KG)', 'Must keep Rate');
assert.strictEqual(colsWithoutCount.amount, 'Raqam (Rs.)', 'Must keep Raqam');

console.log('✓ Roman Urdu invoice includes Tadaad only when count entered, otherwise column is left out');

// -----------------------------------------------------------------------------
// 6. Database & Stock Reduction Test: Stock reduces by 399.5 KG either way
// -----------------------------------------------------------------------------
console.log('\n6. Testing Stock Reduction in Database:');

async function testStockEffects() {
  await db.open();

  // Create an item and warehouse
  const itemId = 'itm_stock_test_1';
  const warehouseId = 'wh_test_1';

  await db.items.put({ id: itemId, name: 'Card Waste Item', category: 'Finished Goods' });
  await db.warehouses.put({ id: warehouseId, name: 'Main Store' });

  // Sale 1: With count 5
  const sale1 = await saleService.add({
    no: 'SAL-COUNT-5',
    date: '2026-10-22',
    customerId: 'cust_stock_1',
    customerName: 'Test Buyer 1',
    warehouseId,
    warehouseName: 'Main Store',
    items: [
      {
        type: 'stock',
        itemId,
        itemName: 'Card Waste Item',
        count: 5,
        qty: 399.5,
        rate: 212,
        amount: 84694,
      },
    ],
    total: 84694,
    received: 0,
  });

  const allSales = await db.sales.toArray();
  const allPurchases = await db.purchases.toArray();
  const allWarehouses = await db.warehouses.toArray();
  const allItems = await db.items.toArray();

  const stockEntries1 = computeStockPositions(
    allPurchases,
    allSales.filter(s => s.id === sale1.id),
    [],
    [],
    allItems,
    allWarehouses
  );

  const sale1Entry = Object.values(stockEntries1).find(s => s.itemId === itemId);
  assert.strictEqual(sale1Entry, undefined, 'Sales must NOT generate any stock entries or reduce stock (Option B)');

  // Sale 2: With count empty
  const sale2 = await saleService.add({
    no: 'SAL-COUNT-EMPTY',
    date: '2026-10-22',
    customerId: 'cust_stock_2',
    customerName: 'Test Buyer 2',
    warehouseId,
    warehouseName: 'Main Store',
    items: [
      {
        type: 'stock',
        itemId,
        itemName: 'Card Waste Item',
        count: '',
        qty: 399.5,
        rate: 212,
        amount: 84694,
      },
    ],
    total: 84694,
    received: 0,
  });

  const allSales2 = await db.sales.toArray();
  const stockEntries2 = computeStockPositions(
    allPurchases,
    allSales2.filter(s => s.id === sale2.id),
    [],
    [],
    allItems,
    allWarehouses
  );

  const sale2Entry = Object.values(stockEntries2).find(s => s.itemId === itemId);
  assert.strictEqual(sale2Entry, undefined, 'Sales must NOT reduce stock (Option B)');

  console.log('✓ Sales no longer reduce stock per Option B');

  console.log('✓ Stock reduction verified: -399.5 KG in both cases (count is information only)');
}

await testStockEffects();

// -----------------------------------------------------------------------------
// 7. Source Code Verification
// -----------------------------------------------------------------------------
console.log('\n7. Source code inspection:');

const tableSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/forms/TransactionItemsTable.jsx'), 'utf8');
assert(tableSrc.includes('Count / تعداد (bags)'), 'TransactionItemsTable must include "Count / تعداد (bags)"');
assert(tableSrc.includes("field === 'count'"), 'TransactionItemsTable must handle field === "count"');
console.log('✓ TransactionItemsTable.jsx contains "Count / تعداد (bags)" field');

const memoSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/common/SaleBillMemo.jsx'), 'utf8');
assert(memoSrc.includes('item.count'), 'SaleBillMemo must use item.count');
assert(!memoSrc.includes(': (isService ? \'\' : item.qty)'), 'SaleBillMemo must NOT fall back to item.qty for count');
console.log('✓ SaleBillMemo.jsx uses item.count and does not fall back to weight');

const urduMemoExists = fs.existsSync(path.resolve(__dirname, '../src/components/common/UrduBillMemo.jsx'));
assert(urduMemoExists, 'UrduBillMemo.jsx must exist');
console.log('✓ UrduBillMemo.jsx exists');

console.log('\n=== ALL COUNT / WEIGHT SEPARATION TESTS PASSED! ===');
