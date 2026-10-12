import { db } from '../db/database.js';
import { partyService } from './partyService.js';
import { cashService } from './cashService.js';

export function deriveMallHead(accountName = '', code = '') {
  const str = (String(accountName || '') + ' ' + String(code || '')).toLowerCase();
  if (str.includes('99011') || str.includes('sale') || str.includes('سیل')) return 'Sale';
  if (str.includes('99012') || str.includes('purchase') || str.includes('پرچیز')) return 'Purchase';
  return 'Mall';
}

export const cashBookService = {
  async getAll() {
    const entries = await db.cashBookEntries.toArray();
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
    let running = Number(cashAcc?.openingBalance || 0);
    const calculated = entries.map((entry) => {
      const debit = Number(entry.debit || 0);
      const credit = Number(entry.credit || 0);
      running = running + credit - debit;
      return {
        ...entry,
        balance: running,
      };
    });

    return calculated.reverse();
  },

  /**
   * Applies a list of cash book lines to Party, Bank, and Cash accounts.
   * CONVENTION:
   *  - Party: Debit (cash given) => party.balance = balance - debit
   *           Credit (cash received) => party.balance = balance + credit
   *  - Bank:  Debit (deposited) => bank.balance = balance + debit
   *           Credit (withdrawn) => bank.balance = balance - credit
   *  - Cash:  balance = balance + totalCredit - totalDebit
   */
  async applyBookLines(lines) {
    let totalCredit = 0;
    let totalDebit = 0;

    for (const line of lines) {
      const deb = Number(line.debit || 0);
      const cred = Number(line.credit || 0);
      totalCredit += cred;
      totalDebit += deb;

      // 1. Party line
      if (line.partyId) {
        const party = await db.parties.get(line.partyId);
        if (party) {
          await db.parties.update(party.id, {
            balance: Number(party.balance || 0) - deb + cred,
          });
        }
      }

      // 2. Bank line
      const bankId = line.bankAccountId;
      const bankName = line.bankAccountName;
      if (bankId || bankName) {
        const bank = bankId
          ? await db.accounts.get(bankId)
          : await db.accounts.where({ name: bankName }).first();
        if (bank) {
          await db.accounts.update(bank.id, {
            balance: Number(bank.balance || 0) + deb - cred,
          });
        }
      }
    }

    // 3. Cash account
    const allAccs = await db.accounts.toArray();
    const cashAcc = allAccs.find(
      (a) => a.name === 'Cash' || a.accountType === 'Cash' || a.type === 'Cash' || a.name?.toLowerCase().includes('cash')
    );
    if (cashAcc) {
      await db.accounts.update(cashAcc.id, {
        balance: Number(cashAcc.balance || 0) + totalCredit - totalDebit,
      });
    }
  },

  /**
   * Reverses a list of cash book lines from Party, Bank, and Cash accounts.
   * REVERSAL CONVENTION:
   *  - Party: balance = balance + debit - credit
   *  - Bank:  balance = balance - debit + credit
   *  - Cash:  balance = balance - totalCredit + totalDebit
   */
  async reverseBookLines(lines) {
    let totalCredit = 0;
    let totalDebit = 0;

    for (const line of lines) {
      const deb = Number(line.debit || 0);
      const cred = Number(line.credit || 0);
      totalCredit += cred;
      totalDebit += deb;

      // 1. Party line reversal
      if (line.partyId) {
        const party = await db.parties.get(line.partyId);
        if (party) {
          await db.parties.update(party.id, {
            balance: Number(party.balance || 0) + deb - cred,
          });
        }
      }

      // 2. Bank line reversal
      const bankId = line.bankAccountId;
      const bankName = line.bankAccountName;
      if (bankId || bankName) {
        const bank = bankId
          ? await db.accounts.get(bankId)
          : await db.accounts.where({ name: bankName }).first();
        if (bank) {
          await db.accounts.update(bank.id, {
            balance: Number(bank.balance || 0) - deb + cred,
          });
        }
      }
    }

    // 3. Cash account reversal
    const allAccs = await db.accounts.toArray();
    const cashAcc = allAccs.find(
      (a) => a.name === 'Cash' || a.accountType === 'Cash' || a.type === 'Cash' || a.name?.toLowerCase().includes('cash')
    );
    if (cashAcc) {
      await db.accounts.update(cashAcc.id, {
        balance: Number(cashAcc.balance || 0) - totalCredit + totalDebit,
      });
    }
  },

  /**
   * Save a brand new numbered Cash Book.
   */
  async saveBook({ cashBookNo, date, denominations, rows }) {
    const bookNoNum = Number(cashBookNo);
    const validRows = rows.filter(
      (r) => (r.accountName || r.accountId) && (Number(r.credit) > 0 || Number(r.debit) > 0)
    );

    if (validRows.length === 0) {
      throw new Error('Please fill in at least one row with an Account and Amount.');
    }

    const entriesToInsert = validRows.map((r, idx) => {
      const deb = Number(r.debit) || 0;
      const cred = Number(r.credit) || 0;
      const isMall = r.accountType === 'mall';
      const mallHead = isMall ? (r.head || deriveMallHead(r.accountName, r.accountNo || r.accountId)) : null;

      return {
        id: 'cb_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 4),
        date: date || new Date().toISOString().split('T')[0],
        cashBookNo: bookNoNum,
        partyId: r.accountType === 'party' ? (r.accountId || null) : null,
        partyName: r.accountType === 'party' ? (r.accountName || null) : null,
        bankAccountId: r.accountType === 'bank' ? (r.accountId || null) : null,
        bankAccountName: r.accountType === 'bank' ? (r.accountName || null) : null,
        accountId: isMall ? null : (r.accountType === 'general' ? (r.accountId || null) : null),
        accountName: r.accountName || (isMall ? (mallHead === 'Sale' ? 'Sale A/C - سیل' : mallHead === 'Purchase' ? 'Purchase A/C - پرچیز' : 'Mall A/C - مال کھاتہ') : null),
        accountType: isMall ? 'mall' : (r.accountType || 'general'),
        head: mallHead,
        debit: deb,
        credit: cred,
        description: r.detail || `Manual Cash Book No ${bookNoNum}`,
        type: isMall
          ? (cred > 0 ? 'CashReceived' : 'CashGiven')
          : (r.accountType === 'bank'
            ? (deb > 0 ? 'Deposit' : 'Withdrawal')
            : (cred > 0 ? 'CashReceived' : 'CashGiven')),
        refNo: `CB-${String(bookNoNum).padStart(4, '0')}`,
        createdAt: new Date().toISOString(),
      };
    });

    const tables = [db.cashBookEntries, db.cashBookSheets, db.accounts, db.parties].filter(Boolean);
    await db.transaction('rw', tables, async () => {
      await db.cashBookEntries.bulkAdd(entriesToInsert);
      if (db.cashBookSheets) {
        await db.cashBookSheets.put({
          cashBookNo: bookNoNum,
          date: date || new Date().toISOString().split('T')[0],
          denominations: denominations || {},
          updatedAt: new Date().toISOString(),
        });
      }
      await this.applyBookLines(entriesToInsert);
    });

    await partyService.recalculateAllBalances();
    await this.recalculateCashBalance();

    return { success: true, count: entriesToInsert.length };
  },

  /**
   * Update an existing numbered Cash Book in one atomic transaction:
   * (a) Reverse old lines
   * (b) Delete old lines
   * (c) Insert new lines
   * (d) Apply new lines
   */
  async updateBook({ cashBookNo, date, denominations, rows }) {
    const bookNoNum = Number(cashBookNo);
    const validRows = rows.filter(
      (r) => (r.accountName || r.accountId) && (Number(r.credit) > 0 || Number(r.debit) > 0)
    );

    if (validRows.length === 0) {
      throw new Error('Please fill in at least one row with an Account and Amount.');
    }

    const entriesToInsert = validRows.map((r, idx) => {
      const deb = Number(r.debit) || 0;
      const cred = Number(r.credit) || 0;
      const isMall = r.accountType === 'mall';
      const mallHead = isMall ? (r.head || deriveMallHead(r.accountName, r.accountNo || r.accountId)) : null;

      return {
        id: 'cb_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 4),
        date: date || new Date().toISOString().split('T')[0],
        cashBookNo: bookNoNum,
        partyId: r.accountType === 'party' ? (r.accountId || null) : null,
        partyName: r.accountType === 'party' ? (r.accountName || null) : null,
        bankAccountId: r.accountType === 'bank' ? (r.accountId || null) : null,
        bankAccountName: r.accountType === 'bank' ? (r.accountName || null) : null,
        accountId: isMall ? null : (r.accountType === 'general' ? (r.accountId || null) : null),
        accountName: r.accountName || (isMall ? (mallHead === 'Sale' ? 'Sale A/C - سیل' : mallHead === 'Purchase' ? 'Purchase A/C - پرچیز' : 'Mall A/C - مال کھاتہ') : null),
        accountType: isMall ? 'mall' : (r.accountType || 'general'),
        head: mallHead,
        debit: deb,
        credit: cred,
        description: r.detail || `Manual Cash Book No ${bookNoNum}`,
        type: isMall
          ? (cred > 0 ? 'CashReceived' : 'CashGiven')
          : (r.accountType === 'bank'
            ? (deb > 0 ? 'Deposit' : 'Withdrawal')
            : (cred > 0 ? 'CashReceived' : 'CashGiven')),
        refNo: `CB-${String(bookNoNum).padStart(4, '0')}`,
        createdAt: new Date().toISOString(),
      };
    });

    const tables = [db.cashBookEntries, db.cashBookSheets, db.accounts, db.parties].filter(Boolean);
    await db.transaction('rw', tables, async () => {
      // 1. Find all old entries for this book
      const all = await db.cashBookEntries.toArray();
      const oldEntries = all.filter((e) => Number(e.cashBookNo) === bookNoNum);

      // 2. Reverse every old line
      await this.reverseBookLines(oldEntries);

      // 3. Delete old entries
      const oldIds = oldEntries.map((e) => e.id);
      if (oldIds.length > 0) {
        await db.cashBookEntries.bulkDelete(oldIds);
      }

      // 4. Insert new entries
      if (entriesToInsert.length > 0) {
        await db.cashBookEntries.bulkAdd(entriesToInsert);
      }

      // 5. Update sheet
      if (db.cashBookSheets) {
        await db.cashBookSheets.put({
          cashBookNo: bookNoNum,
          date: date || new Date().toISOString().split('T')[0],
          denominations: denominations || {},
          updatedAt: new Date().toISOString(),
        });
      }

      // 6. Apply new lines
      await this.applyBookLines(entriesToInsert);
    });

    await partyService.recalculateAllBalances();
    await this.recalculateCashBalance();

    return { success: true, count: entriesToInsert.length };
  },

  /**
   * Delete an entire numbered Cash Book:
   * (a) Reverse all effects
   * (b) Remove all rows of this book
   * (c) Remove sheet
   */
  async deleteBook(cashBookNo) {
    const bookNoNum = Number(cashBookNo);

    const tables = [db.cashBookEntries, db.cashBookSheets, db.accounts, db.parties].filter(Boolean);
    await db.transaction('rw', tables, async () => {
      const all = await db.cashBookEntries.toArray();
      const oldEntries = all.filter((e) => Number(e.cashBookNo) === bookNoNum);

      // 1. Reverse every line
      await this.reverseBookLines(oldEntries);

      // 2. Delete old entries
      const oldIds = oldEntries.map((e) => e.id);
      if (oldIds.length > 0) {
        await db.cashBookEntries.bulkDelete(oldIds);
      }

      // 3. Delete sheet
      if (db.cashBookSheets) {
        await db.cashBookSheets.delete(bookNoNum);
      }
    });

    await partyService.recalculateAllBalances();
    await this.recalculateCashBalance();

    return { success: true };
  },

  /**
   * Get sheet, rows and existence of a book by cashBookNo.
   */
  async getBook(cashBookNo) {
    const bookNoNum = Number(cashBookNo);
    const sheet = db.cashBookSheets ? await db.cashBookSheets.get(bookNoNum) : null;
    const all = await db.cashBookEntries.toArray();
    const entries = all
      .filter((e) => Number(e.cashBookNo) === bookNoNum)
      .sort((a, b) => (a.createdAt || a.id).localeCompare(b.createdAt || b.id));

    return {
      sheet: sheet || null,
      entries,
      exists: !!sheet || entries.length > 0,
    };
  },

  /**
   * Get all unique sorted existing book numbers.
   */
  async getAllBookNumbers() {
    const sheetKeys = db.cashBookSheets ? await db.cashBookSheets.toCollection().primaryKeys() : [];
    const entries = await db.cashBookEntries.toArray();
    const entryNos = entries
      .map((e) => parseInt(e.cashBookNo, 10))
      .filter((n) => !isNaN(n) && n > 0);
    const sheetNos = sheetKeys
      .map((k) => parseInt(k, 10))
      .filter((n) => !isNaN(n) && n > 0);

    const uniqueNos = [...new Set([...entryNos, ...sheetNos])].sort((a, b) => a - b);
    return uniqueNos;
  },

  /**
   * Next available book number: max existing number + 1, starting at 1.
   */
  async getNextBookNo() {
    const numbers = await this.getAllBookNumbers();
    const maxNo = numbers.length > 0 ? Math.max(...numbers) : 0;
    return maxNo + 1;
  },

  /**
   * Rebuilds physical Cash account balance from openingBalance + sum(credit - debit) over all cashBookEntries.
   */
  async recalculateCashBalance() {
    return await cashService.recalculateCashBalance();
  },

  async addEntry(entryData) {
    const id = entryData.id || 'cb_' + Date.now() + Math.random().toString(36).substr(2, 4);
    const debit = Number(entryData.debit || 0);
    const credit = Number(entryData.credit || 0);

    const isMall = entryData.accountType === 'mall';
    const mallHead = isMall ? (entryData.head || deriveMallHead(entryData.accountName)) : null;

    const newEntry = {
      id,
      date: entryData.date || new Date().toISOString().split('T')[0],
      type: entryData.type || (isMall ? (credit > 0 ? 'CashReceived' : 'CashGiven') : 'General'),
      partyId: entryData.partyId || null,
      partyName: entryData.partyName || null,
      bankAccountId: entryData.bankAccountId || null,
      bankAccountName: entryData.bankAccountName || null,
      accountId: entryData.accountId || null,
      accountName: entryData.accountName || null,
      accountType: isMall ? 'mall' : (entryData.accountType || 'general'),
      head: mallHead,
      debit,
      credit,
      description: entryData.description || '',
      linkedTransactionId: entryData.linkedTransactionId || null,
      lineIndex: entryData.lineIndex !== undefined ? entryData.lineIndex : null,
      cashBookNo: entryData.cashBookNo ? Number(entryData.cashBookNo) : null,
      refNo: entryData.refNo || (entryData.cashBookNo ? `CB-${String(entryData.cashBookNo).padStart(4, '0')}` : null),
      createdAt: entryData.createdAt || new Date().toISOString(),
    };

    await db.cashBookEntries.add(newEntry);

    // Apply via shared posting
    await this.applyBookLines([newEntry]);

    if (newEntry.partyId) {
      await partyService.recalculateAllBalances();
    }
    await this.recalculateCashBalance();

    return newEntry;
  },

  async depositToBank({ date, bankAccountId, bankAccountName, amount, description }) {
    const numAmount = Number(amount || 0);
    const trfId = 'trf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const count = await db.bankTransfers.count();
    const no = `TRF-${String(count + 1).padStart(4, '0')}`;

    await db.bankTransfers.add({
      id: trfId,
      no,
      date: date || new Date().toISOString().split('T')[0],
      type: 'Deposit',
      bankAccountId,
      bankAccountName,
      amount: numAmount,
      description: description || `Cash deposited to ${bankAccountName}`,
    });

    return await this.addEntry({
      date,
      type: 'Deposit',
      bankAccountId,
      bankAccountName,
      debit: numAmount,
      credit: 0,
      description: description || `Deposit to ${bankAccountName}`,
      linkedTransactionId: trfId,
    });
  },

  async withdrawFromBank({ date, bankAccountId, bankAccountName, amount, description }) {
    const numAmount = Number(amount || 0);
    const trfId = 'trf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const count = await db.bankTransfers.count();
    const no = `TRF-${String(count + 1).padStart(4, '0')}`;

    await db.bankTransfers.add({
      id: trfId,
      no,
      date: date || new Date().toISOString().split('T')[0],
      type: 'Withdrawal',
      bankAccountId,
      bankAccountName,
      amount: numAmount,
      description: description || `Cash withdrawn from ${bankAccountName}`,
    });

    return await this.addEntry({
      date,
      type: 'Withdrawal',
      bankAccountId,
      bankAccountName,
      debit: 0,
      credit: numAmount,
      description: description || `Withdrawal from ${bankAccountName}`,
      linkedTransactionId: trfId,
    });
  },

  async giveCashToParty({ date, partyId, partyName, amount, description }) {
    const numAmount = Number(amount || 0);
    return await this.addEntry({
      date,
      type: 'CashGiven',
      partyId,
      partyName,
      debit: numAmount,
      credit: 0,
      description: description || `Cash given to ${partyName}`,
    });
  },

  async receiveCashFromParty({ date, partyId, partyName, amount, description }) {
    const numAmount = Number(amount || 0);
    return await this.addEntry({
      date,
      type: 'CashReceived',
      partyId,
      partyName,
      debit: 0,
      credit: numAmount,
      description: description || `Cash received from ${partyName}`,
    });
  },

  async update(id, data) {
    const existing = await db.cashBookEntries.get(id);
    if (!existing) throw new Error('Cash Book entry not found: ' + id);

    if (existing.linkedTransactionId) {
      throw new Error('This entry was created by another voucher and cannot be edited directly. Please edit the original voucher.');
    }

    const newDebit = Number(data.debit || 0);
    const newCredit = Number(data.credit || 0);

    const updated = {
      ...existing,
      date: data.date || existing.date,
      partyId: data.partyId !== undefined ? data.partyId : existing.partyId,
      partyName: data.partyName !== undefined ? data.partyName : existing.partyName,
      bankAccountId: data.bankAccountId !== undefined ? data.bankAccountId : existing.bankAccountId,
      bankAccountName: data.bankAccountName !== undefined ? data.bankAccountName : existing.bankAccountName,
      debit: newDebit,
      credit: newCredit,
      description: data.description !== undefined ? data.description : existing.description,
      type: data.type || existing.type,
      updatedAt: new Date().toISOString(),
      editCount: (Number(existing.editCount) || 0) + 1,
    };

    await db.transaction('rw', [db.cashBookEntries, db.parties, db.accounts], async () => {
      // 1. Reverse old
      await this.reverseBookLines([existing]);

      // 2. Put updated
      await db.cashBookEntries.put(updated);

      // 3. Apply new
      await this.applyBookLines([updated]);
    });

    await partyService.recalculateAllBalances();
    await this.recalculateCashBalance();
    return updated;
  },

  async delete(id) {
    const existing = await db.cashBookEntries.get(id);
    if (!existing) return;

    if (existing.linkedTransactionId) {
      throw new Error('This entry was created by another voucher and cannot be deleted directly. Please delete from the original voucher.');
    }

    await db.transaction('rw', [db.cashBookEntries, db.parties, db.accounts], async () => {
      // 1. Reverse
      await this.reverseBookLines([existing]);

      // 2. Delete
      await db.cashBookEntries.delete(id);
    });

    await partyService.recalculateAllBalances();
    await this.recalculateCashBalance();
  },
};
