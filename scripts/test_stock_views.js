import 'fake-indexeddb/auto';
import assert from 'assert';
import { db, clearAllDatabaseData } from '../src/db/database.js';
import { computeStockPositions } from '../src/utils/stockUtils.js';

console.log('=== TEST: STOCK PAGE ITEM-WISE AND WAREHOUSE-WISE VIEWS ===');

async function runTests() {
  await clearAllDatabaseData();

  // Seed Item: سوکس ویسٹ
  const itemId = 'itm_socks';
  const itemName = 'سوکس ویسٹ';
  const itemObj = {
    id: itemId,
    name: itemName,
    category: 'Raw Material',
    quality: '',
  };
  await db.items.add(itemObj);

  // Seed Warehouses: godam no 1, godam no 2
  const wh1 = { id: 'wh_1', name: 'godam no 1', type: 'Godown' };
  const wh2 = { id: 'wh_2', name: 'godam no 2', type: 'Godown' };
  await db.warehouses.bulkAdd([wh1, wh2]);

  // Seed purchases to create stock:
  // 1. 6,125 KG in godam no 1 @ Rs. 120
  // 2. 150 KG in godam no 2 @ Rs. 130
  const purchases = [
    {
      id: 'pur_1',
      no: 'PUR-0001',
      date: '2026-10-10',
      warehouseId: wh1.id,
      warehouseName: wh1.name,
      items: [
        {
          itemId,
          itemName,
          quality: '',
          qty: 6125,
          rate: 120,
          amount: 6125 * 120, // 735,000
        },
      ],
      total: 735000,
    },
    {
      id: 'pur_2',
      no: 'PUR-0002',
      date: '2026-10-11',
      warehouseId: wh2.id,
      warehouseName: wh2.name,
      items: [
        {
          itemId,
          itemName,
          quality: '',
          qty: 150,
          rate: 130,
          amount: 150 * 130, // 19,500
        },
      ],
      total: 19500,
    },
  ];

  // Calculate live stock entries
  const stockEntries = computeStockPositions(
    purchases,
    [], // sales
    [], // issues
    [], // productions
    [itemObj], // items
    [wh1, wh2], // warehouses
    []  // adjustments
  );

  console.log('Stock entries count:', stockEntries.length);
  assert.strictEqual(stockEntries.length, 2, 'Should have 2 stock positions (one per warehouse)');

  // 1. Verify Item-wise Grouping:
  // Item سوکس ویسٹ with 6,125 KG in godam no 1 and 150 KG in godam no 2
  // Must show ONE row of 6,275 KG in the Item-wise tab, expandable to the two godowns!
  const itemMap = {};
  for (const entry of stockEntries) {
    const key = entry.itemId || entry.itemName;
    if (!itemMap[key]) {
      itemMap[key] = {
        itemId: entry.itemId,
        itemName: entry.itemName,
        category: entry.category,
        totalQty: 0,
        totalValue: 0,
        breakdowns: [],
      };
    }
    const q = Number(entry.qty || 0);
    const v = Number(entry.value !== undefined ? entry.value : q * Number(entry.avgRate || 0));
    itemMap[key].totalQty += q;
    itemMap[key].totalValue += v;
    itemMap[key].breakdowns.push({
      warehouseName: entry.warehouseName,
      qty: q,
      avgRate: entry.avgRate,
      value: v,
    });
  }

  const itemWiseRows = Object.values(itemMap);
  assert.strictEqual(itemWiseRows.length, 1, 'Item-wise tab must show exactly ONE row for سوکس ویسٹ');

  const row = itemWiseRows[0];
  console.log(`Item: ${row.itemName}, Total Qty: ${row.totalQty} KG, Breakdowns: ${row.breakdowns.length}`);
  assert.strictEqual(row.totalQty, 6275, 'Total quantity must equal 6,125 + 150 = 6,275 KG');
  assert.strictEqual(row.breakdowns.length, 2, 'Must expand to 2 warehouses (godam no 1 and godam no 2)');

  const b1 = row.breakdowns.find((b) => b.warehouseName === 'godam no 1');
  const b2 = row.breakdowns.find((b) => b.warehouseName === 'godam no 2');
  assert.strictEqual(b1.qty, 6125);
  assert.strictEqual(b2.qty, 150);
  console.log('✓ Item-wise view correctly aggregates سوکس ویسٹ into 1 row of 6,275 KG with 2 godown breakdowns');

  // 2. Verify Warehouse-wise Grouping:
  // Warehouse-wise tab with godam no 2 selected shows only that godown's items
  const godam2Items = stockEntries.filter((s) => s.warehouseName === 'godam no 2');
  assert.strictEqual(godam2Items.length, 1);
  assert.strictEqual(godam2Items[0].qty, 150);
  assert.strictEqual(godam2Items[0].itemName, 'سوکس ویسٹ');
  console.log('✓ Warehouse-wise tab with godam no 2 selected shows only that godown: 150 KG of سوکس ویسٹ');

  // 3. Grand Totals equal the summary cards:
  const totalSummaryQty = stockEntries.reduce((s, e) => s + e.qty, 0);
  const totalSummaryVal = stockEntries.reduce((s, e) => s + e.value, 0);
  const grandTotalItemQty = itemWiseRows.reduce((s, i) => s + i.totalQty, 0);
  const grandTotalItemVal = itemWiseRows.reduce((s, i) => s + i.totalValue, 0);

  assert.strictEqual(grandTotalItemQty, totalSummaryQty, 'Grand total Qty must match summary card volume');
  assert.strictEqual(grandTotalItemVal, totalSummaryVal, 'Grand total Value must match summary card valuation');
  assert.strictEqual(grandTotalItemQty, 6275);
  assert.strictEqual(grandTotalItemVal, 735000 + 19500); // 754,500
  console.log(`✓ Grand totals (${grandTotalItemQty} KG, Rs. ${grandTotalItemVal}) strictly match summary cards`);

  console.log('ALL STOCK VIEW TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
