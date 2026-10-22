import 'fake-indexeddb/auto';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  computeSaleBillBalances,
  formatWeight,
  formatRate,
  formatAmount,
  formatCount,
  formatBillDate,
} from '../src/utils/saleBillMemoUtils.js';
import {
  getPartyBalanceBeforeInvoice,
  buildPartyTransactions,
} from '../src/services/partyService.js';
import { db } from '../src/db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TEST: SALE BILL / MEMO REFINEMENTS & CALCULATION FLOW ===\n');

// -----------------------------------------------------------------------------
// 1. Test Number & Formatting Helpers
// -----------------------------------------------------------------------------
console.log('1. Testing number formatters:');

// Weight: 3 decimals (399.500, 500.000)
assert.strictEqual(formatWeight(399.5), '399.500', 'Weight 399.5 must format to 399.500');
assert.strictEqual(formatWeight(500), '500.000', 'Weight 500 must format to 500.000');
assert.strictEqual(formatWeight(0), '0.000', 'Weight 0 must format to 0.000');
assert.strictEqual(formatWeight(''), '', 'Empty weight must return empty string');
console.log('✓ Weight with 3 decimals verified (399.500, 500.000)');

// Rate: 2 decimals (212.00, 840.00)
assert.strictEqual(formatRate(212), '212.00', 'Rate 212 must format to 212.00');
assert.strictEqual(formatRate(840), '840.00', 'Rate 840 must format to 840.00');
assert.strictEqual(formatRate(105.5), '105.50', 'Rate 105.5 must format to 105.50');
assert.strictEqual(formatRate(''), '', 'Empty rate must return empty string');
console.log('✓ Rate with 2 decimals verified (212.00, 840.00)');

// Thousands separators: 84,694, 420,000, 2,405,663
assert.strictEqual(formatAmount(84694), '84,694', '84694 must format to 84,694');
assert.strictEqual(formatAmount(420000), '420,000', '420000 must format to 420,000');
assert.strictEqual(formatAmount(2405663), '2,405,663', '2405663 must format to 2,405,663');
assert.strictEqual(formatAmount(2827663), '2,827,663', '2827663 must format to 2,827,663');
console.log('✓ Thousands separators verified (420,000, 2,405,663, 2,827,663)');

// Date: DD-MM-YYYY
assert.strictEqual(formatBillDate('2026-10-08'), '08-10-2026');
assert.strictEqual(formatBillDate('08-10-2026'), '08-10-2026');
console.log('✓ Bill date format DD-MM-YYYY verified');

// -----------------------------------------------------------------------------
// 2. Test User's Specific Prompt Scenario
// "TEST: A Sale of 500 KG at 840 (420,000) plus a service line of 2,000 to a
// party who already owes 2,405,663 (نام) shows: total 422,000 نام, previous
// 2,405,663 نام, received 0, final 2,827,663 نام, and the same figure on that
// party's ledger."
// -----------------------------------------------------------------------------
console.log('\n2. Testing User Test Scenario calculations:');

const testPartyOwes = -2405663; // Party owes us 2,405,663 (نام / Debit balance)
const saleItem1 = { type: 'stock', itemName: 'Raw Cotton', qty: 500, rate: 840, amount: 420000 };
const saleItem2 = { type: 'service', itemName: 'Service Line', serviceDescription: 'Loading Service', qty: 0, rate: '', amount: 2000 };
const totalSaleAmount = saleItem1.amount + saleItem2.amount; // 422,000
const receivedAmount = 0;

const result = computeSaleBillBalances({
  previousBalance: testPartyOwes,
  total: totalSaleAmount,
  received: receivedAmount,
});

console.log('  Calculated Balances:', {
  total: `${result.total} ${result.billSide}`,
  previous: `${result.previousAbs} ${result.previousSide}`,
  received: result.received,
  final: `${result.finalAbs} ${result.finalSide}`,
});

assert.strictEqual(result.total, 422000, 'Total must equal 422,000');
assert.strictEqual(result.billSide, 'نام', 'Sale bill side must be نام');

assert.strictEqual(result.previousAbs, 2405663, 'Previous balance must be 2,405,663 (no minus sign)');
assert.strictEqual(result.previousSide, 'نام', 'Previous balance side must be نام');

assert.strictEqual(result.received, 0, 'Received amount must be 0');

assert.strictEqual(result.finalAbs, 2827663, 'Final balance must be 2,827,663 (no minus sign)');
assert.strictEqual(result.finalSide, 'نام', 'Final balance side must be نام');

console.log('✓ All 4 figures exactly match prompt requirements:');
console.log('   - total 422,000 نام');
console.log('   - previous 2,405,663 نام');
console.log('   - received 0');
console.log('   - final 2,827,663 نام');

// -----------------------------------------------------------------------------
// 3. Test Integration with Party Ledger & getPartyBalanceBeforeInvoice
// -----------------------------------------------------------------------------
console.log('\n3. Testing Party Ledger & Database Integration:');

