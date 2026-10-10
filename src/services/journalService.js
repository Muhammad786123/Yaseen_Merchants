import { db } from '../db/database.js';
import { cashBookService } from './cashBookService.js';
import { capitalService } from './capitalService.js';
import { syncStockEntriesToDb } from '../utils/stockUtils.js';

export const journalService = {
  async getAll() {
    if (!db.journalEntries) return [];
    return await db.journalEntries.reverse().toArray();
  },

  async getById(id) {
    if (!db.journalEntries) return null;
    return await db.journalEntries.get(id);
  },

  /**
   * Apply accounting effects of a Journal Voucher entry.
   * Sign rules:
   *  - party balance: balance - debit + credit
   *  - bank balance: balance + debit - credit
   *  - cash: via cashBookService.addEntry with debit = JV credit, credit = JV debit, linkedTransactionId = entry.id
   *  - capital: via capitalService.addEntry with linkedTransactionId = entry.id
   *  - mall and expense lines: derived dynamically, nothing to post
   */
  async applyPosting(entry) {
    const validLines = (entry.lines || []).filter(
      (l) => l.accountName && (Number(l.debit) > 0 || Number(l.credit) > 0)
    );

    for (const line of validLines) {
      const deb = Number(line.debit) || 0;
      const cred = Number(line.credit) || 0;
      const type = (line.accountType || '').toLowerCase();

      if (type === 'party') {
        const party = await db.parties.get(line.accountId);
        if (party) {
          const currentBal = Number(party.balance || 0);
          await db.parties.update(party.id, {
            balance: currentBal - deb + cred,
          });
        }
      } else if (type === 'capital') {
        if (cred > 0) {
          await capitalService.addEntry({
            type: 'Add',
            amount: cred,
            date: entry.date,
            description: `JV ${entry.no}${line.detail ? ' - ' + line.detail : ''}`,
            linkedTransactionId: entry.id,
          });
        }
        if (deb > 0) {
          await capitalService.addEntry({
            type: 'Withdraw',
            amount: deb,
            date: entry.date,
            description: `JV ${entry.no}${line.detail ? ' - ' + line.detail : ''}`,
            linkedTransactionId: entry.id,
          });
        }
      } else if (type === 'cash') {
        // JV Cash Debit (Cash In) -> Cash Book Credit/Jamma; JV Cash Credit (Cash Out) -> Cash Book Debit/Benaam
        await cashBookService.addEntry({
          date: entry.date,
          type: 'Journal',
          debit: cred,
          credit: deb,
          description: `JV ${entry.no}${line.detail ? ' - ' + line.detail : (entry.narration ? ' - ' + entry.narration : '')}`,
          linkedTransactionId: entry.id,
        });
      } else if (type === 'bank') {
        const bank =
          (await db.accounts.get(line.accountId)) ||
          (await db.accounts.where({ name: line.accountName }).first());
        if (bank) {
          const currentBal = Number(bank.balance || 0);
          await db.accounts.update(bank.id, {
            balance: currentBal + deb - cred,
          });
        }
      }
    }
  },

  /**
   * Reverse all accounting effects of an existing Journal Voucher entry.
   * Sign rules:
   *  - party balance: balance + debit - credit
   *  - bank balance: balance - debit + credit
   *  - cash: find cashBookEntries with linkedTransactionId = entry.id (fallback: description starts with 'JV ' + entry.no),
   *          restore Cash account balance (balance + debit - credit of those rows), then delete those rows
   *  - capital: delete capitalEntries with linkedTransactionId = entry.id (fallback by description)
   */
  async reversePosting(entry) {
    const validLines = (entry.lines || []).filter(
      (l) => l.accountName && (Number(l.debit) > 0 || Number(l.credit) > 0)
    );

    // 1. Reverse party and bank balances
    for (const line of validLines) {
      const deb = Number(line.debit) || 0;
      const cred = Number(line.credit) || 0;
      const type = (line.accountType || '').toLowerCase();

      if (type === 'party') {
        const party = await db.parties.get(line.accountId);
        if (party) {
          const currentBal = Number(party.balance || 0);
          await db.parties.update(party.id, {
            balance: currentBal + deb - cred,
          });
        }
      } else if (type === 'bank') {
        const bank =
          (await db.accounts.get(line.accountId)) ||
          (await db.accounts.where({ name: line.accountName }).first());
        if (bank) {
          const currentBal = Number(bank.balance || 0);
          await db.accounts.update(bank.id, {
            balance: currentBal - deb + cred,
          });
        }
      }
    }

    // 2. Reverse linked Cash Book entries and restore Cash account balance
    let linkedCashEntries = [];
    if (db.cashBookEntries) {
      if (entry.id) {
        linkedCashEntries = await db.cashBookEntries
          .where({ linkedTransactionId: entry.id })
          .toArray();
      }
      if (linkedCashEntries.length === 0 && entry.no) {
        // Fallback for older records created before linkedTransactionId
        const prefix = `JV ${entry.no}`;
        const allCb = await db.cashBookEntries.toArray();
        linkedCashEntries = allCb.filter((cb) => cb.description && cb.description.startsWith(prefix));
      }

      if (linkedCashEntries.length > 0) {
        const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
        if (cashAcc) {
          let netAdj = 0;
          for (const cb of linkedCashEntries) {
            netAdj += Number(cb.debit || 0) - Number(cb.credit || 0);
          }
          await db.accounts.update(cashAcc.id, {
            balance: Number(cashAcc.balance || 0) + netAdj,
          });
        }
        for (const cb of linkedCashEntries) {
          await db.cashBookEntries.delete(cb.id);
        }
      }
    }

    // 3. Reverse linked Capital entries
    if (db.capitalEntries) {
      let linkedCapEntries = [];
      if (entry.id) {
        linkedCapEntries = await db.capitalEntries
          .filter((c) => c.linkedTransactionId === entry.id)
          .toArray();
      }
      if (linkedCapEntries.length === 0 && entry.no) {
        const prefix = `JV ${entry.no}`;
        const allCap = await db.capitalEntries.toArray();
        linkedCapEntries = allCap.filter((c) => c.description && c.description.startsWith(prefix));
      }

      for (const cap of linkedCapEntries) {
        await db.capitalEntries.delete(cap.id);
      }
    }
  },

  /**
   * Add a new Journal Voucher inside a single atomic Dexie transaction.
   */
  async add(entryData) {
    const id = entryData.id || 'jv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const count = db.journalEntries ? await db.journalEntries.count() : 0;
    const no = entryData.no || `JV-${String(count + 1).padStart(4, '0')}`;

    const validLines = (entryData.lines || [])
      .filter((l) => l.accountName && (Number(l.debit) > 0 || Number(l.credit) > 0))
      .map((l) => ({
        accountType: l.accountType,
        accountId: l.accountId,
        accountName: l.accountName,
        detail: l.detail || '',
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }));

    const totalDebit = validLines.reduce((sum, l) => sum + l.debit, 0);

    const newEntry = {
      id,
      no,
      refNo: no,
      date: entryData.date || new Date().toISOString().split('T')[0],
      narration: (entryData.narration || '').trim() || 'Journal Transaction',
      totalAmount: totalDebit,
      lines: validLines,
      createdAt: entryData.createdAt || new Date().toISOString(),
      updatedAt: null,
      editCount: 0,
    };

    await db.transaction(
      'rw',
      [db.journalEntries, db.parties, db.accounts, db.cashBookEntries, db.capitalEntries],
      async () => {
        await db.journalEntries.add(newEntry);
        await this.applyPosting(newEntry);
      }
    );

    await syncStockEntriesToDb();
    return newEntry;
  },

  /**
   * Update an existing Journal Voucher inside a single atomic Dexie transaction:
   * (1) reversePosting(old)
   * (2) save changed record preserving voucher number and createdAt (update updatedAt, increment editCount)
   * (3) applyPosting(new)
   */
  async update(id, updatedData) {
    const existing = await db.journalEntries.get(id);
    if (!existing) throw new Error('Journal voucher not found: ' + id);

    const validLines = (updatedData.lines || [])
      .filter((l) => l.accountName && (Number(l.debit) > 0 || Number(l.credit) > 0))
      .map((l) => ({
        accountType: l.accountType,
        accountId: l.accountId,
        accountName: l.accountName,
        detail: l.detail || '',
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }));

    const totalDebit = validLines.reduce((sum, l) => sum + l.debit, 0);

    const updatedEntry = {
      ...existing,
      date: updatedData.date || existing.date,
      narration: (updatedData.narration !== undefined ? updatedData.narration : existing.narration).trim() || 'Journal Transaction',
      totalAmount: totalDebit,
      lines: validLines,
      updatedAt: new Date().toISOString(),
      editCount: (Number(existing.editCount) || 0) + 1,
    };

    await db.transaction(
      'rw',
      [db.journalEntries, db.parties, db.accounts, db.cashBookEntries, db.capitalEntries],
      async () => {
        // (1) Reverse old posting
        await this.reversePosting(existing);
        // (2) Save changed record with SAME voucher number and original createdAt
        await db.journalEntries.put(updatedEntry);
        // (3) Apply new posting
        await this.applyPosting(updatedEntry);
      }
    );

    await syncStockEntriesToDb();
    return updatedEntry;
  },

  /**
   * Delete a Journal Voucher:
   * (1) reversePosting(entry)
   * (2) remove record
   */
  async delete(id) {
    const existing = await db.journalEntries.get(id);
    if (!existing) return;

    await db.transaction(
      'rw',
      [db.journalEntries, db.parties, db.accounts, db.cashBookEntries, db.capitalEntries],
      async () => {
        await this.reversePosting(existing);
        await db.journalEntries.delete(id);
      }
    );

    await syncStockEntriesToDb();
  },
};
