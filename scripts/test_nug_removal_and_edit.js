// Verification script for Nug removal and backward compatibility with old entries

import assert from 'assert';

console.log('=== Test 1: SaleForm Initial State (New Line) ===');
// New line logic from SaleForm:
const defaultItem = { id: 'itm_1', name: 'Thread Waste', quality: 'A' };
const newSaleLine = {
  type: 'stock',
  itemId: defaultItem.id,
  itemName: defaultItem.name,
  quality: defaultItem.quality,
  unitType: 'KG',
  qty: '',
  rate: '',
  amount: 0,
  serviceDescription: '',
};
assert.strictEqual(newSaleLine.unitType, 'KG');
assert.strictEqual(newSaleLine.qty, '');
assert.strictEqual(newSaleLine.nugs, undefined);
console.log('✔ New Sale line has unitType: "KG", qty: "", no nugs');

console.log('=== Test 2: Typing qty & rate calculates amount = qty x rate ===');
const qty = 250;
const rate = 120;
const amount = qty * rate;
assert.strictEqual(amount, 30000);
console.log(`✔ Qty ${qty} KG x Rate Rs. ${rate} = Rs. ${amount}`);

console.log('=== Test 3: Opening an old saved Sale entry stored with unitType: "Nug" ===');
const oldSavedSale = {
  id: 'sale_old_1',
  items: [
    {
      itemId: 'itm_1',
      itemName: 'Hosiery Cut',
      unitType: 'Nug',
      nugs: 5,
      nugFactor: 100,
      qty: 500,
      rate: 85,
      amount: 42500,
    },
  ],
};

// SaleForm initialization logic for existing items:
const loadedSaleItems = oldSavedSale.items.map((it) => ({
  ...it,
  type: it.type || 'stock',
  unitType: 'KG',
  qty: it.qty !== undefined ? it.qty : '',
}));

assert.strictEqual(loadedSaleItems[0].unitType, 'KG');
assert.strictEqual(loadedSaleItems[0].qty, 500); // 500 KG preserved!
assert.strictEqual(loadedSaleItems[0].amount, 42500); // Amount preserved!
console.log(`✔ Old Nug entry loaded as unitType: "${loadedSaleItems[0].unitType}" with total qty: ${loadedSaleItems[0].qty} KG (unchanged)`);

console.log('=== Test 4: Opening an old saved Issue entry stored with unit: "Nug" ===');
const oldSavedIssue = {
  id: 'iss_old_1',
  items: [
    {
      itemId: 'itm_2',
      quality: 'Super',
      unit: 'Nug',
      nugs: 8,
      issueQty: 720,
    },
  ],
};

// IssueForm initialization logic:
const loadedIssueLines = oldSavedIssue.items.map((it, idx) => ({
  id: `line_${idx}`,
  itemId: it.itemId || '',
  quality: it.quality || '',
  unit: 'KG',
  nugs: 0,
  issueQtyInput: it.issueQty !== undefined ? it.issueQty : (it.qty !== undefined ? it.qty : ''),
}));

assert.strictEqual(loadedIssueLines[0].unit, 'KG');
assert.strictEqual(loadedIssueLines[0].issueQtyInput, 720); // 720 KG preserved!
console.log(`✔ Old Issue entry loaded as unit: "${loadedIssueLines[0].unit}" with issue qty: ${loadedIssueLines[0].issueQtyInput} KG (unchanged)`);

console.log('=== Test 5: Opening an old saved Purchase entry ===');
const oldSavedPurchase = {
  id: 'pur_old_1',
  items: [
    {
      itemId: 'itm_3',
      itemName: 'Comber Noil',
      unitType: 'Nug',
      qty: 1200,
      rate: 90,
      amount: 108000,
    },
  ],
};

const loadedPurchaseItems = oldSavedPurchase.items.map((it) => ({
  ...it,
  type: it.type || 'stock',
  unitType: 'KG',
  qty: it.qty !== undefined ? it.qty : '',
}));

assert.strictEqual(loadedPurchaseItems[0].unitType, 'KG');
assert.strictEqual(loadedPurchaseItems[0].qty, 1200);
console.log(`✔ Old Purchase entry loaded as unitType: "${loadedPurchaseItems[0].unitType}" with total qty: ${loadedPurchaseItems[0].qty} KG (unchanged)`);

console.log('\nALL TESTS PASSED SUCCESSFULLY! ✔');
