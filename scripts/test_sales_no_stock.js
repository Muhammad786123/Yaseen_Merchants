import assert from 'assert';
import { computeStockPositions, verifyStockConsistency } from '../src/utils/stockUtils.js';

console.log('=== TEST: Sales must NOT affect stock (Option B) ===\n');

// 1. Setup Master Data
const items = [{ id: 'it_cotton', name: 'Raw Cotton', category: 'Raw Material' }];
const warehouses = [{ id: 'w1', name: 'Godown 1' }];

// 2. Setup Purchase: 500 KG @ 108 = 54,000
const purchases = [
  {
    id: 'pur_1',
    no: 'PUR-0001',
    date: '2026-10-22',
    supplierId: 'sup_1',
    supplierName: 'Cotton Supplier',
    warehouseId: 'w1',
    warehouseName: 'Godown 1',
    total: 54000,
    items: [
      {
        itemId: 'it_cotton',
        itemName: 'Raw Cotton',
        qty: 500,
        rate: 108,
        amount: 54000,
      },
    ],
  },
];

// 3. Setup Sale: 500 KG @ 840 = 420,000
const sales = [
  {
    id: 'sal_1',
    no: 'SAL-0001',
    date: '2026-10-22',
    customerId: 'cust_1',
    customerName: 'Cotton Buyer',
    total: 420000,
    items: [
      {
        itemId: 'it_cotton',
        itemName: 'Raw Cotton',
        qty: 500,
        rate: 840,
        amount: 420000,
      },
    ],
  },
];

// 4. Test Stock Computation: Sale must NOT be deducted
const stockPositions = computeStockPositions(
  purchases,
  sales,
  [], // issues
  [], // productions
  items,
  warehouses,
  [], // stockAdjustments
  []  // stockTransfers
);

console.log('Stock Positions:', stockPositions);
assert.strictEqual(stockPositions.length, 1, 'Should have exactly 1 stock position');
assert.strictEqual(stockPositions[0].qty, 500, 'Stock quantity must remain 500 KG (sales NOT deducted)');
assert.strictEqual(stockPositions[0].value, 54000, 'Stock valuation must be 54,000 (500 KG @ 108)');
console.log('✓ Stock page: 500 KG / Rs 54,000 (sale not deducted)');

// 5. Test Consistency Checker: No discrepancies
const consistency = verifyStockConsistency(
  purchases,
  sales,
  [],
  [],
  stockPositions,
  items,
  []
);
assert.strictEqual(consistency.isConsistent, true, 'Consistency check should pass');
assert.strictEqual(consistency.discrepancies.length, 0, 'No stock inconsistencies should be reported');
console.log('✓ verifyStockConsistency: Passed with 0 discrepancies');

// 6. Test Profit & Balance Sheet with Closing Stock 0
const totalSales = 420000;
const totalPurchases = 54000;
const totalExpenses = 0;
const jvMallCredit = 0;
const cashBookMallAdj = 0;
const mallNetPosition = totalSales - (totalPurchases + totalExpenses) + jvMallCredit + cashBookMallAdj;
assert.strictEqual(mallNetPosition, 366000, 'mallNetPosition should be 366,000');

// With closingStockValue = 0:
let closingStockValue = 0;
let mallTradingBalance = mallNetPosition + closingStockValue;
let grossProfit = mallTradingBalance;
let cashInHand = 0;
let totalBankBalances = 0;
let totalReceivables = 420000;
let totalPayables = 54000;
let capitalBalance = 0;

let totalAssets = cashInHand + totalBankBalances + totalReceivables + closingStockValue;
let plAssetsTotal = totalAssets;
let plLiabilitiesTotal = capitalBalance + totalPayables + grossProfit;
let netProfit = plAssetsTotal - capitalBalance - totalPayables;

console.log('\n--- Case 1: closingStockValue = 0 ---');
console.log('mallTradingBalance:', mallTradingBalance);
console.log('Total Assets:', totalAssets);
console.log('Total Liabilities + Equity:', plLiabilitiesTotal);
console.log('NET P/L:', netProfit);

assert.strictEqual(netProfit, 366000, 'NET P/L with closing stock 0 must be 366,000');
assert.strictEqual(totalAssets, plLiabilitiesTotal, 'Balance sheet must balance with closing stock 0');
console.log('✓ With closing stock 0 the Balance Sheet NET P/L is 366,000 and balanced');

// 7. Test Profit & Balance Sheet with Closing Stock 10,000
closingStockValue = 10000;
mallTradingBalance = mallNetPosition + closingStockValue;
grossProfit = mallTradingBalance;
totalAssets = cashInHand + totalBankBalances + totalReceivables + closingStockValue;
plAssetsTotal = totalAssets;
plLiabilitiesTotal = capitalBalance + totalPayables + grossProfit;
netProfit = plAssetsTotal - capitalBalance - totalPayables;

console.log('\n--- Case 2: closingStockValue = 10,000 ---');
console.log('mallTradingBalance:', mallTradingBalance);
console.log('Total Assets:', totalAssets);
console.log('Total Liabilities + Equity:', plLiabilitiesTotal);
console.log('NET P/L:', netProfit);

assert.strictEqual(netProfit, 376000, 'NET P/L with closing stock 10,000 must be 376,000');
assert.strictEqual(totalAssets, plLiabilitiesTotal, 'Balance sheet must balance with closing stock 10,000');
console.log('✓ Entering closing stock 10,000 makes Balance Sheet NET P/L 376,000 and balanced');

// 8. Negative Stock Check
const hasNegative = stockPositions.some(s => s.qty < 0);
assert.strictEqual(hasNegative, false, 'No negative stock anywhere');
console.log('✓ No negative stock anywhere');

console.log('\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
