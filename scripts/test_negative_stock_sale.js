import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { computeStockPositions } from '../src/utils/stockUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Running Negative Stock Sale Verification Tests ---');

// 1. Verify SaleForm.jsx has no negative stock check or ConfirmDialog
const saleFormPath = path.resolve(__dirname, '../src/components/forms/SaleForm.jsx');
const saleFormContent = fs.readFileSync(saleFormPath, 'utf8');

assert(!saleFormContent.includes('showNegativeConfirm'), 'SaleForm still contains showNegativeConfirm');
assert(!saleFormContent.includes('hasNegative'), 'SaleForm still contains hasNegative');
assert(!saleFormContent.includes('ConfirmDialog'), 'SaleForm still contains ConfirmDialog');
console.log('✓ SaleForm.jsx: hasNegative and ConfirmDialog successfully removed');

// 2. Verify TransactionItemsTable.jsx has no isExceeded styling or warning banner
const tablePath = path.resolve(__dirname, '../src/components/forms/TransactionItemsTable.jsx');
const tableContent = fs.readFileSync(tablePath, 'utf8');

assert(!tableContent.includes('isExceeded'), 'TransactionItemsTable still contains isExceeded');
assert(!tableContent.includes('Warning: Requested'), 'TransactionItemsTable still contains warning text');
assert(!tableContent.includes('bg-red-50'), 'TransactionItemsTable still contains red warning styling');
assert(tableContent.includes('Available:'), 'TransactionItemsTable keeps Available quiet line');
console.log('✓ TransactionItemsTable.jsx: warning line and red styling successfully removed; quiet Available line retained');

// 3. Test stock calculations when selling 5,000 KG of item with 0 KG
const items = [{ id: 'item_1', name: 'Cotton Waste', category: 'Raw Material' }];
const warehouses = [{ id: 'wh_1', name: 'Godown A' }, { id: 'wh_2', name: 'Godown B' }];

// Scenario: 0 stock initially in Godown A. Sale of 5,000 KG from Godown A.
let sales = [
  {
    id: 'sal_1',
    no: 'SAL-0001',
    date: '2026-10-16',
    customerId: 'cust_1',
    customerName: 'Test Customer',
    warehouseId: 'wh_1',
    warehouseName: 'Godown A',
    items: [
      { itemId: 'item_1', itemName: 'Cotton Waste', qty: 5000, rate: 100, amount: 500000 }
    ]
  }
];

let stockPositions = computeStockPositions([], sales, [], [], items, warehouses, [], []);
let godownAPos = stockPositions.find(p => p.itemId === 'item_1' && p.warehouseName === 'Godown A');

assert(godownAPos, 'Position for Godown A must exist');
assert.strictEqual(godownAPos.qty, -5000, `Expected -5000 KG, got ${godownAPos.qty}`);
console.log(`✓ Sale with 0 initial stock: Godown A qty is ${godownAPos.qty} KG (negative stock allowed without clamp)`);

// 4. Test Edit Sale from 5,000 KG to 3,000 KG
sales = [
  {
    id: 'sal_1',
    no: 'SAL-0001',
    date: '2026-10-16',
    customerId: 'cust_1',
    customerName: 'Test Customer',
    warehouseId: 'wh_1',
    warehouseName: 'Godown A',
    items: [
      { itemId: 'item_1', itemName: 'Cotton Waste', qty: 3000, rate: 100, amount: 300000 }
    ]
  }
];

stockPositions = computeStockPositions([], sales, [], [], items, warehouses, [], []);
godownAPos = stockPositions.find(p => p.itemId === 'item_1' && p.warehouseName === 'Godown A');
assert.strictEqual(godownAPos.qty, -3000, `Expected -3000 KG on edit, got ${godownAPos.qty}`);
console.log(`✓ Edit sale to 3,000 KG: Godown A qty updated to ${godownAPos.qty} KG`);

// 5. Test Delete Sale
sales = [];
stockPositions = computeStockPositions([], sales, [], [], items, warehouses, [], []);
godownAPos = stockPositions.find(p => p.itemId === 'item_1' && p.warehouseName === 'Godown A');
const finalQty = godownAPos ? godownAPos.qty : 0;
assert.strictEqual(finalQty, 0, `Expected 0 KG on delete, got ${finalQty}`);
console.log(`✓ Delete sale: Godown A stock cleanly restored to ${finalQty} KG`);

console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
