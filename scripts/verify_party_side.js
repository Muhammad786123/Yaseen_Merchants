/**
 * scripts/verify_party_side.js
 *
 * Verifies single source of truth for Urdu and English party balance sides:
 * Rule:
 *   runningBalance > 0 => Cr / جمع (we owe, Jama) -> Green (#16a34a)
 *   runningBalance < 0 => Dr / بنام (party owes us, Benaam) -> Red (#dc2626)
 *   runningBalance = 0 => no label
 *
 * TEST sequence from requirement:
 *   1) Credit 132,000; Debit 80,000 -> 52,000 جمع/Cr
 *   2) Debit 52,000 -> 0 (no label)
 *   3) Debit 60,000 -> 60,000 بنام/Dr
 *   Urdu and English must always agree on every row and in the closing balance.
 */

import { balanceSide, formatBalanceWithSide } from '../src/utils/partySide.js';
import { partySide, splitPartyBalances } from '../src/utils/partyBalances.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== 1. TEST balanceSide function logic ===');
const zero = balanceSide(0);
assert(zero.en === '' && zero.ur === '' && zero.amount === 0, 'Zero balance has no en/ur label and amount 0');

const cred = balanceSide(132000);
assert(cred.en === 'Cr', '132,000 balance gives en: Cr');
assert(cred.ur === 'جمع', '132,000 balance gives ur: جمع');
assert(cred.amount === 132000, '132,000 balance gives amount: 132000');
assert(cred.color === '#16a34a', '132,000 balance gives green color');

const deb = balanceSide(-60000);
assert(deb.en === 'Dr', '-60,000 balance gives en: Dr');
assert(deb.ur === 'بنام', '-60,000 balance gives ur: بنام (not نام)');
assert(deb.amount === 60000, '-60,000 balance gives positive amount: 60000');
assert(deb.color === '#dc2626', '-60,000 balance gives red color');

console.log('\n=== 2. TEST User Specified Flow: Credit 132,000 -> Debit 80,000 -> Debit 52,000 -> Debit 60,000 ===');
// Running balance starts at 0
let runningBalance = 0;

// Step 1: Credit 132,000
runningBalance += 132000;
let step1 = balanceSide(runningBalance);
assert(step1.amount === 132000 && step1.en === 'Cr' && step1.ur === 'جمع', 'Step 1 (Credit 132,000): 132,000 جمع/Cr');

// Step 2: Debit 80,000
runningBalance -= 80000;
let step2 = balanceSide(runningBalance);
assert(step2.amount === 52000, 'Step 2 (Debit 80,000): amount is 52,000');
assert(step2.en === 'Cr', 'Step 2 (Debit 80,000): en is Cr');
assert(step2.ur === 'جمع', 'Step 2 (Debit 80,000): ur is جمع (even though row transaction was a Debit!)');
assert(step2.color === '#16a34a', 'Step 2 (Debit 80,000): color is green (#16a34a)');
assert(formatBalanceWithSide(runningBalance) === '52,000 جمع (Cr)', 'Step 2 formatted string: "52,000 جمع (Cr)"');

// Step 3: Debit 52,000
runningBalance -= 52000;
let step3 = balanceSide(runningBalance);
assert(step3.amount === 0, 'Step 3 (Debit 52,000): amount is 0');
assert(step3.en === '' && step3.ur === '', 'Step 3 (Debit 52,000): 0 -> no label');
assert(formatBalanceWithSide(runningBalance) === '0', 'Step 3 formatted string: "0"');

// Step 4: Debit 60,000
runningBalance -= 60000;
let step4 = balanceSide(runningBalance);
assert(step4.amount === 60000, 'Step 4 (Debit 60,000): amount is 60,000');
assert(step4.en === 'Dr', 'Step 4 (Debit 60,000): en is Dr');
assert(step4.ur === 'بنام', 'Step 4 (Debit 60,000): ur is بنام');
assert(step4.color === '#dc2626', 'Step 4 (Debit 60,000): color is red (#dc2626)');
assert(formatBalanceWithSide(runningBalance) === '60,000 بنام (Dr)', 'Step 4 formatted string: "60,000 بنام (Dr)"');

console.log('\n=== 3. TEST partyBalances.js compatibility delegation ===');
const ps1 = partySide(52000);
assert(ps1.side === 'Cr' && ps1.ur === 'جمع' && ps1.amount === 52000, 'partySide(52000) delegates to Cr/جمع');
const ps2 = partySide(-60000);
assert(ps2.side === 'Dr' && ps2.ur === 'بنام' && ps2.amount === 60000, 'partySide(-60000) delegates to Dr/بنام');
const ps0 = partySide(0);
assert(ps0.side === '' && ps0.ur === '' && ps0.amount === 0, 'partySide(0) gives empty side and 0 amount');

const mockParties = [
  { id: 'p1', name: 'Party A', balance: 52000 },
  { id: 'p2', name: 'Party B', balance: -60000 },
  { id: 'p3', name: 'Party C', balance: 0 },
];
const split = splitPartyBalances(mockParties);
assert(split.receivableParties.length === 1 && split.receivableParties[0].id === 'p2', 'Party B is Receivable (debtor)');
assert(split.totalReceivable === 60000, 'Total receivable is 60,000');
assert(split.payableParties.length === 1 && split.payableParties[0].id === 'p1', 'Party A is Payable (creditor)');
assert(split.totalPayable === 52000, 'Total payable is 52,000');

console.log(`\n========================================`);
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
}
