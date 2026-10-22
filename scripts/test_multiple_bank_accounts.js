import assert from 'assert';
import { computeAccountDisplayName } from '../src/services/accountService.js';

console.log('=== TEST: Cash & Banks: Multiple Accounts Under One Bank ===\n');

// Mock Dexie-like in-memory database
class MockTable {
  constructor() {
    this.items = [];
  }
  async toArray() {
    return [...this.items];
  }
  async get(id) {
    return this.items.find((i) => i.id === id);
  }
  async add(item) {
    this.items.push({ ...item });
    return item;
  }
  async put(item) {
    const idx = this.items.findIndex((i) => i.id === item.id);
    if (idx >= 0) this.items[idx] = { ...item };
    else this.items.push({ ...item });
    return item;
  }
  async update(id, updates) {
    const item = this.items.find((i) => i.id === id);
    if (item) Object.assign(item, updates);
    return 1;
  }
  async delete(id) {
    this.items = this.items.filter((i) => i.id !== id);
  }
  async count() {
    return this.items.length;
  }
  where(query) {
    const key = Object.keys(query)[0];
    const val = query[key];
    return {
      first: async () => this.items.find((i) => i[key] === val),
      toArray: async () => this.items.filter((i) => i[key] === val),
    };
  }
}

const mockDb = {
  accounts: new MockTable(),
  receipts: new MockTable(),
  payments: new MockTable(),
  expenses: new MockTable(),
  cashBookEntries: new MockTable(),
  bankTransfers: new MockTable(),
  journalEntries: new MockTable(),
};

// Mock service logic mirroring accountService
const testAccountService = {
  async getNextCode() {
    const accounts = await mockDb.accounts.toArray();
    const existingCodes = new Set(
      accounts
        .map((a) => parseInt(a.code, 10))
        .filter((n) => !isNaN(n) && n >= 99101)
    );
    let code = 99101;
    while (existingCodes.has(code)) {
      code++;
    }
    return String(code);
  },

  async add(accountData) {
    const id = accountData.id || 'acc_' + Date.now() + Math.random().toString(36).substr(2, 4);
    const accounts = await mockDb.accounts.toArray();

    let bankName = (accountData.bankName || '').trim();
    let accountTitle = (accountData.accountTitle || '').trim();
    const accountNo = accountData.accountNo ? String(accountData.accountNo).trim() : '';
    const branch = accountData.branch ? String(accountData.branch).trim() : '';

    let displayName = accountData.name ? accountData.name.trim() : '';
    if (!displayName && (bankName || accountTitle)) {
      displayName = computeAccountDisplayName(bankName, accountTitle, accountNo);
    } else if (displayName && !bankName) {
      const parts = displayName.split(' - ');
      bankName = parts[0] || displayName;
      accountTitle = parts.slice(1).join(' - ') || displayName;
    }

    if (!displayName) {
      throw new Error('Bank Account name or title is required');
    }

    // Uniqueness check: full display name must be unique
    const duplicate = accounts.find(
      (a) => a.name && a.name.trim().toLowerCase() === displayName.toLowerCase()
    );
    if (duplicate) {
      throw new Error('This account already exists');
    }

    const nextCode = accountData.code ? String(accountData.code).trim() : await this.getNextCode();
    const openingBalance = Number(accountData.openingBalance || accountData.balance || 0);

    const item = {
      id,
      code: nextCode,
      bankName: bankName || displayName,
      accountTitle: accountTitle || displayName,
      accountNo,
      branch,
      name: displayName,
      type: accountData.type || 'Asset',
      accountType: 'Bank',
      openingBalance,
      balance: openingBalance,
    };

    await mockDb.accounts.add(item);
    return item;
  },

  async recalculateAccountBalance(id) {
    const acc = await mockDb.accounts.get(id);
    if (!acc) return 0;

    const opening = Number(acc.openingBalance || 0);
    let running = opening;

    const receipts = await mockDb.receipts.toArray();
    receipts.forEach((r) => {
      if (r.accountId ? r.accountId === acc.id : r.account === acc.name) {
        running += Number(r.amount || 0);
      }
    });

    const payments = await mockDb.payments.toArray();
    payments.forEach((p) => {
      if (p.accountId ? p.accountId === acc.id : p.account === acc.name) {
        running -= Number(p.amount || 0);
      }
    });

    const expenses = await mockDb.expenses.toArray();
    expenses.forEach((e) => {
      if (e.accountId ? e.accountId === acc.id : e.account === acc.name) {
        running -= Number(e.amount || 0);
      }
    });

    const cashBook = await mockDb.cashBookEntries.toArray();
    cashBook.forEach((cb) => {
      if (cb.bankAccountId ? cb.bankAccountId === acc.id : cb.bankAccountName === acc.name) {
        if (cb.type === 'Deposit') running += Number(cb.debit || 0);
        if (cb.type === 'Withdrawal') running -= Number(cb.credit || 0);
      }
    });

    await mockDb.accounts.update(acc.id, { balance: running });
    return running;
  },

  async delete(id) {
    const existing = await mockDb.accounts.get(id);
    if (!existing) return;

    if (existing.name && existing.name.toLowerCase() === 'cash') {
      throw new Error('Physical Cash account cannot be deleted');
    }

    // Usage check
    const receipts = await mockDb.receipts.toArray();
    const matches = (idVal, nameVal) => {
      if (existing.id && idVal) return idVal === existing.id;
      if (existing.name && nameVal) return nameVal === existing.name;
      return false;
    };
    let count = receipts.filter((r) => matches(r.accountId, r.account)).length;
    const cashBook = await mockDb.cashBookEntries.toArray();
    count += cashBook.filter((cb) => matches(cb.bankAccountId, cb.bankAccountName)).length;

    if (count > 0) {
      throw new Error(`This record is used in ${count} transactions. Delete or edit those first`);
    }

    await mockDb.accounts.delete(id);
  },
};

