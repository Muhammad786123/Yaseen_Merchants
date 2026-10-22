import 'fake-indexeddb/auto';
import assert from 'assert';
import { db, clearAllDatabaseData } from '../src/db/database.js';
import { computeStockPositions, verifyStockConsistency, syncStockEntriesToDb } from '../src/utils/stockUtils.js';
import { issueService } from '../src/services/issueService.js';
import { purchaseService } from '../src/services/purchaseService.js';

console.log('=== RUNNING STOCK ISSUE & ORDERING FIX TESTS ===\n');

async function testSameDayOrderingAndNegative() {
  console.log('Test 1: computeStockPositions ordering on the same date...');
  
  // On the same date 2026-10-14:
  // An Issue is entered first in the array, but an Add Stock / Purchase happened on the same day.
  const item = { id: 'itm_1', name: 'Cotton Waste A', category: 'Raw Material' };
  const wh = { id: 'wh_1', name: 'godam no 1' };

  const purchases = [
    {
      id: 'pur_same_day',
      no: 'PUR-0001',
      date: '2026-10-14',
      createdAt: '2026-10-14T10:00:00Z',
      warehouseId: wh.id,
      warehouseName: wh.name,
      items: [{ itemId: item.id, itemName: item.name, qty: 500, rate: 100 }],
    },
  ];

  const issues = [
    {
      id: 'iss_same_day',
      no: 'ISS-0001',
      date: '2026-10-14',
      createdAt: '2026-10-14T12:00:00Z',
      fromWarehouse: wh.name,
      items: [{ itemId: item.id, itemName: item.name, issueQty: 200 }],
    },
  ];

  // Even if issues array is evaluated, IN must be sorted before OUT on the same date!
  const positions = computeStockPositions(purchases, [], issues, [], [item], [wh], []);
  assert.strictEqual(positions.length, 1);
  assert.strictEqual(positions[0].qty, 300, '500 IN - 200 OUT on same day must yield 300 KG');
  assert.strictEqual(positions[0].avgRate, 100);
  console.log('✓ Same-day IN before OUT ordering verified (500 IN - 200 OUT = 300 KG)');
}

async function testNegativeStockPreservation() {
  console.log('\nTest 2: computeStockPositions allows negative stock and preserves rate on OUT...');

  const item = { id: 'itm_1', name: 'Cotton Waste A', category: 'Raw Material' };
  const wh = { id: 'wh_1', name: 'godam no 1' };

  // Starting with 100 KG @ 120
  const purchases = [
    {
      id: 'pur_1',
      no: 'PUR-0001',
      date: '2026-10-10',
      warehouseId: wh.id,
      warehouseName: wh.name,
      items: [{ itemId: item.id, itemName: item.name, qty: 100, rate: 120 }],
    },
  ];

  // Issue 150 KG on 2026-10-12 -> Stock becomes -50 KG @ 120, value = -6000
  const issues = [
    {
      id: 'iss_1',
      no: 'ISS-0001',
      date: '2026-10-12',
      fromWarehouse: wh.name,
      items: [{ itemId: item.id, itemName: item.name, issueQty: 150 }],
    },
  ];

  const positions = computeStockPositions(purchases, [], issues, [], [item], [wh], []);
  assert.strictEqual(positions[0].qty, -50, 'Stock must NOT be clamped to 0; must be -50 KG');
  assert.strictEqual(positions[0].avgRate, 120, 'Average rate must be preserved on OUT even if stock is negative');
  assert.strictEqual(positions[0].value, -6000, 'Value must be pos.qty * pos.avgRate = -6000');
  console.log('✓ Negative stock allowed and preserved (-50 KG @ Rs. 120 = Rs. -6,000)');

  // Consistency check must also show -50, not clamp to 0
  const consistency = verifyStockConsistency(purchases, [], issues, [], positions, [item], []);
  assert.strictEqual(consistency.isConsistent, true, 'Consistency check must report true for negative stock');
  console.log('✓ verifyStockConsistency supports negative stock without clamp');
}

