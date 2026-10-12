import 'fake-indexeddb/auto';
import assert from 'assert';
import {
  buildPartyTransactions,
  compareTransactionsChronological,
  parseDateToYMD,
} from '../src/services/partyService.js';

console.log('=== TEST: PARTY LEDGER TRANSACTION ORDER (OLDEST ON TOP, NEWEST AT BOTTOM) ===');

// Test 1: Date parsing
assert.strictEqual(parseDateToYMD('2026-10-12'), '2026-10-12');
assert.strictEqual(parseDateToYMD('2026-10-12T14:32:00.000Z'), '2026-10-12');
assert.strictEqual(parseDateToYMD('12/10/2026'), '2026-10-12');
assert.strictEqual(parseDateToYMD('05-10-2026'), '2026-10-05');
console.log('✓ parseDateToYMD correctly normalizes ISO and DD/MM/YYYY dates');

// Test 2: Different dates
{
  const tOld = { id: 's1', date: '2026-10-10', createdAt: '2026-10-10T10:00:00Z', total: 134000 };
  const tNew = { id: 's2', date: '2026-10-12', createdAt: '2026-10-12T10:00:00Z', total: 55000 };

  // Even if input has new first
  const preloaded = {
    sales: [
      { id: 's2', date: '2026-10-12', createdAt: '2026-10-12T10:00:00Z', customerId: 'p1', total: 55000, no: 'SAL-0002' },
      { id: 's1', date: '2026-10-10', createdAt: '2026-10-10T10:00:00Z', customerId: 'p1', total: 134000, no: 'SAL-0001' },
    ],
  };

  const txns = buildPartyTransactions('p1', preloaded);
  assert.strictEqual(txns.length, 2);
  assert.strictEqual(txns[0].id, 's1', 'Older transaction must be at index 0 (top)');
  assert.strictEqual(txns[1].id, 's2', 'Newer transaction must be at index 1 (bottom)');

  let runningBalance = 0;
  const ledgerRows = txns.map((t) => {
    runningBalance += Number(t.credit || 0) - Number(t.debit || 0);
    return { ...t, balance: runningBalance };
  });

  // For customer: Sale is debit (customer owes us, negative in internal convention, or debit 134,000)
  assert.strictEqual(ledgerRows[0].debit, 134000);
  assert.strictEqual(ledgerRows[0].balance, -134000);
  assert.strictEqual(ledgerRows[1].debit, 55000);
  assert.strictEqual(ledgerRows[1].balance, -189000);
  console.log('✓ Different dates: Older (134,000) on top, newer (189,000) at bottom');
}

// Test 3: SAME DATE transactions (e.g. both on 2026-10-12, where useSales returns them in reverse order)
{
  const preloadedSameDate = {
    sales: [
      // Second sale created later
      {
        id: 'sal_1728739000000_def',
        date: '2026-10-12',
        createdAt: '2026-10-12T14:30:00.000Z',
        customerId: '10001',
        total: 55000,
        no: 'SAL-0002',
      },
      // First sale created earlier
      {
        id: 'sal_1728735000000_abc',
        date: '2026-10-12',
        createdAt: '2026-10-12T10:15:00.000Z',
        customerId: '10001',
        total: 134000,
        no: 'SAL-0001',
      },
    ],
  };

  const txns = buildPartyTransactions('10001', preloadedSameDate);
  assert.strictEqual(txns.length, 2);
  assert.strictEqual(txns[0].id, 'sal_1728735000000_abc', 'First/earlier sale must come first (top of table)');
  assert.strictEqual(txns[1].id, 'sal_1728739000000_def', 'Second/later sale must come second (bottom of table)');

  let runningBalance = 0;
  const ledgerRows = txns.map((t) => {
    runningBalance += Number(t.credit || 0) - Number(t.debit || 0);
    return { ...t, balance: runningBalance };
  });

  console.log('Row 0 (Top):', ledgerRows[0].billNo, 'Debit:', ledgerRows[0].debit, 'Balance:', Math.abs(ledgerRows[0].balance));
  console.log('Row 1 (Bottom):', ledgerRows[1].billNo, 'Debit:', ledgerRows[1].debit, 'Balance:', Math.abs(ledgerRows[1].balance));

  assert.strictEqual(Math.abs(ledgerRows[0].balance), 134000, 'Top row balance should be 134,000');
  assert.strictEqual(Math.abs(ledgerRows[1].balance), 189000, 'Bottom row balance should be 189,000');
  console.log('✓ Same date: Earlier transaction (134,000) on top, later transaction (189,000) at bottom');
}

// Test 4: Mixed vouchers (Sale and Receipt on same date)
{
  const preloadedMixed = {
    sales: [
      {
        id: 'sal_1728735000000_1',
        date: '2026-10-12',
        createdAt: '2026-10-12T09:00:00.000Z',
        customerId: '10001',
        total: 189000,
        no: 'SAL-0001',
      },
    ],
    receipts: [
      {
        id: 'rec_1728740000000_2',
        date: '2026-10-12',
        createdAt: '2026-10-12T15:00:00.000Z',
        partyId: '10001',
        amount: 55000,
        no: 'RCT-0001',
      },
    ],
  };

  const txns = buildPartyTransactions('10001', preloadedMixed);
  assert.strictEqual(txns.length, 2);
  assert.strictEqual(txns[0].id, 'sal_1728735000000_1', 'Morning sale must be on top');
  assert.strictEqual(txns[1].id, 'rec_1728740000000_2', 'Afternoon receipt must be at bottom');

  let runningBalance = 0;
  const ledgerRows = txns.map((t) => {
    runningBalance += Number(t.credit || 0) - Number(t.debit || 0);
    return { ...t, balance: runningBalance };
  });

  console.log('Row 0 (Morning Sale):', ledgerRows[0].billNo, 'Debit:', ledgerRows[0].debit, 'Balance:', Math.abs(ledgerRows[0].balance));
  console.log('Row 1 (Afternoon Receipt):', ledgerRows[1].billNo, 'Credit:', ledgerRows[1].credit, 'Balance:', Math.abs(ledgerRows[1].balance));

  assert.strictEqual(Math.abs(ledgerRows[0].balance), 189000, 'Top row balance should be 189,000');
  assert.strictEqual(Math.abs(ledgerRows[1].balance), 134000, 'Bottom row balance should be 134,000');
  console.log('✓ Mixed vouchers: Older (189,000) on top, payment (bringing to 134,000) at bottom');
}

console.log('ALL PARTY LEDGER ORDER TESTS PASSED! 🎉');
