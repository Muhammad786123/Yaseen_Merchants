import { computeStockPositions } from '../src/utils/stockUtils.js';

// Setup test data
// Initially: godam no 1 has 6,125 KG, godam no 2 has 150 KG.
// Total = 6,275 KG, Total value = Rs 262,002.
// In the user's system, let's suppose rate is 41.7533067729 (or purchase amount is exact):
const itemId = 'item-1';
const itemName = 'Cotton Waste';

// Say godam no 1 had 6,125 KG with avgRate 41.75 (or exact amount 255,739)
// and godam no 2 had 150 KG with avgRate 41.75 (amount 6,263) -> total 262,002
// Let's test with purchase 1 @ rate 41.7533067729, amount 255,739
// and purchase 2 @ rate 41.7533067729, amount 6,263
const purchases = [
  {
    date: '2026-10-01',
    no: 'PUR-001',
    warehouseName: 'godam no 1',
    items: [
      { itemId, itemName, qty: 6125, rate: 41.7533067729, amount: 255739 }
    ]
  },
  {
    date: '2026-10-01',
    no: 'PUR-002',
    warehouseName: 'godam no 2',
    items: [
      { itemId, itemName, qty: 150, rate: 41.7533067729, amount: 6263 }
    ]
  }
];

const items = [{ id: itemId, name: itemName, category: 'Raw Material' }];
const warehouses = [
  { id: 'wh-1', name: 'godam no 1' },
  { id: 'wh-2', name: 'godam no 2' }
];

// 1. Without transfer:
const before = computeStockPositions(purchases, [], [], [], items, warehouses, [], []);
console.log('--- BEFORE TRANSFER ---');
const wh1Before = before.find(p => p.warehouseName === 'godam no 1');
const wh2Before = before.find(p => p.warehouseName === 'godam no 2');
const totalQtyBefore = before.reduce((s, p) => s + p.qty, 0);
const totalValBefore = before.reduce((s, p) => s + p.value, 0);

console.log('godam no 1:', wh1Before?.qty, 'KG, rate:', wh1Before?.avgRate, 'Rs.', wh1Before?.value);
console.log('godam no 2:', wh2Before?.qty, 'KG, rate:', wh2Before?.avgRate, 'Rs.', wh2Before?.value);
console.log('Total Qty:', totalQtyBefore, 'KG');
console.log('Total Val:', totalValBefore, 'Rs.');

// 2. Transfer 6,125 KG from godam no 1 to godam no 2 on 2026-10-05
const stockTransfers = [
  {
    id: 'trf-1',
    no: 'TRF-0001',
    date: '2026-10-05',
    fromWarehouseId: 'wh-1',
    fromWarehouseName: 'godam no 1',
    toWarehouseId: 'wh-2',
    toWarehouseName: 'godam no 2',
    itemId,
    itemName,
    quality: '',
    qty: 6125,
    remarks: 'Test transfer'
  }
];

const after = computeStockPositions(purchases, [], [], [], items, warehouses, [], stockTransfers);
console.log('\n--- AFTER TRANSFER ---');
const wh1After = after.find(p => p.warehouseName === 'godam no 1');
const wh2After = after.find(p => p.warehouseName === 'godam no 2');
const totalQtyAfter = after.reduce((s, p) => s + p.qty, 0);
const totalValAfter = after.reduce((s, p) => s + p.value, 0);

console.log('godam no 1:', wh1After?.qty, 'KG, rate:', wh1After?.avgRate, 'Rs.', wh1After?.value);
console.log('godam no 2:', wh2After?.qty, 'KG, rate:', wh2After?.avgRate, 'Rs.', wh2After?.value);
console.log('Total Qty:', totalQtyAfter, 'KG');
console.log('Total Val:', totalValAfter, 'Rs.');

console.log('\nChecking test criteria:');
console.log('1. godam no 1 === 0:', wh1After?.qty === 0 ? 'PASS' : `FAIL (${wh1After?.qty})`);
console.log('2. godam no 2 === 6275:', wh2After?.qty === 6275 ? 'PASS' : `FAIL (${wh2After?.qty})`);
console.log('3. total qty === 6275:', totalQtyAfter === 6275 ? 'PASS' : `FAIL (${totalQtyAfter})`);
console.log('4. total val unchanged:', totalValAfter === totalValBefore ? `PASS (${totalValAfter})` : `FAIL (before ${totalValBefore}, after ${totalValAfter})`);

if (
  wh1After?.qty === 0 &&
  wh2After?.qty === 6275 &&
  totalQtyAfter === 6275 &&
  totalValAfter === totalValBefore
) {
  console.log('\n>>> ALL TEST CRITERIA PASSED! <<<');
} else {
  console.error('\n>>> SOME TEST CRITERIA FAILED! <<<');
  process.exit(1);
}
