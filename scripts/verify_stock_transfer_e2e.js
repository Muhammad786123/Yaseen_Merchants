import 'fake-indexeddb/auto';
import assert from 'assert';
import { db, clearAllDatabaseData } from '../src/db/database.js';
import { stockTransferService } from '../src/services/stockTransferService.js';
import { syncStockEntriesToDb } from '../src/utils/stockUtils.js';

console.log('=== RUNNING STOCK TRANSFER E2E INTEGRATION TESTS ===\n');

async function runE2ETests() {
  await clearAllDatabaseData();

  const wh1 = { id: 'wh_1', name: 'godam no 1', type: 'Godown' };
  const wh2 = { id: 'wh_2', name: 'godam no 2', type: 'Godown' };
  const item = { id: 'itm_socks', name: 'سوکس ویسٹ', category: 'Raw Material' };

  await db.warehouses.bulkAdd([wh1, wh2]);
  await db.items.add(item);

  // 1. Initial Purchases:
  // godam no 1: 6,125 KG
  // godam no 2: 150 KG
  // Total = 6,275 KG, Total value = 262,002 Rs
  await db.purchases.bulkAdd([
    {
      id: 'pur_1',
      no: 'PUR-0001',
      date: '2026-10-01',
      warehouseId: wh1.id,
      warehouseName: wh1.name,
      items: [
        {
          itemId: item.id,
          itemName: item.name,
          qty: 6125,
          rate: 41.7533061224,
          amount: 255739,
        },
      ],
    },
    {
      id: 'pur_2',
      no: 'PUR-0002',
      date: '2026-10-01',
      warehouseId: wh2.id,
      warehouseName: wh2.name,
      items: [
        {
          itemId: item.id,
          itemName: item.name,
          qty: 150,
          rate: 41.7533333333,
          amount: 6263,
        },
      ],
    },
  ]);

  let stock = await syncStockEntriesToDb();
  let g1Stock = stock.find((s) => s.warehouseName === wh1.name);
  let g2Stock = stock.find((s) => s.warehouseName === wh2.name);
  let totalQty = stock.reduce((sum, s) => sum + s.qty, 0);
  let totalVal = stock.reduce((sum, s) => sum + s.value, 0);

  console.log('Before Transfer:');
  console.log('  godam no 1:', g1Stock?.qty, 'KG, Rs.', g1Stock?.value);
  console.log('  godam no 2:', g2Stock?.qty, 'KG, Rs.', g2Stock?.value);
  console.log('  Total Qty:', totalQty, 'KG, Total Val: Rs.', totalVal);

  assert.strictEqual(g1Stock?.qty, 6125);
  assert.strictEqual(g2Stock?.qty, 150);
  assert.strictEqual(totalQty, 6275);
  assert.strictEqual(totalVal, 262002);

  // 2. Perform Transfer: 6,125 KG from godam no 1 to godam no 2
  console.log('\nPerforming Transfer: 6,125 KG from godam no 1 to godam no 2...');
  const newTransfer = await stockTransferService.add({
    date: '2026-10-05',
    fromWarehouseId: wh1.id,
    fromWarehouseName: wh1.name,
    toWarehouseId: wh2.id,
    toWarehouseName: wh2.name,
    itemId: item.id,
    itemName: item.name,
    quality: '',
    qty: 6125,
    remarks: 'Transfer to godam no 2',
  });

  assert.ok(newTransfer.no.startsWith('TRF-'), `Transfer number should be TRF-..., got ${newTransfer.no}`);
  console.log('  Created Transfer:', newTransfer.no);

  // Check Dexie table
  const allTransfers = await db.stockTransfers.toArray();
  assert.strictEqual(allTransfers.length, 1);
  assert.strictEqual(allTransfers[0].qty, 6125);

  // Re-check stock in DB
  const stockAfter = await db.stockEntries.toArray();
  const g1After = stockAfter.find((s) => s.warehouseName === wh1.name);
  const g2After = stockAfter.find((s) => s.warehouseName === wh2.name);
  const totalQtyAfter = stockAfter.reduce((sum, s) => sum + s.qty, 0);
  const totalValAfter = stockAfter.reduce((sum, s) => sum + s.value, 0);

  console.log('After Transfer:');
  console.log('  godam no 1:', g1After?.qty, 'KG, Rs.', g1After?.value);
  console.log('  godam no 2:', g2After?.qty, 'KG, Rs.', g2After?.value);
  console.log('  Total Qty:', totalQtyAfter, 'KG, Total Val: Rs.', totalValAfter);

  assert.strictEqual(g1After?.qty, 0, 'godam no 1 should have 0 KG');
  assert.strictEqual(g2After?.qty, 6275, 'godam no 2 should have 6,275 KG');
  assert.strictEqual(totalQtyAfter, 6275, 'Total quantity must remain 6,275 KG');
  assert.strictEqual(totalValAfter, 262002, 'Total valuation must remain Rs. 262,002');
  console.log('✓ TEST CRITERIA PASSED: godam no 1 = 0, godam no 2 = 6,275 KG, total = 6,275 KG and Rs. 262,002');

  // 3. Delete transfer and verify rollback
  console.log('\nTesting Delete (Rollback)...');
  await stockTransferService.delete(newTransfer.id);
  const transfersAfterDel = await db.stockTransfers.toArray();
  assert.strictEqual(transfersAfterDel.length, 0);

  const stockAfterDel = await db.stockEntries.toArray();
  const g1Reverted = stockAfterDel.find((s) => s.warehouseName === wh1.name);
  const g2Reverted = stockAfterDel.find((s) => s.warehouseName === wh2.name);
  assert.strictEqual(g1Reverted?.qty, 6125);
  assert.strictEqual(g2Reverted?.qty, 150);
  console.log('✓ Delete transfer successfully re-synced stock back to original positions!');

  console.log('\n>>> ALL INTEGRATION TESTS PASSED SUCCESSFULLY! <<<');
}

runE2ETests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
