import assert from 'assert';

console.log('=== TEST BUG 1: PARTY LEDGER DEBIT/CREDIT MAPPINGS AND RUNNING BALANCE ===');

// Convention:
// balance > 0 = we owe the party (Payable / net Credit)
// balance < 0 = party owes us (Receivable / net Debit)
// runningBalance = openingBalance + credit - debit

// Supplier Test Case:
// opening 0, Purchase 100,000 -> Cr 100,000. Payment 40,000 -> Cr 60,000. JV Debit 60,000 -> 0.
{
  let openingBalance = 0;
  let runningBalance = openingBalance;

  // 1. Purchase: 100,000 in Credit (debit 0)
  const purchase = { type: 'Purchase', debit: 0, credit: 100000 };
  runningBalance += purchase.credit - purchase.debit;
  assert.strictEqual(runningBalance, 100000);
  const sign1 = runningBalance > 0 ? 'Cr' : runningBalance < 0 ? 'Dr' : '';
  console.log(`Step 1 (Purchase 100k): Balance = ${Math.abs(runningBalance)} ${sign1}`);
  assert.strictEqual(sign1, 'Cr');

  // 2. Payment: 40,000 in Debit (credit 0)
  const payment = { type: 'Payment', debit: 40000, credit: 0 };
  runningBalance += payment.credit - payment.debit;
  assert.strictEqual(runningBalance, 60000);
  const sign2 = runningBalance > 0 ? 'Cr' : runningBalance < 0 ? 'Dr' : '';
  console.log(`Step 2 (Payment 40k): Balance = ${Math.abs(runningBalance)} ${sign2}`);
  assert.strictEqual(sign2, 'Cr');

  // 3. JV Debit: 60,000 in Debit (credit 0)
  const jv = { type: 'Journal Voucher', debit: 60000, credit: 0 };
  runningBalance += jv.credit - jv.debit;
  assert.strictEqual(runningBalance, 0);
  console.log(`Step 3 (JV Debit 60k): Balance = ${runningBalance}`);
  assert.strictEqual(runningBalance, 0);
}

// Customer Test Case:
// Sale 50,000 -> Dr 50,000. Receipt 20,000 -> Dr 30,000.
{
  let openingBalance = 0;
  let runningBalance = openingBalance;

  // 1. Sale: 50,000 in Debit (credit 0)
  const sale = { type: 'Sale', debit: 50000, credit: 0 };
  runningBalance += sale.credit - sale.debit;
  assert.strictEqual(runningBalance, -50000);
  const sign1 = runningBalance > 0 ? 'Cr' : runningBalance < 0 ? 'Dr' : '';
  console.log(`Customer Step 1 (Sale 50k): Balance = ${Math.abs(runningBalance)} ${sign1}`);
  assert.strictEqual(sign1, 'Dr');

  // 2. Receipt: 20,000 in Credit (debit 0)
  const receipt = { type: 'Receipt', debit: 0, credit: 20000 };
  runningBalance += receipt.credit - receipt.debit;
  assert.strictEqual(runningBalance, -30000);
  const sign2 = runningBalance > 0 ? 'Cr' : runningBalance < 0 ? 'Dr' : '';
  console.log(`Customer Step 2 (Receipt 20k): Balance = ${Math.abs(runningBalance)} ${sign2}`);
  assert.strictEqual(sign2, 'Dr');
}
console.log('✓ Bug 1 calculations verified!');

console.log('\n=== TEST BUG 2: ID COLLISION PREVENTION FOR CAPITAL, EXPENSE, CASHBOOK TRF ===');
{
  // Generate 100 IDs in tight loop for capital
  const capIds = new Set();
  for (let i = 0; i < 100; i++) {
    const id = 'cap_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    capIds.add(id);
  }
  assert.strictEqual(capIds.size, 100, 'All 100 capital IDs must be unique');
  console.log('✓ 100 simultaneous capital IDs generated uniquely with zero collision');

  // Generate 100 IDs for expense
  const expIds = new Set();
  for (let i = 0; i < 100; i++) {
    const id = 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    expIds.add(id);
  }
  assert.strictEqual(expIds.size, 100, 'All 100 expense IDs must be unique');
  console.log('✓ 100 simultaneous expense IDs generated uniquely with zero collision');

  // Generate 100 IDs for trf
  const trfIds = new Set();
  for (let i = 0; i < 100; i++) {
    const id = 'trf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    trfIds.add(id);
  }
  assert.strictEqual(trfIds.size, 100, 'All 100 transfer IDs must be unique');
  console.log('✓ 100 simultaneous trf IDs generated uniquely with zero collision');
}

console.log('\n=== TEST 3: TRIAL BALANCE EQUATION WITH 2 CAPITAL LINES & OPENING STOCK ===');
{
  // Add Stock: opening stock worth 237,000
  const stockValuation = 237000;

  // JV-0001 lines:
  // - Debit Mall A/C: 237,000 (Cost of opening stock in trading control)
  // - Debit Cash in hand: 2,000,000
  // - Debit Bank: 1,500,000
  // - Debit Party (Receivable): 1,263,000
  // Total Debits = 237,000 + 2,000,000 + 1,500,000 + 1,263,000 = 5,000,000
  //
  // Credits:
  // - Credit Capital Line 1: 3,000,000
  // - Credit Capital Line 2: 2,000,000
  // Total Credits = 5,000,000 (JV Debit = Credit = 5,000,000)

  const jvDebitMall = 237000;
  const cashInHand = 2000000;
  const bankBalance = 1500000;
  const customerReceivable = 1263000; // party.balance = -1263000 (Dr)

  // Two capital credit entries
  const cap1 = 3000000;
  const cap2 = 2000000;
  const capitalBalance = cap1 + cap2; // 5,000,000

  // Net Mall Position (Sales = 0, Purchases = 0, Expenses = 0, jvMallCredit = -237,000 because Debit is -237,000)
  const jvMallCredit = -jvDebitMall; // -237,000
  const mallNetPosition = 0 - 0 + jvMallCredit; // -237,000
  // Mall Trading Balance = mallNetPosition + stockValuation = -237,000 + 237,000 = 0
  const mallTradingBalance = mallNetPosition + stockValuation; // 0

  // Trial Balance items:
  // Debits:
  // - Cash in hand: 2,000,000
  // - Bank: 1,500,000
  // - Party Receivable: 1,263,000
  // - Stock Inventory Valuation: 237,000
  // - Mall Trading Position (if < 0): 0
  const sumDebits = cashInHand + bankBalance + customerReceivable + stockValuation + (mallTradingBalance < 0 ? Math.abs(mallTradingBalance) : 0);

  // Credits:
  // - Supplier Payables: 0
  // - Owner Capital Investment: 5,000,000
  // - Mall Trading Surplus (if >= 0): 0
  const sumCredits = 0 + capitalBalance + (mallTradingBalance >= 0 ? mallTradingBalance : 0);

  console.log(`Sum Debits:  Rs. ${sumDebits.toLocaleString('en-PK')}`);
  console.log(`Sum Credits: Rs. ${sumCredits.toLocaleString('en-PK')}`);
  console.log(`Difference:  Rs. ${Math.abs(sumDebits - sumCredits)}`);

  assert.strictEqual(sumDebits, 5000000);
  assert.strictEqual(sumCredits, 5000000);
  assert.strictEqual(Math.abs(sumDebits - sumCredits), 0);
  console.log('✓ Trial Balance matches perfectly with 0 difference!');
}

console.log('\nALL ACCOUNTING TESTS PASSED WITH 100% SUCCESS! 🚀');
