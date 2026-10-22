import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { numberToRomanUrduWords } from '../src/utils/formatters.js';
import { SALE_BILL_LABELS_ROMAN_URDU } from '../src/utils/saleBillLabels.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Testing Sale Invoice Roman Urdu & Print Layout ---');

// 1. Test Roman Urdu words converter
console.log('1. Testing numberToRomanUrduWords:');
const test596300 = numberToRomanUrduWords(596300);
console.log('  596,300 ->', test596300);
assert.strictEqual(
  test596300.toLowerCase(),
  'panch lakh chhiyanway hazaar teen sau rupay',
  `Unexpected words for 596300: ${test596300}`
);

const test116000 = numberToRomanUrduWords(116000);
console.log('  116,000 ->', test116000);
assert.strictEqual(
  test116000.toLowerCase(),
  'ek lakh solah hazaar rupay',
  `Unexpected words for 116000: ${test116000}`
);

const test0 = numberToRomanUrduWords(0);
console.log('  0 ->', test0);
assert.strictEqual(test0.toLowerCase(), 'sifar rupay');

console.log('✓ numberToRomanUrduWords verified successfully!');

// 2. Test translation dictionary SALE_BILL_LABELS_ROMAN_URDU
console.log('\n2. Testing SALE_BILL_LABELS_ROMAN_URDU dictionary:');
assert.strictEqual(SALE_BILL_LABELS_ROMAN_URDU.title, 'BIKRI BILL');
assert.strictEqual(SALE_BILL_LABELS_ROMAN_URDU.customer, 'Party ka Naam');
assert.strictEqual(SALE_BILL_LABELS_ROMAN_URDU.warehouse, 'Godam');
assert.strictEqual(SALE_BILL_LABELS_ROMAN_URDU.itemsHeading, 'Maal ki Tafseel');
assert.strictEqual(SALE_BILL_LABELS_ROMAN_URDU.columns.srNo, 'Nambar');
assert.strictEqual(SALE_BILL_LABELS_ROMAN_URDU.columns.itemName, 'Maal ka Naam');
assert.strictEqual(SALE_BILL_LABELS_ROMAN_URDU.columns.weight, 'Wazan (KG)');
assert.strictEqual(SALE_BILL_LABELS_ROMAN_URDU.columns.rate, 'Rate (Rs. per KG)');
assert.strictEqual(SALE_BILL_LABELS_ROMAN_URDU.columns.amount, 'Raqam (Rs.)');
assert(!SALE_BILL_LABELS_ROMAN_URDU.columns.quality, 'Quality column should not exist in SALE_BILL_LABELS_ROMAN_URDU');
assert.strictEqual(SALE_BILL_LABELS_ROMAN_URDU.totals.totalBill, 'Kul Bill:');
assert.strictEqual(SALE_BILL_LABELS_ROMAN_URDU.totals.receivedAmount, 'Wasool Shuda Raqam:');
assert.strictEqual(SALE_BILL_LABELS_ROMAN_URDU.totals.balanceReceivable, 'Baqaya Raqam (Party ne dene hain):');
assert.strictEqual(SALE_BILL_LABELS_ROMAN_URDU.totals.wordsPrefix, 'Alfaaz mein:');
console.log('✓ SALE_BILL_LABELS_ROMAN_URDU dictionary verified successfully!');

// 3. Inspect Sale.jsx source
console.log('\n3. Inspecting Sale.jsx source code:');
const saleSrc = fs.readFileSync(path.resolve(__dirname, '../src/pages/Sale/Sale.jsx'), 'utf8');
assert(saleSrc.includes('hideSignatures={true}'), 'Sale.jsx must pass hideSignatures={true}');
assert(saleSrc.includes('hideAuditFooter={true}'), 'Sale.jsx must pass hideAuditFooter={true}');
assert(!saleSrc.includes('signatures={['), 'Sale.jsx must remove signatures prop');
assert(!saleSrc.includes('<th className="p-2 font-bold border border-gray-400">Quality</th>'), 'Sale.jsx must not have Quality column header');
assert(saleSrc.includes('border-2 border-black'), 'Sale.jsx table has clear black borders');
assert(saleSrc.includes('text-[16px]'), 'Sale.jsx table has 16px text');
assert(saleSrc.includes('text-[18px]'), 'Sale.jsx totals have 18px text');
assert(saleSrc.includes('text-[24px]'), 'Sale.jsx title has 24px text');
console.log('✓ Sale.jsx print modal verified successfully!');

// 4. Inspect PrintDocument.jsx source
console.log('\n4. Inspecting PrintDocument.jsx source code:');
const printDocSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/common/PrintDocument.jsx'), 'utf8');
assert(printDocSrc.includes('hideSignatures = false'), 'PrintDocument must default hideSignatures to false');
assert(printDocSrc.includes('hideAuditFooter = false'), 'PrintDocument must default hideAuditFooter to false');
assert(printDocSrc.includes('!hideAuditFooter &&'), 'PrintDocument must conditionally render audit line');
assert(printDocSrc.includes('!hideSignatures &&'), 'PrintDocument must conditionally render signatures');
console.log('✓ PrintDocument.jsx conditional footer verified successfully!');

// 5. Inspect Purchase.jsx source to confirm other documents remain unchanged
console.log('\n5. Confirming Purchase.jsx remains unchanged:');
const purchaseSrc = fs.readFileSync(path.resolve(__dirname, '../src/pages/Purchase/Purchase.jsx'), 'utf8');
assert(!purchaseSrc.includes('hideSignatures'), 'Purchase.jsx must NOT pass hideSignatures');
assert(purchaseSrc.includes('signatures={['), 'Purchase.jsx must keep its signatures');
console.log('✓ Other documents remain unaffected!');

console.log('\n--- ALL SALE INVOICE PRINT TESTS PASSED! ---');