async function testUserScenario() {
  console.log('\nTest 3: User Exact Scenario:');
  console.log('Total stock 6,355 KG. Issue 275 KG سوکس ویسٹ + 10 KG قلیس from godam no 1 -> total becomes 6,070 KG.');
  console.log('Delete the issue -> 6,355. Issue only 275 KG -> 6,080.');

  await clearAllDatabaseData();

  const itemSocks = { id: 'itm_socks', name: 'سوکس ویسٹ', category: 'Raw Material' };
  const itemQalees = { id: 'itm_qalees', name: 'قلیس', category: 'Raw Material' };
  const wh1 = { id: 'wh_1', name: 'godam no 1', type: 'Godown' };
  const wh2 = { id: 'wh_2', name: 'godam no 2', type: 'Godown' };

  await db.items.bulkAdd([itemSocks, itemQalees]);
  await db.warehouses.bulkAdd([wh1, wh2]);

  // Seed purchases:
  // 1. 6,125 KG of سوکس ویسٹ in godam no 1
  // 2. 150 KG of سوکس ویسٹ in godam no 2
  // 3. 80 KG of قلیس in godam no 1
  // Total initial stock = 6,125 + 150 + 80 = 6,355 KG
  await purchaseService.add({
    date: '2026-10-10',
    warehouseId: wh1.id,
    warehouseName: wh1.name,
    items: [{ itemId: itemSocks.id, itemName: itemSocks.name, qty: 6125, rate: 120 }],
  });

  await purchaseService.add({
    date: '2026-10-11',
    warehouseId: wh2.id,
    warehouseName: wh2.name,
    items: [{ itemId: itemSocks.id, itemName: itemSocks.name, qty: 150, rate: 130 }],
  });

  await purchaseService.add({
    date: '2026-10-12',
    warehouseId: wh1.id,
    warehouseName: wh1.name,
    items: [{ itemId: itemQalees.id, itemName: itemQalees.name, qty: 80, rate: 110 }],
  });

  let currentStock = await syncStockEntriesToDb();
  let totalStock = currentStock.reduce((s, e) => s + e.qty, 0);
  console.log('Initial total stock:', totalStock, 'KG');
  assert.strictEqual(totalStock, 6355, 'Initial stock must be exactly 6,355 KG');

  // Step A: Issue 275 KG سوکس ویسٹ + 10 KG قلیس from godam no 1
  const issueSlip = await issueService.add({
    date: '2026-10-14',
    fromWarehouse: wh1.name,
    items: [
      { itemId: itemSocks.id, itemName: itemSocks.name, issueQty: 275 },
      { itemId: itemQalees.id, itemName: itemQalees.name, issueQty: 10 },
    ],
  });

  currentStock = await db.stockEntries.toArray();
  totalStock = currentStock.reduce((s, e) => s + e.qty, 0);
  console.log('Stock after issuing 275 KG + 10 KG:', totalStock, 'KG');
  assert.strictEqual(totalStock, 6070, 'Total stock after issue must be 6,070 KG (6355 - 285)');

  // Step B: Delete the issue -> stock returns to 6,355 KG
  await issueService.delete(issueSlip.id);
  currentStock = await db.stockEntries.toArray();
  totalStock = currentStock.reduce((s, e) => s + e.qty, 0);
  console.log('Stock after deleting the issue:', totalStock, 'KG');
  assert.strictEqual(totalStock, 6355, 'Stock after deleting the issue must return to 6,355 KG');

  // Step C: Issue only 275 KG سوکس ویسٹ -> total becomes 6,080 KG
  const issueSlip2 = await issueService.add({
    date: '2026-10-14',
    fromWarehouse: wh1.name,
    items: [
      { itemId: itemSocks.id, itemName: itemSocks.name, issueQty: 275 },
    ],
  });

  currentStock = await db.stockEntries.toArray();
  totalStock = currentStock.reduce((s, e) => s + e.qty, 0);
  console.log('Stock after issuing only 275 KG:', totalStock, 'KG');
  assert.strictEqual(totalStock, 6080, 'Total stock must be 6,080 KG (6355 - 275)');

  // Step D: Verify Stock Ledger balance matches Stock Page
  const socksGodam1 = currentStock.find((s) => s.itemId === itemSocks.id && s.warehouseName === wh1.name);
  // Initial in godam1: 6,125 - 275 = 5,850 KG
  assert.strictEqual(socksGodam1.qty, 5850, 'Godam no 1 socks stock must be 5,850 KG');
  console.log('✓ Godam no 1 socks stock balance:', socksGodam1.qty, 'KG');

  console.log('\nALL TESTS PASSED WITH 100% SUCCESS! 🎉');
}

async function run() {
  await testSameDayOrderingAndNegative();
  await testNegativeStockPreservation();
  await testUserScenario();
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