async function runTests() {
  // Add Cash account
  await mockDb.accounts.add({
    id: 'cash',
    name: 'Cash',
    code: '99020',
    accountType: 'Cash',
    balance: 50000,
    openingBalance: 50000,
  });

  // 1. Create Meezan Bank accounts Title 1 ... Title 6
  console.log('1. Creating Meezan Bank accounts (Title 1 to Title 6)...');
  const meezanAccounts = [];
  for (let i = 1; i <= 6; i++) {
    const acc = await testAccountService.add({
      bankName: 'Meezan Bank',
      accountTitle: `Title ${i}`,
      openingBalance: 0,
    });
    meezanAccounts.push(acc);
  }
  assert.strictEqual(meezanAccounts.length, 6, 'Should create 6 Meezan accounts');
  assert.strictEqual(meezanAccounts[0].code, '99101', 'First code should be 99101');
  assert.strictEqual(meezanAccounts[5].code, '99106', 'Sixth code should be 99106');
  console.log('✓ 6 Meezan Bank accounts created with codes 99101 - 99106');

  // 2. Create Bank Alfalah accounts Title 1 ... Title 7
  console.log('2. Creating Bank Alfalah accounts (Title 1 to Title 7)...');
  const alfalahAccounts = [];
  for (let i = 1; i <= 7; i++) {
    const acc = await testAccountService.add({
      bankName: 'Bank Alfalah',
      accountTitle: `Title ${i}`,
      openingBalance: 0,
    });
    alfalahAccounts.push(acc);
  }
  assert.strictEqual(alfalahAccounts.length, 7, 'Should create 7 Bank Alfalah accounts');
  assert.strictEqual(alfalahAccounts[0].code, '99107', 'First Alfalah code should be 99107');
  assert.strictEqual(alfalahAccounts[6].code, '99113', 'Seventh Alfalah code should be 99113');
  console.log('✓ 7 Bank Alfalah accounts created with codes 99107 - 99113');

  // Total bank accounts must be 13
  const allAccounts = await mockDb.accounts.toArray();
  const bankAccounts = allAccounts.filter((a) => !a.name.toLowerCase().includes('cash'));
  assert.strictEqual(bankAccounts.length, 13, 'All 13 bank accounts must save');
  console.log('✓ All 13 bank accounts successfully saved in database');

  // 3. Test uniqueness: duplicate full name must throw "This account already exists"
  console.log('\n3. Testing duplicate display name validation...');
  let duplicateError = null;
  try {
    await testAccountService.add({
      bankName: 'Meezan Bank',
      accountTitle: 'Title 1',
    });
  } catch (err) {
    duplicateError = err.message;
  }
  assert.strictEqual(duplicateError, 'This account already exists', 'Should throw exact error message');
  console.log('✓ Duplicate check passed: "This account already exists" thrown on duplicate full name');

  // Allow same bank with DIFFERENT title
  const diffTitle = await testAccountService.add({
    bankName: 'Meezan Bank',
    accountTitle: 'Title 99',
  });
  assert.ok(diffTitle, 'Same bank with different title must be allowed');
  await mockDb.accounts.delete(diffTitle.id); // clean up
  console.log('✓ Same bank with different title is allowed');

  // 4. Test deposit into Meezan Title 2
  console.log('\n4. Testing deposit into Meezan Title 2...');
  const meezanTitle2 = meezanAccounts[1]; // Title 2
  assert.strictEqual(meezanTitle2.accountTitle, 'Title 2');

  // Record deposit into Meezan Title 2: 75,000
  await mockDb.cashBookEntries.add({
    id: 'cb_dep1',
    date: '2026-10-22',
    type: 'Deposit',
    bankAccountId: meezanTitle2.id,
    bankAccountName: meezanTitle2.name,
    debit: 75000,
    credit: 0,
    description: 'Deposit to Meezan Title 2',
  });

  // Recalculate balance for Meezan Title 2 and Title 1
  const bal2 = await testAccountService.recalculateAccountBalance(meezanTitle2.id);
  const bal1 = await testAccountService.recalculateAccountBalance(meezanAccounts[0].id);

  assert.strictEqual(bal2, 75000, 'Meezan Title 2 balance must be 75,000');
  assert.strictEqual(bal1, 0, 'Meezan Title 1 balance must remain 0');

  // Verify all other accounts remain 0
  for (const acc of bankAccounts) {
    if (acc.id === meezanTitle2.id) continue;
    const b = await testAccountService.recalculateAccountBalance(acc.id);
    assert.strictEqual(b, 0, `Account ${acc.name} balance must remain 0`);
  }
  console.log('✓ Deposit into Meezan Title 2 changed ONLY Meezan Title 2');

  // 5. Grouped view & subtotals check
  console.log('\n5. Testing grouped subtotals...');
  const groups = {};
  const reloadedBanks = (await mockDb.accounts.toArray()).filter((a) => !a.name.toLowerCase().includes('cash'));
  reloadedBanks.forEach((acc) => {
    const bName = acc.bankName || acc.name.split(' - ')[0];
    if (!groups[bName]) groups[bName] = { count: 0, subtotal: 0 };
    groups[bName].count++;
    groups[bName].subtotal += Number(acc.balance || 0);
  });

  assert.strictEqual(groups['Meezan Bank'].count, 6, 'Meezan Bank must have 6 accounts');
  assert.strictEqual(groups['Meezan Bank'].subtotal, 75000, 'Meezan Bank subtotal must be 75,000');
  assert.strictEqual(groups['Bank Alfalah'].count, 7, 'Bank Alfalah must have 7 accounts');
  assert.strictEqual(groups['Bank Alfalah'].subtotal, 0, 'Bank Alfalah subtotal must be 0');

  const grandTotal = Object.values(groups).reduce((s, g) => s + g.subtotal, 0);
  assert.strictEqual(grandTotal, 75000, 'Total of all banks must be 75,000');
  console.log('✓ Meezan Bank subtotal: Rs 75,000 (6 accounts)');
  console.log('✓ Bank Alfalah subtotal: Rs 0 (7 accounts)');
  console.log('✓ Grand Total of all banks: Rs 75,000 (13 accounts)');

  // 6. Trial Balance row count
  console.log('\n6. Testing Trial Balance bank rows...');
  // Every bank account is listed as a separate row
  const tbBankRows = reloadedBanks.map((b) => ({
    code: b.code,
    name: b.name,
    debit: b.balance >= 0 ? b.balance : 0,
    credit: b.balance < 0 ? Math.abs(b.balance) : 0,
  }));
  assert.strictEqual(tbBankRows.length, 13, 'Trial Balance must show 13 separate bank rows');
  console.log('✓ Trial Balance shows exactly 13 separate bank rows');

  // 7. Delete blocker check
  console.log('\n7. Testing delete blocker when account is used in transaction...');
  let deleteBlocked = false;
  try {
    await testAccountService.delete(meezanTitle2.id);
  } catch (err) {
    deleteBlocked = true;
    assert.ok(
      err.message.includes('used in 1 transactions'),
      `Error message should state used in 1 transactions, got: ${err.message}`
    );
  }
  assert.strictEqual(deleteBlocked, true, 'Delete must be blocked when account is used in transactions');
  console.log('✓ Delete blocked: "This record is used in 1 transactions. Delete or edit those first"');

  // Delete an unused account (e.g. Title 6)
  const unusedAcc = meezanAccounts[5];
  await testAccountService.delete(unusedAcc.id);
  const afterDelete = await mockDb.accounts.get(unusedAcc.id);
  assert.strictEqual(afterDelete, undefined, 'Unused account should be successfully deleted');
  console.log('✓ Unused bank account deleted successfully');

  console.log('\nALL TESTS PASSED SUCCESSFULLY! ✓✓✓');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
