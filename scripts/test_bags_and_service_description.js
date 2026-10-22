import 'fake-indexeddb/auto';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../src/db/database.js';
import { saleService } from '../src/services/saleService.js';
import { buildPartyTransactions } from '../src/services/partyService.js';
import { salePurchaseService } from '../src/services/salePurchaseService.js';
import { getLineLabel } from '../src/utils/formatters.js';
import {
  formatBillDate,
  formatWeight,
  formatRate,
  formatAmount,
  formatCount,
  computeSaleBillBalances,
} from '../src/utils/saleBillMemoUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TEST: BAGS COUNT & SERVICE LINE DESCRIPTION ===\n');

// 1. Helper function test
console.log('1. Testing getLineLabel helper:');
assert.strictEqual(getLineLabel({ type: 'stock', itemName: 'Raw Cotton' }), 'Raw Cotton');
assert.strictEqual(getLineLabel({ type: 'service', itemName: 'Service Line', serviceDescription: 'خالی باردانہ' }), 'خالی باردانہ');
assert.strictEqual(getLineLabel({ type: 'service', itemName: 'Service Line', serviceDescription: 'Loading' }), 'Loading');
assert.strictEqual(getLineLabel({ type: 'service', itemName: 'Service Line', serviceDescription: '' }), 'Service Line');
assert.strictEqual(getLineLabel({ type: 'service', itemName: 'Service Line' }), 'Service Line');
console.log('✓ getLineLabel helper properly resolves stock items and service descriptions');

// 2. Testing user scenario end-to-end
console.log('\n2. Testing User Test Scenario:');
await db.open();

// Create customer
const partyId = 'cust_test_bags_001';
await db.parties.put({
  id: partyId,
  name: 'محمد علی',
  type: 'Customer',
  balance: 0,
});

// Add sale with 1 stock line (399.5 KG, bags 5, rate 212) and 1 service line ("خالی باردانہ", 2000)
const initialSaleData = {
  id: 'sal_bags_001',
  no: 'SAL-0001',
  date: '2026-10-22',
  customerId: partyId,
  customerName: 'محمد علی',
  items: [
    {
      type: 'stock',
      itemId: 'item_raw_cotton',
      itemName: 'Raw Cotton',
      count: 5,
      qty: 399.5,
      rate: 212,
      amount: 84694,
    },
    {
      type: 'service',
      itemId: '',
      itemName: 'Service Line',
      serviceDescription: 'خالی باردانہ',
      count: '',
      qty: 0,
      rate: '',
      amount: 2000,
    },
  ],
  total: 86694,
  received: 0,
  balance: 86694,
};

const savedSale = await saleService.add(initialSaleData);

// Verify Bill Row 1: 5 / 399.500 / 212.00 / 84,694
const row1 = savedSale.items[0];
assert.strictEqual(row1.count, 5);
assert.strictEqual(formatCount(row1.count), '5');
assert.strictEqual(formatWeight(row1.qty), '399.500');
assert.strictEqual(formatRate(row1.rate), '212.00');
assert.strictEqual(formatAmount(row1.amount), '84,694');
assert.strictEqual(getLineLabel(row1), 'Raw Cotton');
console.log('✓ Row 1 verified: 5 / 399.500 / 212.00 / 84,694');

// Verify Bill Row 2: خالی باردانہ and 2,000 (no count, no weight)
const row2 = savedSale.items[1];
const row2Count = row2.type === 'service' ? '' : (row2.count || '');
const row2Weight = row2.type === 'service' ? '' : row2.qty;
assert.strictEqual(row2Count, '');
assert.strictEqual(row2Weight, '');
assert.strictEqual(getLineLabel(row2), 'خالی باردانہ');
assert.strictEqual(formatAmount(row2.amount), '2,000');
console.log('✓ Row 2 verified: خالی باردانہ / 2,000 (no count, no weight)');

// Verify Total Row: 5 bags and 86,694
const totalCount = savedSale.items.reduce((sum, it) => it.type !== 'service' && it.count ? sum + Number(it.count) : sum, 0);
assert.strictEqual(totalCount, 5);
assert.strictEqual(formatCount(totalCount), '5');
assert.strictEqual(formatAmount(savedSale.total), '86,694');
console.log('✓ Total row verified: 5 bags / 86,694');