async function testDatabaseLedgerSync() {
  await db.open();

  // Create party who owes 2,405,663
  const partyId = 'cust_test_2653';
  await db.parties.put({
    id: partyId,
    name: 'عاقب علی',
    type: 'Customer',
    openingBalance: -2405663, // Party owes 2,405,663
    city: 'Faisalabad',
  });

  const billId = 'sal_test_2653';
  const billNo = '2653';
  const saleRecord = {
    id: billId,
    no: billNo,
    date: '2026-10-08',
    customerId: partyId,
    customerName: 'عاقب علی',
    items: [saleItem1, saleItem2],
    total: 422000,
    received: 0,
    balance: 422000,
    createdAt: '2026-10-08T10:00:00Z',
  };

  await db.sales.put(saleRecord);

  // 1. Test getPartyBalanceBeforeInvoice(party, bill)
  const partyObj = await db.parties.get(partyId);
  const prevBalFromDb = await getPartyBalanceBeforeInvoice(partyObj, saleRecord);
  assert.strictEqual(prevBalFromDb, -2405663, 'getPartyBalanceBeforeInvoice must return -2,405,663');
  console.log('✓ getPartyBalanceBeforeInvoice(party, bill) returned -2,405,663');

  // 2. Compute ledger transactions for this party
  const partyTxns = buildPartyTransactions(partyId, {
    party: partyObj,
    sales: [saleRecord],
    purchases: [],
    receipts: [],
    payments: [],
    cashBookEntries: [],
    issues: [],
    journalEntries: [],
  });

  assert.strictEqual(partyTxns.length, 1);
  assert.strictEqual(partyTxns[0].debit, 422000, 'Sale must be debit of 422,000 on customer account');

  // Calculate party ledger closing balance after the bill
  let runningLedgerBal = partyObj.openingBalance;
  for (const t of partyTxns) {
    runningLedgerBal += Number(t.credit || 0) - Number(t.debit || 0);
  }

  assert.strictEqual(runningLedgerBal, -2827663, 'Ledger closing balance must equal -2,827,663');
  assert.strictEqual(Math.abs(runningLedgerBal), result.finalAbs, 'Final bill balance must equal ledger closing balance');

  console.log(`✓ Party ledger closing balance after bill: ${Math.abs(runningLedgerBal)} نام (Exactly matches bill final amount)`);
}

await testDatabaseLedgerSync();

// -----------------------------------------------------------------------------
// 4. Source Inspection of SaleBillMemo.jsx for UI Specifications
// -----------------------------------------------------------------------------
console.log('\n4. Verifying SaleBillMemo.jsx visual & UI specifications:');
const memoSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/common/SaleBillMemo.jsx'), 'utf8');

// 1) Top bar: solid BLACK strip, full width, "BILL / MEMO" on left, "Customer Copy Original" on right
assert(memoSrc.includes('BILL / MEMO'), 'Must have "BILL / MEMO" text in top bar');
assert(memoSrc.includes('Customer Copy Original'), 'Must have "Customer Copy Original" text in top bar');
assert(memoSrc.includes('bg-black') && memoSrc.includes('text-white'), 'Top bar must be solid black strip with white text');
assert(memoSrc.includes('underline'), 'BILL/MEMO title must be underlined');

// 2) Table header: grey background with diagonal hatch pattern (repeating-linear-gradient)
assert(memoSrc.includes('repeating-linear-gradient'), 'Table header must have repeating-linear-gradient hatch pattern');
assert(memoSrc.includes('تعداد'), 'Table header must include تعداد');
assert(memoSrc.includes('تفصیل'), 'Table header must include تفصیل');
assert(memoSrc.includes('وزن'), 'Table header must include وزن');
assert(memoSrc.includes('ریٹ'), 'Table header must include ریٹ');
assert(memoSrc.includes('رقم'), 'Table header must include رقم');

// 3) Total row: "بھول چوک لین دین", total count, side word of bill (نام), and bill total
assert(memoSrc.includes('بھول چوک لین دین'), 'Total row must include "بھول چوک لین دین"');
assert(memoSrc.includes('border-t-2 border-black'), 'Total row must have bold thick top border');

// 4) Three stacked boxes under table on LEFT:
// - سابقہ رقم + side word: grey box, amount in RED
// - وصول پائے: grey box (empty if nothing received)
// - ٹوٹل بقایا رقم + side word: black box, white bold amount
assert(memoSrc.includes('سابقہ رقم') || memoSrc.includes('سابقہ نام رقم'), 'Must include سابقہ رقم label');
assert(memoSrc.includes('text-red-600'), 'Previous balance box must be in red');
assert(memoSrc.includes('وصول پائے'), 'Must include وصول پائے label');
assert(memoSrc.includes('ٹوٹل بقایا رقم') || memoSrc.includes('ٹوٹل بقایا نام رقم'), 'Must include ٹوٹل بقایا رقم label');

// 5) Slashed zero numeric styling
assert(memoSrc.includes('slashed-zero'), 'Must include slashed-zero font styling');

console.log('✓ All SaleBillMemo visual and layout specifications verified successfully!');

console.log('\n=== ALL SALE BILL / MEMO REFINEMENT TESTS PASSED! ===');
