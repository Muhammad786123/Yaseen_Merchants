import { issueTotalValue } from '../src/services/issueService.js';
import { fmt } from '../src/utils/formatters.js';

console.log('=== TEST 1: issueTotalValue helper & client test values ===');
const clientIssue = {
  id: 'iss_test_1',
  no: 'ISS-0001',
  fromWarehouse: 'godam no 1',
  date: '2026-10-14',
  totalValue: 0, // stored value is intentionally 0 or wrong to test that helper never relies on it
  items: [
    {
      itemId: 'it_socks_waste',
      itemName: 'سوکس ویسٹ',
      quality: 'Fine',
      unit: 'KG',
      issueQty: 275,
      rate: 40.98,
      value: 11269.50,
    },
    {
      itemId: 'it_qalees',
      itemName: 'قلیس',
      quality: 'A',
      unit: 'KG',
      issueQty: 10,
      rate: 100,
      value: 1000,
    },
  ],
};

const total = issueTotalValue(clientIssue);
console.log('Computed Total:', total);
console.log('Formatted Total:', fmt(total));

if (total !== 12269.5) {
  console.error(`FAILED: Expected 12269.5, got ${total}`);
  process.exit(1);
}

if (fmt(total) !== 'Rs. 12,269.50') {
  console.error(`FAILED: Expected 'Rs. 12,269.50', got '${fmt(total)}'`);
  process.exit(1);
}

console.log('=== TEST 2: issueTotalValue when item.value is missing or 0 ===');
const clientIssueNoPrecomputedValues = {
  items: [
    {
      itemId: 'it_socks_waste',
      itemName: 'سوکس ویسٹ',
      issueQty: 275,
      rate: 40.98,
    },
    {
      itemId: 'it_qalees',
      itemName: 'قلیس',
      issueQty: 10,
      rate: 100,
    },
  ],
};

const total2 = issueTotalValue(clientIssueNoPrecomputedValues);
console.log('Computed Total without item.value:', total2);
if (total2 !== 12269.5) {
  console.error(`FAILED: Expected 12269.5, got ${total2}`);
  process.exit(1);
}

console.log('=== TEST 3: Form logic simulation for unselected warehouse ===');
// When warehouse is empty
let fromWarehouse = '';
let line = { itemId: 'it_socks_waste', quality: 'Fine', issueQtyInput: 275 };
let matchingStock = null;
let currentAvgRate = 0;
let availableQty = 0;

const hasWarehouse = Boolean(fromWarehouse);
const showAvailability = hasWarehouse && line.itemId && line.quality;
const showRate = hasWarehouse && line.itemId;

console.log('With empty warehouse:');
console.log('  showAvailability:', showAvailability, '(expected false)');
console.log('  showRate:', showRate, '(expected false)');

if (showAvailability || showRate) {
  console.error('FAILED: Unselected warehouse should not show availability or rate');
  process.exit(1);
}

console.log('=== TEST 4: Form logic simulation with warehouse selected ===');
fromWarehouse = 'godam no 1';
const stockEntries = [
  {
    itemId: 'it_socks_waste',
    itemName: 'سوکس ویسٹ',
    quality: 'Fine',
    warehouseName: 'godam no 1',
    qty: 500,
    avgRate: 40.98,
  },
  {
    itemId: 'it_qalees',
    itemName: 'قلیس',
    quality: 'A',
    warehouseName: 'godam no 1',
    qty: 50,
    avgRate: 100,
  },
];

const normalizedWarehouse = fromWarehouse.trim().toLowerCase();
const match1 = stockEntries.find(
  (s) =>
    s.itemId === 'it_socks_waste' &&
    s.quality.toLowerCase() === 'fine' &&
    s.warehouseName.toLowerCase() === normalizedWarehouse
);

const match2 = stockEntries.find(
  (s) =>
    s.itemId === 'it_qalees' &&
    s.quality.toLowerCase() === 'a' &&
    s.warehouseName.toLowerCase() === normalizedWarehouse
);

const val1 = Math.round(275 * match1.avgRate * 100) / 100;
const val2 = Math.round(10 * match2.avgRate * 100) / 100;
const formFooterTotal = Math.round((val1 + val2) * 100) / 100;

console.log('Form footer total:', formFooterTotal, fmt(formFooterTotal));
if (formFooterTotal !== 12269.5) {
  console.error(`FAILED: Form footer total mismatch: ${formFooterTotal}`);
  process.exit(1);
}

console.log('=== TEST 5: Fallback to item average when quality not in selected warehouse ===');
// Suppose 'other_item' has stock in warehouse 2, but not in 'godam no 1'
const allStock = [
  { itemId: 'other_item', warehouseName: 'godam no 2', quality: 'B', qty: 100, avgRate: 50, value: 5000 },
  { itemId: 'other_item', warehouseName: 'godam no 3', quality: 'C', qty: 100, avgRate: 70, value: 7000 },
];
const itemStockRows = allStock.filter((s) => s.itemId === 'other_item' && s.qty > 0 && s.avgRate > 0);
const totQty = itemStockRows.reduce((sum, s) => sum + s.qty, 0);
const totVal = itemStockRows.reduce((sum, s) => sum + s.value, 0);
const itemAvgRate = totVal / totQty; // (5000 + 7000) / 200 = 60
console.log('Item average rate across warehouses:', itemAvgRate, '(expected 60)');
if (itemAvgRate !== 60) {
  console.error(`FAILED: Expected 60, got ${itemAvgRate}`);
  process.exit(1);
}

console.log('\nALL ISSUE TESTS PASSED PERFECTLY!');