// Verify Sale list display string
const saleListStr = savedSale.items.map(getLineLabel).join(', ');
assert.strictEqual(saleListStr, 'Raw Cotton, خالی باردانہ');
console.log('✓ Sale list items display:', saleListStr);

// Verify Party Ledger Detail
const partyTxns1 = buildPartyTransactions(partyId, {
  purchases: [],
  sales: [savedSale],
  receipts: [],
  payments: [],
  cashBookEntries: [],
  issues: [],
  journalEntries: [],
});
assert.strictEqual(partyTxns1.length, 1);
assert(partyTxns1[0].detail.includes('خالی باردانہ'), `Ledger detail must include 'خالی باردانہ', got: ${partyTxns1[0].detail}`);
console.log('✓ Party ledger detail:', partyTxns1[0].detail);

// Verify Mall A/C Ledger
const mallTxns1 = await salePurchaseService.getLedger();
const saleMallTxn1 = mallTxns1.find(t => t.id === savedSale.id);
assert(saleMallTxn1 && saleMallTxn1.description.includes('خالی باردانہ'), `Mall A/C must include 'خالی باردانہ', got: ${saleMallTxn1?.description}`);
console.log('✓ Mall A/C ledger description:', saleMallTxn1.description);

// 3. Edit the service text to "Loading", save, reprint
console.log('\n3. Testing Edit Service Description to "Loading":');
const updatedItems = [
  savedSale.items[0],
  {
    ...savedSale.items[1],
    serviceDescription: 'Loading',
  },
];

const updatedSale = await saleService.update(savedSale.id, {
  ...savedSale,
  items: updatedItems,
});

// Verify updated bill row
const updatedRow2 = updatedSale.items[1];
assert.strictEqual(getLineLabel(updatedRow2), 'Loading');
console.log('✓ Bill row 2 after edit shows:', getLineLabel(updatedRow2));

// Verify Sale list after edit
const updatedSaleListStr = updatedSale.items.map(getLineLabel).join(', ');
assert.strictEqual(updatedSaleListStr, 'Raw Cotton, Loading');
console.log('✓ Sale list items after edit:', updatedSaleListStr);

// Verify Party Ledger after edit
const partyTxns2 = buildPartyTransactions(partyId, {
  purchases: [],
  sales: [updatedSale],
  receipts: [],
  payments: [],
  cashBookEntries: [],
  issues: [],
  journalEntries: [],
});
assert(partyTxns2[0].detail.includes('Loading'), `Ledger detail after edit must include 'Loading', got: ${partyTxns2[0].detail}`);
console.log('✓ Party ledger detail after edit:', partyTxns2[0].detail);

// Verify Mall A/C after edit
const mallTxns2 = await salePurchaseService.getLedger();
const saleMallTxn2 = mallTxns2.find(t => t.id === updatedSale.id);
assert(saleMallTxn2 && saleMallTxn2.description.includes('Loading'), `Mall A/C after edit must include 'Loading', got: ${saleMallTxn2?.description}`);
console.log('✓ Mall A/C ledger description after edit:', saleMallTxn2.description);

// 4. Source code checks
console.log('\n4. Checking Source Code specifications:');
const memoSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/common/SaleBillMemo.jsx'), 'utf8');
assert(memoSrc.includes('بوروں کی تعداد'), 'SaleBillMemo.jsx must have "بوروں کی تعداد" as header');
assert(memoSrc.includes('getLineLabel'), 'SaleBillMemo.jsx must use getLineLabel');
console.log('✓ SaleBillMemo.jsx contains "بوروں کی تعداد" header and uses getLineLabel');

const tableSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/forms/TransactionItemsTable.jsx'), 'utf8');
assert(tableSrc.includes('Bags / بوروں کی تعداد'), 'TransactionItemsTable.jsx must have label "Bags / بوروں کی تعداد"');
console.log('✓ TransactionItemsTable.jsx contains "Bags / بوروں کی تعداد" label');

console.log('\n=== ALL BAGS & SERVICE DESCRIPTION TESTS PASSED! ===');
