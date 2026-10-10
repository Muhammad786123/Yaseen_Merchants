import 'fake-indexeddb/auto';
import { db, clearAllDatabaseData } from '../src/db/database.js';
import { journalService } from '../src/services/journalService.js';
import { purchaseService } from '../src/services/purchaseService.js';
import { saleService } from '../src/services/saleService.js';
import { expenseService } from '../src/services/expenseService.js';
import { cashBookService } from '../src/services/cashBookService.js';
import { capitalService } from '../src/services/capitalService.js';
import { syncStockEntriesToDb } from '../src/utils/stockUtils.js';

async function computeTB(parties, accounts) {
  // Parties
  const tbPartiesDebit = parties
    .filter((p) => Number(p.balance || 0) < 0)
    .reduce((s, p) => s + Math.abs(Number(p.balance || 0)), 0);
  const tbPartiesCredit = parties
    .filter((p) => Number(p.balance || 0) > 0)
    .reduce((s, p) => s + Number(p.balance || 0), 0);

  // Cash
  const cashAcc = accounts.find((a) => a.name.toLowerCase().includes('cash'));
  const cashBal = Number(cashAcc?.balance || 0);
  const tbCashDebit = cashBal >= 0 ? cashBal : 0;
  const tbCashCredit = cashBal < 0 ? Math.abs(cashBal) : 0;

  // Banks
  const bankAccs = accounts.filter((a) => !a.name.toLowerCase().includes('cash'));
  const tbBanksDebit = bankAccs.reduce((s, b) => {
    const bal = Number(b.balance || 0);
    return s + (bal >= 0 ? bal : 0);
  }, 0);
  const tbBanksCredit = bankAccs.reduce((s, b) => {
    const bal = Number(b.balance || 0);
    return s + (bal < 0 ? Math.abs(bal) : 0);
  }, 0);

  // Capital (from capitalService.getBalance())
  const capitalBalance = await capitalService.getBalance();
  const tbCapitalDebit = capitalBalance < 0 ? Math.abs(capitalBalance) : 0;
  const tbCapitalCredit = capitalBalance >= 0 ? capitalBalance : 0;

  // Mall A/C: 0 if no purchases/sales/expenses
  const tbMallDebit = 0;
  const tbMallCredit = 0;

  const totalDebit = tbPartiesDebit + tbCashDebit + tbBanksDebit + (capitalBalance !== 0 ? tbCapitalDebit : 0) + tbMallDebit;
  const totalCredit = tbPartiesCredit + tbCashCredit + tbBanksCredit + (capitalBalance !== 0 ? tbCapitalCredit : 0) + tbMallCredit;
  const diff = Math.abs(totalDebit - totalCredit);

  return {
    tbPartiesDebit,
    tbPartiesCredit,
    tbCashDebit,
    tbCashCredit,
    tbBanksDebit,
    tbBanksCredit,
    capitalBalance,
    tbCapitalDebit,
    tbCapitalCredit,
    totalDebit,
    totalCredit,
    diff,
    isBalanced: diff < 0.01
  };
}

