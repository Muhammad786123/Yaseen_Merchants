import assert from 'assert';
import { computeStockPositions } from '../src/utils/stockUtils.js';

console.log('=== TEST: STOCK GLOBAL RATE & QUANTITY 0 = VALUE 0 ===\n');

// -----------------------------------------------------------------------------
// TEST 1: Purchase 500 KG @ 108 into godown A, Sale 500 KG from godown B
// -----------------------------------------------------------------------------
console.log('1. Testing Purchase 500 KG @ 108 into godown A, Sale 500 KG from godown B:');

const itemId = 'item_cotton';
const items = [{ id: itemId, name: 'Cotton Waste', category: 'Raw Material' }];
const warehouses = [
  { id: 'wh_a', name: 'Godown A' },
  { id: 'wh_b', name: 'Godown B' },
];

const purchases = [
  {
    id: 'pur_1',
    no: 'PUR-0001',
    date: '2026-10-10',
    warehouseId: 'wh_a',
    warehouseName: 'Godown A',
    items: [
      { itemId, itemName: 'Cotton Waste', qty: 500, rate: 108, amount: 54000 },
    ],
  },
];

const sales = [
  {
    id: 'sal_1',
    no: 'SAL-0001',
    date: '2026-10-12',
    warehouseId: 'wh_b',
    warehouseName: 'Godown B',
    items: [
      { itemId, itemName: 'Cotton Waste', qty: 500, rate: 150, amount: 75000 },
    ],
  },
];

const positions = computeStockPositions(purchases, sales, [], [], items, warehouses, [], []);

const posA = positions.find((p) => p.warehouseName === 'Godown A');
const posB = positions.find((p) => p.warehouseName === 'Godown B');

console.log('  Godown A:', { qty: posA?.qty, rate: posA?.avgRate, value: posA?.value });
console.log('  Godown B:', { qty: posB?.qty, rate: posB?.avgRate, value: posB?.value });

assert.strictEqual(posA?.qty, 500, 'Godown A must have +500 KG');
assert.strictEqual(posA?.avgRate, 108, 'Godown A rate must be 108');
assert.strictEqual(posA?.value, 54000, 'Godown A value must be Rs 54,000');

assert.strictEqual(posB?.qty, -500, 'Godown B must have -500 KG');
assert.strictEqual(posB?.avgRate, 108, 'Godown B rate must follow item rate (108)');
assert.strictEqual(posB?.value, -54000, 'Godown B value must be Rs -54,000');

const totalQty = positions.reduce((sum, p) => sum + p.qty, 0);
const totalVal = positions.reduce((sum, p) => sum + p.value, 0);

console.log('  Stock total across godowns:', { totalQty, totalVal });
assert.strictEqual(totalQty, 0, 'Total qty across godowns must be 0 KG');
assert.strictEqual(totalVal, 0, 'Total value across godowns must be Rs 0');
console.log('✓ Purchase 500 @ 108 in Godown A + Sale 500 from Godown B -> Total 0 KG / Rs 0 VERIFIED!');

// -----------------------------------------------------------------------------
// TEST 2: Socks Waste: Raw Material 735 KG, تیار مال -5,000 KG, total -4,265 KG
// -----------------------------------------------------------------------------
console.log('\n2. Testing Socks Waste scenario (positive raw material, negative finished, total negative):');

const itemSocksRaw = { id: 'socks_raw', name: 'Socks Waste Raw', category: 'Raw Material' };
const itemSocksFinished = { id: 'socks_fin', name: 'تیار مال', category: 'Finished Product' };
const itemsTest2 = [itemSocksRaw, itemSocksFinished];

const purchasesTest2 = [
  {
    id: 'pur_socks',
    no: 'PUR-SOCKS',
    date: '2026-10-01',
    warehouseName: 'Main Store',
    items: [
      { itemId: 'socks_raw', itemName: 'Socks Waste Raw', qty: 735, rate: 100, amount: 73500 },
      { itemId: 'socks_fin', itemName: 'تیار مال', qty: 1000, rate: 200, amount: 200000 },
    ],
  },
];

const salesTest2 = [
  {
    id: 'sal_socks',
    no: 'SAL-SOCKS',
    date: '2026-10-05',
    warehouseName: 'Main Store',
    items: [
      { itemId: 'socks_fin', itemName: 'تیار مال', qty: 6000, rate: 250, amount: 1500000 },
    ],
  },
];

