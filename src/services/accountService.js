import { db } from '../db/database.js';
import { getAccountUsageCount } from '../utils/masterUsageChecker.js';
import { cashBookService } from './cashBookService.js';

/**
 * Computes standard display name for a bank account:
 * "<Bank Name> - <Account Title>" (add the last 4 digits of account number when entered).
 */
export function computeAccountDisplayName(bankName, accountTitle, accountNo) {
  const bName = (bankName || '').trim();
  const title = (accountTitle || '').trim();
  if (!bName && !title) return '';
  if (!bName) return title;
  if (!title) return bName;

  const rawNo = (accountNo || '').toString().trim();
  const digits = rawNo.replace(/\D/g, '');
  const last4 = digits.length >= 4 ? digits.slice(-4) : (digits || rawNo.slice(-4));

  if (last4) {
    return `${bName} - ${title} (${last4})`;
  }
  return `${bName} - ${title}`;
}

export const accountService = {
  async getAll() {
    return await db.accounts.toArray();
  },

  async getById(id) {
    return await db.accounts.get(id);
  },

  /**
   * Generates the next free automatic code starting from 99101 (e.g. 99101, 99102, ...).
   */
  async getNextCode() {
    const accounts = await db.accounts.toArray();
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
    const accounts = await db.accounts.toArray();

    // Determine bank name and account title
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

    await db.accounts.add(item);
    return item;
  },

  async update(id, accountData) {
    const existing = await db.accounts.get(id);
    if (!existing) throw new Error('Account not found');

    const accounts = await db.accounts.toArray();

    let bankName =
      accountData.bankName !== undefined
        ? String(accountData.bankName).trim()
        : existing.bankName || '';
    let accountTitle =
      accountData.accountTitle !== undefined
        ? String(accountData.accountTitle).trim()
        : existing.accountTitle || '';
    const accountNo =
      accountData.accountNo !== undefined
        ? String(accountData.accountNo).trim()
        : existing.accountNo || '';
    const branch =
      accountData.branch !== undefined
        ? String(accountData.branch).trim()
        : existing.branch || '';

    let displayName = accountData.name ? accountData.name.trim() : '';
    if (!displayName && (bankName || accountTitle)) {
      displayName = computeAccountDisplayName(bankName, accountTitle, accountNo);
    } else if (!displayName) {
      displayName = existing.name;
    }

    // Uniqueness check across other accounts
    const duplicate = accounts.find(
      (a) => a.id !== id && a.name && a.name.trim().toLowerCase() === displayName.toLowerCase()
    );
    if (duplicate) {
      throw new Error('This account already exists');
    }

    const openingBalance =
      accountData.openingBalance !== undefined
        ? Number(accountData.openingBalance)
        : existing.openingBalance !== undefined
        ? Number(existing.openingBalance)
        : 0;

    const updated = {
      ...existing,
      bankName: bankName || existing.bankName || displayName,
      accountTitle: accountTitle || existing.accountTitle || displayName,
      accountNo,
      branch,
      name: displayName,
      code: accountData.code ? String(accountData.code).trim() : existing.code,
      openingBalance,
    };

    await db.accounts.put(updated);

    // Recalculate balance
    await this.recalculateAccountBalance(id);

    return await db.accounts.get(id);
  },

  async updateBalance(id, newBalance) {
    return await db.accounts.update(id, { balance: Number(newBalance) });
  },

  async delete(id) {
    const existing = await db.accounts.get(id);
    if (!existing) return;

    if (existing.name && existing.name.toLowerCase() === 'cash') {
      throw new Error('Physical Cash account cannot be deleted');
    }

    const count = await getAccountUsageCount(existing.id, existing.name);
    if (count > 0) {
      throw new Error(`This record is used in ${count} transactions. Delete or edit those first`);
    }

    return await db.accounts.delete(id);
  },

  /**
   * Recalculates balance for a specific bank or cash account.
   * Matches by account ID primarily.
   */
  async recalculateAccountBalance(id) {
    const acc = await db.accounts.get(id);
    if (!acc) return 0;

    if (acc.name && acc.name.toLowerCase() === 'cash') {
      return await cashBookService.recalculateCashBalance();
    }

    const opening = Number(acc.openingBalance || 0);
    let running = opening;

    const receipts = db.receipts ? await db.receipts.toArray() : [];
    receipts.forEach((r) => {
      if (r.accountId ? r.accountId === acc.id : r.account === acc.name) {
        running += Number(r.amount || 0);
      }
    });

    const payments = db.payments ? await db.payments.toArray() : [];
    payments.forEach((p) => {
      if (p.accountId ? p.accountId === acc.id : p.account === acc.name) {
        running -= Number(p.amount || 0);
      }
    });

    const expenses = db.expenses ? await db.expenses.toArray() : [];
    expenses.forEach((e) => {
      if (e.accountId ? e.accountId === acc.id : e.account === acc.name) {
        running -= Number(e.amount || 0);
      }
    });

    const cashBook = db.cashBookEntries ? await db.cashBookEntries.toArray() : [];
    cashBook.forEach((cb) => {
      if (cb.bankAccountId ? cb.bankAccountId === acc.id : cb.bankAccountName === acc.name) {
        if (cb.type === 'Deposit') running += Number(cb.debit || 0);
        if (cb.type === 'Withdrawal') running -= Number(cb.credit || 0);
      }
    });

    const journals = db.journalEntries ? await db.journalEntries.toArray() : [];
    journals.forEach((j) => {
      (j.lines || []).forEach((l) => {
        if (l.accountId ? l.accountId === acc.id : l.accountName === acc.name) {
          running = running + Number(l.debit || 0) - Number(l.credit || 0);
        }
      });
    });

    await db.accounts.update(acc.id, { balance: running });
    return running;
  },

  /**
   * Resolves legacy entries that only have account names to account IDs.
   * Runs once on startup.
   */
  async resolveLegacyAccountIds() {
    const accounts = await db.accounts.toArray();
    const accByName = new Map();
    accounts.forEach((a) => {
      if (a.name) accByName.set(a.name.trim().toLowerCase(), a.id);
    });
    const cashAcc = accounts.find((a) => a.name?.toLowerCase().includes('cash'));
    if (cashAcc) {
      accByName.set('cash', cashAcc.id);
      accByName.set('cash account', cashAcc.id);
      accByName.set('cash book', cashAcc.id);
    }

    // 1. Receipts
    if (db.receipts) {
      const receipts = await db.receipts.toArray();
      for (const r of receipts) {
        if (!r.accountId && r.account) {
          const foundId = accByName.get(r.account.trim().toLowerCase());
          if (foundId) {
            await db.receipts.update(r.id, { accountId: foundId });
          }
        }
      }
    }

    // 2. Payments
    if (db.payments) {
      const payments = await db.payments.toArray();
      for (const p of payments) {
        if (!p.accountId && p.account) {
          const foundId = accByName.get(p.account.trim().toLowerCase());
          if (foundId) {
            await db.payments.update(p.id, { accountId: foundId });
          }
        }
      }
    }

    // 3. Expenses
    if (db.expenses) {
      const expenses = await db.expenses.toArray();
      for (const e of expenses) {
        if (!e.accountId && e.account) {
          const foundId = accByName.get(e.account.trim().toLowerCase());
          if (foundId) {
            await db.expenses.update(e.id, { accountId: foundId });
          }
        }
      }
    }

    // 4. CashBookEntries
    if (db.cashBookEntries) {
      const cbEntries = await db.cashBookEntries.toArray();
      for (const cb of cbEntries) {
        if (!cb.bankAccountId && cb.bankAccountName) {
          const foundId = accByName.get(cb.bankAccountName.trim().toLowerCase());
          if (foundId) {
            await db.cashBookEntries.update(cb.id, { bankAccountId: foundId });
          }
        }
      }
    }

    // 5. BankTransfers
    if (db.bankTransfers) {
      const transfers = await db.bankTransfers.toArray();
      for (const t of transfers) {
        if (!t.bankAccountId && t.bankAccountName) {
          const foundId = accByName.get(t.bankAccountName.trim().toLowerCase());
          if (foundId) {
            await db.bankTransfers.update(t.id, { bankAccountId: foundId });
          }
        }
      }
    }

    // 6. JournalEntries
    if (db.journalEntries) {
      const journals = await db.journalEntries.toArray();
      for (const j of journals) {
        let changed = false;
        const lines = (j.lines || []).map((l) => {
          if (!l.accountId && l.accountName) {
            const foundId = accByName.get(l.accountName.trim().toLowerCase());
            if (foundId) {
              changed = true;
              return { ...l, accountId: foundId };
            }
          }
          return l;
        });
        if (changed) {
          await db.journalEntries.update(j.id, { lines });
        }
      }
    }
  },
};