async function runTests() {
  console.log('=== STARTING TEST SEQUENCE ===');

  // STEP 0: Reset Database
  console.log('\n[Step 0] Resetting Database...');
  await clearAllDatabaseData();

  // Create a test party
  const testParty = {
    id: 'pty_test_1',
    name: 'Al-Madina Traders',
    type: 'Supplier',
    city: 'Faisalabad',
    phone: '03001234567',
    balance: 0,
    openingBalance: 0
  };
  await db.parties.add(testParty);

  // Create an item and warehouse for purchase test
  const testItem = {
    id: 'itm_test_1',
    code: 'RAW-001',
    name: 'Raw Cotton Waste',
    category: 'Raw Material',
    quality: 'Super White'
  };
  await db.items.add(testItem);

  const testWarehouse = {
    id: 'wh_test_1',
    name: 'Main Mill Godown',
    type: 'Godown'
  };
  await db.warehouses.add(testWarehouse);

  console.log('Database reset clean. Seeded test party, item, warehouse.');

  // =========================================================================
  // (a) Save a JV with Capital credit 5,000,000, Cash debit 3,000,000, party debit 2,000,000.
  // =========================================================================
  console.log('\n--- (a) Save JV: Capital credit 5,000,000 | Cash debit 3,000,000 | Party debit 2,000,000 ---');
  const jvEntry = {
    no: 'JV-0001',
    date: '2026-10-10',
    narration: 'Owner investment & initial party advance',
    lines: [
      {
        accountType: 'Capital',
        accountId: '',
        accountName: 'Capital Account',
        description: 'Capital Investment',
        debit: 0,
        credit: 5000000
      },
      {
        accountType: 'Cash',
        accountId: 'acc_cash',
        accountName: 'Cash in Hand',
        description: 'Cash Inflow from Capital',
        debit: 3000000,
        credit: 0
      },
      {
        accountType: 'Party',
        accountId: testParty.id,
        accountName: testParty.name,
        description: 'Advance to Party',
        debit: 2000000,
        credit: 0
      }
    ]
  };

  const savedJv = await journalService.add(jvEntry);
  console.log('Saved JV ID:', savedJv.id);

  let parties = await db.parties.toArray();
  let accounts = await db.accounts.toArray();
  let capitalEntries = await db.capitalEntries.toArray();
  let cashBookEntries = await db.cashBookEntries.toArray();

  let pty = parties.find(p => p.id === testParty.id);
  let cashAcc = accounts.find(a => a.name.toLowerCase().includes('cash'));

  console.log(`Party balance: ${pty.balance} (Expected: -2000000 receivable)`);
  console.log(`Cash account balance: ${cashAcc.balance} (Expected: 3000000)`);
  console.log(`Capital entries count: ${capitalEntries.length} (Expected: 1)`);
  console.log(`CashBook entries count: ${cashBookEntries.length} (Expected: 1)`);

  let tbA = await computeTB(parties, accounts);
  console.log(`Trial Balance: Total Debit = ${tbA.totalDebit}, Total Credit = ${tbA.totalCredit}, Diff = ${tbA.diff}, Balanced = ${tbA.isBalanced}`);

  if (!tbA.isBalanced || pty.balance !== -2000000 || cashAcc.balance !== 3000000 || tbA.capitalBalance !== 5000000) {
    throw new Error('Test (a) FAILED!');
  }
  console.log('>>> Test (a) PASSED: Trial Balance balanced, party balance -2M, cash 3M, capital 5M.');

  // =========================================================================
  // (b) Edit the JV: change party debit to 1,500,000 and Cash to 3,500,000.
  // =========================================================================
  console.log('\n--- (b) Edit JV: Party debit 1,500,000 | Cash debit 3,500,000 | Capital credit 5,000,000 ---');
  const editedJv = {
    ...savedJv,
    narration: 'Owner investment & adjusted party advance',
    lines: [
      {
        accountType: 'Capital',
        accountId: '',
        accountName: 'Capital Account',
        description: 'Capital Investment',
        debit: 0,
        credit: 5000000
      },
      {
        accountType: 'Cash',
        accountId: 'acc_cash',
        accountName: 'Cash in Hand',
        description: 'Cash Inflow from Capital',
        debit: 3500000,
        credit: 0
      },
      {
        accountType: 'Party',
        accountId: testParty.id,
        accountName: testParty.name,
        description: 'Adjusted Advance to Party',
        debit: 1500000,
        credit: 0
      }
    ]
  };

  const updatedJv = await journalService.update(savedJv.id, editedJv);
  console.log('Updated JV editCount:', updatedJv.editCount);

  parties = await db.parties.toArray();
  accounts = await db.accounts.toArray();
  capitalEntries = await db.capitalEntries.toArray();
  cashBookEntries = await db.cashBookEntries.toArray();

  pty = parties.find(p => p.id === testParty.id);
  cashAcc = accounts.find(a => a.name.toLowerCase().includes('cash'));

  console.log(`Party balance: ${pty.balance} (Expected: -1500000 receivable)`);
  console.log(`Cash account balance: ${cashAcc.balance} (Expected: 3500000)`);
  console.log(`Capital entries count: ${capitalEntries.length} (Expected: 1, no duplicate)`);
  console.log(`CashBook entries count: ${cashBookEntries.length} (Expected: 1, no duplicate)`);

  let tbB = await computeTB(parties, accounts);
  console.log(`Trial Balance: Total Debit = ${tbB.totalDebit}, Total Credit = ${tbB.totalCredit}, Diff = ${tbB.diff}, Balanced = ${tbB.isBalanced}`);

  if (!tbB.isBalanced || pty.balance !== -1500000 || cashAcc.balance !== 3500000 || capitalEntries.length !== 1 || cashBookEntries.length !== 1) {
    throw new Error('Test (b) FAILED!');
  }
  console.log('>>> Test (b) PASSED: Trial Balance balanced, party balance -1.5M, cash 3.5M, 0 duplicates.');

  // =========================================================================
  // (c) Delete the JV: parties, cash, bank, capital and Trial Balance return exactly to zero.
  // =========================================================================
  console.log('\n--- (c) Delete JV: return all to exactly zero ---');
  await journalService.delete(savedJv.id);

  parties = await db.parties.toArray();
  accounts = await db.accounts.toArray();
  capitalEntries = await db.capitalEntries.toArray();
  cashBookEntries = await db.cashBookEntries.toArray();

  pty = parties.find(p => p.id === testParty.id);
  cashAcc = accounts.find(a => a.name.toLowerCase().includes('cash'));

  console.log(`Party balance: ${pty.balance} (Expected: 0)`);
  console.log(`Cash account balance: ${cashAcc.balance} (Expected: 0)`);
  console.log(`Capital entries count: ${capitalEntries.length} (Expected: 0)`);
  console.log(`CashBook entries count: ${cashBookEntries.length} (Expected: 0)`);

  let tbC = await computeTB(parties, accounts);
  console.log(`Trial Balance: Total Debit = ${tbC.totalDebit}, Total Credit = ${tbC.totalCredit}, Diff = ${tbC.diff}, Balanced = ${tbC.isBalanced}`);

  if (!tbC.isBalanced || pty.balance !== 0 || cashAcc.balance !== 0 || tbC.totalDebit !== 0 || tbC.totalCredit !== 0) {
    throw new Error('Test (c) FAILED!');
  }
  console.log('>>> Test (c) PASSED: Party, cash, bank, capital, Trial Balance all returned exactly to 0.');

  // =========================================================================
  // (d) Create a Purchase of 100,000 with 40,000 paid, edit it to 120,000 with 50,000 paid,
  // and check the supplier balance (70,000 payable) and Cash Book.
  // Delete it and confirm all balances return to the starting values.
  // =========================================================================
  console.log('\n--- (d) Create Purchase of 100,000 with 40,000 paid ---');
  const purchaseData = {
    no: 'PUR-0001',
    date: '2026-10-10',
    supplierId: testParty.id,
    supplierName: testParty.name,
    warehouseId: testWarehouse.id,
    warehouseName: testWarehouse.name,
    items: [
      {
        itemId: testItem.id,
        itemName: testItem.name,
        quality: testItem.quality,
        qty: 1000,
        rate: 100,
        amount: 100000
      }
    ],
    total: 100000,
    paidAmount: 40000,
    paymentMethod: 'Cash',
    paidAccount: 'Cash',
    status: 'Partial'
  };

  const savedPur = await purchaseService.add(purchaseData);
  console.log('Saved Purchase ID:', savedPur.id);

  parties = await db.parties.toArray();
  accounts = await db.accounts.toArray();
  cashBookEntries = await db.cashBookEntries.toArray();
  pty = parties.find(p => p.id === testParty.id);
  cashAcc = accounts.find(a => a.name.toLowerCase().includes('cash'));

  console.log(`Supplier balance: ${pty.balance} (Expected: 60000 payable)`);
  console.log(`Cash balance: ${cashAcc.balance} (Expected: -40000 paid out)`);
  console.log(`CashBook entries: ${cashBookEntries.length} (Expected: 1)`);

  if (pty.balance !== 60000 || cashAcc.balance !== -40000 || cashBookEntries.length !== 1) {
    throw new Error('Test (d) Initial Purchase FAILED!');
  }

  console.log('\n--- (d) Edit Purchase to 120,000 with 50,000 paid ---');
  const editedPurData = {
    ...savedPur,
    items: [
      {
        itemId: testItem.id,
        itemName: testItem.name,
        quality: testItem.quality,
        qty: 1200,
        rate: 100,
        amount: 120000
      }
    ],
    total: 120000,
    paid: 50000,
    paidAmount: 50000,
    paymentMethod: 'Cash',
    paymentAccount: 'Cash',
    paidAccount: 'Cash',
    status: 'Partial'
  };

  await purchaseService.update(savedPur.id, editedPurData);

  parties = await db.parties.toArray();
  accounts = await db.accounts.toArray();
  cashBookEntries = await db.cashBookEntries.toArray();
  pty = parties.find(p => p.id === testParty.id);
  cashAcc = accounts.find(a => a.name.toLowerCase().includes('cash'));

  console.log(`Supplier balance after edit: ${pty.balance} (Expected: 70000 payable)`);
  console.log(`Cash balance after edit: ${cashAcc.balance} (Expected: -50000)`);
  console.log(`CashBook entries: ${cashBookEntries.length} (Expected: 1, replaced not duplicated)`);
  console.log(`CashBook debit (outflow): ${cashBookEntries[0]?.debit} (Expected: 50000)`);

  if (pty.balance !== 70000 || cashAcc.balance !== -50000 || cashBookEntries.length !== 1 || cashBookEntries[0]?.debit !== 50000) {
    throw new Error('Test (d) Edit Purchase FAILED!');
  }
  console.log('>>> Test (d) Edit Purchase PASSED: Supplier payable 70k, Cash book 50k, 0 duplicates.');

  console.log('\n--- (d) Delete Purchase and confirm balances return to starting values ---');
  await purchaseService.delete(savedPur.id);

  parties = await db.parties.toArray();
  accounts = await db.accounts.toArray();
  cashBookEntries = await db.cashBookEntries.toArray();
  pty = parties.find(p => p.id === testParty.id);
  cashAcc = accounts.find(a => a.name.toLowerCase().includes('cash'));

  console.log(`Supplier balance after delete: ${pty.balance} (Expected: 0)`);
  console.log(`Cash balance after delete: ${cashAcc.balance} (Expected: 0)`);
  console.log(`CashBook entries after delete: ${cashBookEntries.length} (Expected: 0)`);

  if (pty.balance !== 0 || cashAcc.balance !== 0 || cashBookEntries.length !== 0) {
    throw new Error('Test (d) Delete Purchase FAILED!');
  }
  console.log('>>> Test (d) Delete Purchase PASSED: All balances returned to starting values (0).');

  // =========================================================================
  // (e) Sale: Create 200,000 with 80,000 received -> Edit to 250,000 with 100,000 received -> Delete
  // =========================================================================
  console.log('\n--- (e) Create Sale 200,000 with 80,000 received ---');
  const saleData = {
    no: 'SAL-0001',
    date: '2026-10-10',
    customerId: testParty.id,
    customerName: testParty.name,
    warehouseId: testWarehouse.id,
    warehouseName: testWarehouse.name,
    items: [
      {
        itemId: testItem.id,
        itemName: testItem.name,
        quality: testItem.quality,
        qty: 1000,
        rate: 200,
        amount: 200000
      }
    ],
    total: 200000,
    received: 80000,
    receivedAccount: 'Cash',
    status: 'Partial'
  };

  const savedSale = await saleService.add(saleData);
  parties = await db.parties.toArray();
  accounts = await db.accounts.toArray();
  cashBookEntries = await db.cashBookEntries.toArray();
  pty = parties.find(p => p.id === testParty.id);
  cashAcc = accounts.find(a => a.name.toLowerCase().includes('cash'));

  console.log(`Customer balance: ${pty.balance} (Expected: -120000 receivable)`);
  console.log(`Cash balance: ${cashAcc.balance} (Expected: 80000 inflow)`);
  if (pty.balance !== -120000 || cashAcc.balance !== 80000 || cashBookEntries.length !== 1) {
    throw new Error('Test (e) Initial Sale FAILED!');
  }

  console.log('\n--- (e) Edit Sale to 250,000 with 100,000 received ---');
  const editedSaleData = {
    ...savedSale,
    total: 250000,
    received: 100000,
    receivedAccount: 'Cash',
    items: [
      {
        itemId: testItem.id,
        itemName: testItem.name,
        quality: testItem.quality,
        qty: 1250,
        rate: 200,
        amount: 250000
      }
    ]
  };

  await saleService.update(savedSale.id, editedSaleData);
  parties = await db.parties.toArray();
  accounts = await db.accounts.toArray();
  cashBookEntries = await db.cashBookEntries.toArray();
  pty = parties.find(p => p.id === testParty.id);
  cashAcc = accounts.find(a => a.name.toLowerCase().includes('cash'));

  console.log(`Customer balance after edit: ${pty.balance} (Expected: -150000 receivable)`);
  console.log(`Cash balance after edit: ${cashAcc.balance} (Expected: 100000)`);
  console.log(`CashBook entries count: ${cashBookEntries.length} (Expected: 1, no duplicate)`);
  if (pty.balance !== -150000 || cashAcc.balance !== 100000 || cashBookEntries.length !== 1) {
    throw new Error('Test (e) Edit Sale FAILED!');
  }
  console.log('>>> Test (e) Edit Sale PASSED: Customer receivable 150k, Cash book 100k, 0 duplicates.');

  console.log('\n--- (e) Delete Sale and confirm balances return to starting values ---');
  await saleService.delete(savedSale.id);
  parties = await db.parties.toArray();
  accounts = await db.accounts.toArray();
  cashBookEntries = await db.cashBookEntries.toArray();
  pty = parties.find(p => p.id === testParty.id);
  cashAcc = accounts.find(a => a.name.toLowerCase().includes('cash'));

  console.log(`Customer balance after delete: ${pty.balance} (Expected: 0)`);
  console.log(`Cash balance after delete: ${cashAcc.balance} (Expected: 0)`);
  if (pty.balance !== 0 || cashAcc.balance !== 0 || cashBookEntries.length !== 0) {
    throw new Error('Test (e) Delete Sale FAILED!');
  }
  console.log('>>> Test (e) Delete Sale PASSED: All balances returned to starting values (0).');

  // =========================================================================
  // (f) Expense: Record 10,000 from Cash -> Edit to 15,000 -> Delete
  // =========================================================================
  console.log('\n--- (f) Expense: Create 10,000 from Cash ---');
  const savedExp = await expenseService.add({
    date: '2026-10-10',
    description: 'Factory electricity bill',
    category: 'Electricity Bill',
    amount: 10000,
    account: 'Cash'
  });

  accounts = await db.accounts.toArray();
  cashBookEntries = await db.cashBookEntries.toArray();
  cashAcc = accounts.find(a => a.name.toLowerCase().includes('cash'));
  console.log(`Cash balance after expense: ${cashAcc.balance} (Expected: -10000)`);
  console.log(`CashBook entries: ${cashBookEntries.length} (Expected: 1)`);
  if (cashAcc.balance !== -10000 || cashBookEntries.length !== 1) {
    throw new Error('Test (f) Initial Expense FAILED!');
  }

  console.log('\n--- (f) Edit Expense to 15,000 ---');
  await expenseService.update(savedExp.id, {
    date: '2026-10-10',
    description: 'Updated factory electricity bill',
    category: 'Electricity Bill',
    amount: 15000,
    account: 'Cash'
  });

  accounts = await db.accounts.toArray();
  cashBookEntries = await db.cashBookEntries.toArray();
  cashAcc = accounts.find(a => a.name.toLowerCase().includes('cash'));
  console.log(`Cash balance after edit: ${cashAcc.balance} (Expected: -15000)`);
  console.log(`CashBook entries: ${cashBookEntries.length} (Expected: 1, no duplicate)`);
  console.log(`CashBook debit: ${cashBookEntries[0]?.debit} (Expected: 15000)`);
  if (cashAcc.balance !== -15000 || cashBookEntries.length !== 1 || cashBookEntries[0]?.debit !== 15000) {
    throw new Error('Test (f) Edit Expense FAILED!');
  }
  console.log('>>> Test (f) Edit Expense PASSED: Cash balance -15k, Cash book 15k, 0 duplicates.');

  console.log('\n--- (f) Delete Expense and confirm balances return to starting values ---');
  await expenseService.delete(savedExp.id);
  accounts = await db.accounts.toArray();
  cashBookEntries = await db.cashBookEntries.toArray();
  cashAcc = accounts.find(a => a.name.toLowerCase().includes('cash'));
  console.log(`Cash balance after delete: ${cashAcc.balance} (Expected: 0)`);
  if (cashAcc.balance !== 0 || cashBookEntries.length !== 0) {
    throw new Error('Test (f) Delete Expense FAILED!');
  }
  console.log('>>> Test (f) Delete Expense PASSED: Cash balance returned to 0.');

  // =========================================================================
  // (g) Cash Book Manual Entry & Locking:
  // Add manual entry for party Cash Given 25,000 -> Edit to 30,000 -> Delete
  // And confirm linked entries are locked from direct edit/delete
  // =========================================================================
  console.log('\n--- (g) Cash Book: Add manual entry (Cash Given 25,000) ---');
  const manualCb = await cashBookService.addEntry({
    date: '2026-10-10',
    type: 'Payment',
    partyId: testParty.id,
    partyName: testParty.name,
    debit: 25000,
    credit: 0,
    description: 'Manual cash payment to supplier',
    linkedTransactionId: null
  });

  parties = await db.parties.toArray();
  accounts = await db.accounts.toArray();
  pty = parties.find(p => p.id === testParty.id);
  cashAcc = accounts.find(a => a.name.toLowerCase().includes('cash'));
  console.log(`Party balance after cash given: ${pty.balance} (Expected: -25000)`);
  console.log(`Cash balance after cash given: ${cashAcc.balance} (Expected: -25000)`);
  if (pty.balance !== -25000 || cashAcc.balance !== -25000) {
    throw new Error('Test (g) Initial Manual Cash Entry FAILED!');
  }

  console.log('\n--- (g) Edit manual Cash Book entry to 30,000 ---');
  await cashBookService.update(manualCb.id, {
    date: '2026-10-10',
    type: 'Payment',
    partyId: testParty.id,
    partyName: testParty.name,
    debit: 30000,
    credit: 0,
    description: 'Updated manual cash payment to supplier'
  });

  parties = await db.parties.toArray();
  accounts = await db.accounts.toArray();
  pty = parties.find(p => p.id === testParty.id);
  cashAcc = accounts.find(a => a.name.toLowerCase().includes('cash'));
  console.log(`Party balance after edit: ${pty.balance} (Expected: -30000)`);
  console.log(`Cash balance after edit: ${cashAcc.balance} (Expected: -30000)`);
  if (pty.balance !== -30000 || cashAcc.balance !== -30000) {
    throw new Error('Test (g) Edit Manual Cash Entry FAILED!');
  }
  console.log('>>> Test (g) Edit Manual Cash Entry PASSED: Party balance -30k, Cash balance -30k.');

  console.log('\n--- (g) Delete manual Cash Book entry ---');
  await cashBookService.delete(manualCb.id);
  parties = await db.parties.toArray();
  accounts = await db.accounts.toArray();
  pty = parties.find(p => p.id === testParty.id);
  cashAcc = accounts.find(a => a.name.toLowerCase().includes('cash'));
  console.log(`Party balance after delete: ${pty.balance} (Expected: 0)`);
  console.log(`Cash balance after delete: ${cashAcc.balance} (Expected: 0)`);
  if (pty.balance !== 0 || cashAcc.balance !== 0) {
    throw new Error('Test (g) Delete Manual Cash Entry FAILED!');
  }
  console.log('>>> Test (g) Delete Manual Cash Entry PASSED: Balances returned to 0.');

  console.log('\n--- (g) Verify linked entry lock protection ---');
  const lockedCb = await cashBookService.addEntry({
    date: '2026-10-10',
    type: 'Payment',
    debit: 5000,
    credit: 0,
    description: 'Payment from invoice',
    linkedTransactionId: 'inv_some_id'
  });

  let lockEditBlocked = false;
  try {
    await cashBookService.update(lockedCb.id, { debit: 6000 });
  } catch (err) {
    lockEditBlocked = true;
    console.log('Successfully blocked direct edit on linked entry:', err.message);
  }

  let lockDeleteBlocked = false;
  try {
    await cashBookService.delete(lockedCb.id);
  } catch (err) {
    lockDeleteBlocked = true;
    console.log('Successfully blocked direct delete on linked entry:', err.message);
  }

  if (!lockEditBlocked || !lockDeleteBlocked) {
    throw new Error('Test (g) Linked entry lock protection FAILED!');
  }
  console.log('>>> Test (g) Linked Entry Lock Protection PASSED: Direct edit & delete safely blocked.');

  console.log('\n======================================================');
  console.log('ALL VERIFICATION TESTS (A through G) PASSED PERFECTLY!');
  console.log('======================================================');
}

runTests().catch((err) => {
  console.error('TEST RUN ERROR:', err);
  process.exit(1);
});