const positions2 = computeStockPositions(purchasesTest2, salesTest2, [], [], itemsTest2, [{ id: 'wh1', name: 'Main Store' }], [], []);
const posRaw = positions2.find((p) => p.itemId === 'socks_raw');
const posFin = positions2.find((p) => p.itemId === 'socks_fin');

console.log('  Raw Material:', { qty: posRaw?.qty, value: posRaw?.value });
console.log('  تیار مال:', { qty: posFin?.qty, value: posFin?.value });

assert.strictEqual(posRaw?.qty, 735, 'Raw material qty must be 735 KG');
assert.strictEqual(posRaw?.value, 73500, 'Raw material value must be 73,500');

assert.strictEqual(posFin?.qty, -5000, 'تیار مال qty must be -5,000 KG');
assert.strictEqual(posFin?.avgRate, 200, 'تیار مال rate must be 200');
assert.strictEqual(posFin?.value, -1000000, 'تیار مال value must be -1,000,000');

const totalQty2 = positions2.reduce((sum, p) => sum + p.qty, 0);
const totalVal2 = positions2.reduce((sum, p) => sum + p.value, 0);

assert.strictEqual(totalQty2, -4265, 'Total qty must be -4,265 KG');
assert(totalVal2 < 0, `Total value must be negative, got ${totalVal2}`);
console.log(`  Combined Total: ${totalQty2} KG, Total Value: Rs ${totalVal2}`);
console.log('✓ Socks Waste negative stock scenario verified!');

// -----------------------------------------------------------------------------
// TEST 3: Transfer between godowns leaves item total unchanged
// -----------------------------------------------------------------------------
console.log('\n3. Testing Transfer between godowns leaves item total unchanged:');

const purchasesTrf = [
  {
    id: 'pur_trf',
    no: 'PUR-TRF',
    date: '2026-10-01',
    warehouseId: 'wh_a',
    warehouseName: 'Godown A',
    items: [{ itemId: 'item_trf', itemName: 'Item Trf', qty: 1000, rate: 120, amount: 120000 }],
  },
];

const beforeTrf = computeStockPositions(purchasesTrf, [], [], [], [{ id: 'item_trf', name: 'Item Trf' }], warehouses, [], []);
const totalQtyBefore = beforeTrf.reduce((sum, p) => sum + p.qty, 0);
const totalValBefore = beforeTrf.reduce((sum, p) => sum + p.value, 0);

const transfers = [
  {
    id: 'trf_1',
    no: 'TRF-001',
    date: '2026-10-05',
    fromWarehouseId: 'wh_a',
    fromWarehouseName: 'Godown A',
    toWarehouseId: 'wh_b',
    toWarehouseName: 'Godown B',
    itemId: 'item_trf',
    itemName: 'Item Trf',
    qty: 400,
  },
];

const afterTrf = computeStockPositions(purchasesTrf, [], [], [], [{ id: 'item_trf', name: 'Item Trf' }], warehouses, [], transfers);
const totalQtyAfter = afterTrf.reduce((sum, p) => sum + p.qty, 0);
const totalValAfter = afterTrf.reduce((sum, p) => sum + p.value, 0);

console.log('  Before Transfer:', { totalQtyBefore, totalValBefore });
console.log('  After Transfer:', { totalQtyAfter, totalValAfter });

assert.strictEqual(totalQtyAfter, totalQtyBefore, 'Total qty must be unchanged after transfer');
assert.strictEqual(totalValAfter, totalValBefore, 'Total value must be unchanged after transfer');

const g1Pos = afterTrf.find((p) => p.warehouseName === 'Godown A');
const g2Pos = afterTrf.find((p) => p.warehouseName === 'Godown B');
assert.strictEqual(g1Pos?.qty, 600, 'Godown A must have 600 KG');
assert.strictEqual(g2Pos?.qty, 400, 'Godown B must have 400 KG');
assert.strictEqual(g1Pos?.value, 72000, 'Godown A value must be 72,000');
assert.strictEqual(g2Pos?.value, 48000, 'Godown B value must be 48,000');
console.log('✓ Transfer leaves item total quantity and total value completely unchanged!');

console.log('\n=== ALL STOCK GLOBAL RATE TESTS PASSED! ===');
