// scripts/verify_cash_given_flow.js
import { calculateCashBalanceFromEntries } from '../src/services/cashService.js';
import { buildPartyTransactions } from '../src/services/partyService.js';
import { partySide } from '../src/utils/partyBalances.js';

console.log('=== TEST: VERIFY CASHGIVEN & CASH FLOW ACROSS SYSTEM ===\n');

// 1. Initial State
const accounts = [
  { id: 'acc_cash', name: 'Cash', accountType: 'Cash', openingBalance: 3500000, balance: 3500000 },
  { id: 'acc_bank', name: 'Meezan Bank', accountType: 'Bank', openingBalance: 200000, balance: 200000 },
];

const party = {
  id: 'p_10001',
  code: '10001',
  name: 'Lala Aamir',
  openingBalance: 0,
  balance: 0,
};

// 2. Transactions matching the video demonstration:
// - Rs. 80,000 CashGiven (Paid to Lala Aamir / Debit Out)
// - Rs. 50,000 Deposit (Bank deposit / Debit Out)
// - Rs. 100,000 CashReceived (Received from Lala Aamir / Credit In)
// - Rs. 50,000 CashReceived (Received / Credit In)
// - Journal JV line (say Rs. 26,000 Credit In)
const cashBookEntries = [
  {
    id: 'cb_1',
    date: '2026-10-10',
    cashBookNo: 1,
    type: 'CashGiven',
    partyId: party.id,
    partyName: party.name,
    debit: 80000,
    credit: 0,
    description: 'Cash paid to Lala Aamir',
  },
  {
    id: 'cb_2',
    date: '2026-10-10',
    cashBookNo: 1,
    type: 'Deposit',
    bankAccountId: 'acc_bank',
    bankAccountName: 'Meezan Bank',
    debit: 50000,
    credit: 0,
    description: 'Deposit to Meezan Bank',
  },
  {
    id: 'cb_3',
    date: '2026-10-11',
    cashBookNo: 2,
    type: 'CashReceived',
    partyId: party.id,
    partyName: party.name,
    debit: 0,
    credit: 100000,
    description: 'Cash received from Lala Aamir',
  },
  {
    id: 'cb_4',
    date: '2026-10-11',
    cashBookNo: 2,
    type: 'CashReceived',
    accountType: 'general',
    accountName: 'Misc Cash',
    debit: 0,
    credit: 50000,
    description: 'Cash received from misc',
  },
  {
    id: 'cb_5',
    date: '2026-10-12',
    type: 'Journal',
    accountType: 'general',
    accountName: 'Journal Voucher',
    debit: 0,
    credit: 26000,
    description: 'JV 001 - Capital injection',
  },
];

// 3. Verify Cash Book Report Metrics (as shown in the video)
const totalCreditIn = cashBookEntries.reduce((s, e) => s + Number(e.credit || 0), 0);
const totalDebitOut = cashBookEntries.reduce((s, e) => s + Number(e.debit || 0), 0);
const netFilteredCashFlow = totalCreditIn - totalDebitOut;

console.log(`Total Cash Received (In):  Rs. ${totalCreditIn.toLocaleString()}`);
console.log(`Total Cash Paid (Out):      Rs. ${totalDebitOut.toLocaleString()}`);
console.log(`Net Filtered Cash Flow:     Rs. ${netFilteredCashFlow.toLocaleString()}`);

// Debit Out MUST be exactly 80,000 + 50,000 = 130,000
if (totalDebitOut !== 130000) {
  throw new Error(`Expected Total Cash Paid to be 130,000, got ${totalDebitOut}`);
}
console.log('✓ Total Cash Paid (Out) correctly equals Rs. 130,000 (80k CashGiven + 50k Deposit)');

// 4. Verify Physical Cash in Hand Balance
const finalCashInHand = calculateCashBalanceFromEntries(cashBookEntries, accounts);
const expectedCash = 3500000 + totalCreditIn - totalDebitOut;
if (finalCashInHand !== expectedCash) {
  throw new Error(`Expected Cash in Hand to be ${expectedCash}, got ${finalCashInHand}`);
}
console.log(`✓ Physical Cash in Hand calculated correctly: Rs. ${finalCashInHand.toLocaleString()}`);

// 5. Verify Party Ledger for Lala Aamir
const partyTxns = buildPartyTransactions(party.id, {
  purchases: [],
  sales: [],
  receipts: [],
  payments: [],
  cashBookEntries,
  issues: [],
  journalEntries: [],
});

console.log(`Party ledger transactions count: ${partyTxns.length}`);
partyTxns.forEach((t, i) => {
  console.log(`  Row ${i + 1}: ${t.type} | Date: ${t.date} | Debit: ${t.debit} | Credit: ${t.credit} | Detail: ${t.detail}`);
});

if (partyTxns.length !== 2) {
  throw new Error(`Expected 2 party transactions, got ${partyTxns.length}`);
}

const givenRow = partyTxns.find((t) => t.type === 'Cash Given');
const rcvdRow = partyTxns.find((t) => t.type === 'Cash Received');

if (!givenRow || givenRow.debit !== 80000 || givenRow.credit !== 0) {
  throw new Error('Cash Given row in party ledger is incorrect');
}
console.log('✓ Party Ledger correctly records Cash Given as Debit 80,000 (Benaam)');

if (!rcvdRow || rcvdRow.credit !== 100000 || rcvdRow.debit !== 0) {
  throw new Error('Cash Received row in party ledger is incorrect');
}
console.log('✓ Party Ledger correctly records Cash Received as Credit 100,000 (Jama)');

// Party balance: opening (0) + sum(credit) - sum(debit) = 100,000 - 80,000 = +20,000 (Payable / Cr)
const partyBalance = Number(party.openingBalance) + rcvdRow.credit - givenRow.debit;
const side = partySide(partyBalance);
console.log(`✓ Party balance after CashGiven & CashReceived: Rs. ${partyBalance} (${side.side} - ${side.label})`);

if (partyBalance !== 20000) {
  throw new Error(`Expected party balance 20,000, got ${partyBalance}`);
}

console.log('\nALL CASHGIVEN & CASH FLOW VERIFICATION CHECKS PASSED PERFECTLY! 🎉\n');
