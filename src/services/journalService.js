import { db } from '../db/database.js';
import { cashBookService } from './cashBookService.js';
import { capitalService } from './capitalService.js';
import { partyService } from './partyService.js';
import { syncStockEntriesToDb } from '../utils/stockUtils.js';
import { cashService, isJournalCashLine } from './cashService.js';

/**
 * ONE shared function for updating party balances from Journal lines:
 * CONVENTION (single source of truth for the whole app):
 *  party.balance > 0  => we owe the party => CREDIT (Jama), shown "Cr", Payable
 *  party.balance < 0  => party owes us    => DEBIT (Benaam), shown "Dr", Receivable
 * Journal party line:
 *  Posting: Debit => balance = balance - debit. Credit => balance = balance + credit.
 *  Reversal (edit/delete): balance = balance + debit - credit.
 *
 * @param {string} partyId
 * @param {number} debit
 * @param {number} credit
 * @param {boolean} isReversal
 */
export async function updatePartyBalanceFromJournal(partyId, debit = 0, credit = 0, isReversal = false) {
  if (!partyId) return null;
  const party =
    (await db.parties.get(partyId)) ||
    (await db.parties.where({ name: partyId }).first());
  if (!party) return null;

  const currentBal = Number(party.balance || 0);
  const deb = Number(debit || 0);
  const cred = Number(credit || 0);
  const delta = isReversal ? (deb - cred) : (cred - deb);
  const newBal = currentBal + delta;

  await db.parties.update(party.id, {
    balance: newBal,
  });
  return newBal;
}

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
   *  - party balance: balance - debit + credit (via shared updatePartyBalanceFromJournal)
   *  - bank balance: balance + debit - credit
   *  - cash: via cashBookService.addEntry with debit = JV credit, credit = JV debit, linkedTransactionId = entry.id, lineIndex = idx
   *  - capital: via capitalService.addEntry with linkedTransactionId = entry.id
   *  - mall and expense lines: derived dynamically, nothing to post
   */
  async applyPosting(entry) {
    const lines = entry.lines || [];
    const cashAcc =
      (await db.accounts.where({ name: 'Cash' }).first()) ||
      (await db.accounts.toArray()).find((a) => a.name?.toLowerCase().includes('cash'));
    const cashAccId = cashAcc?.id;

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const deb = Number(line.debit) || 0;
      const cred = Number(line.credit) || 0;
      if (deb === 0 && cred === 0) continue;

      const type = (line.accountType || '').toLowerCase();
      const isCash = isJournalCashLine(line, cashAccId);

      if (isCash) {
        // JV Cash Debit (Cash In) -> Cash Book Credit/Jamma; JV Cash Credit (Cash Out) -> Cash Book Debit/Benaam
        await cashBookService.addEntry({
          id: 'cb_jv_' + entry.id + '_' + idx,
          date: entry.date,
          type: 'Journal',
          lineIndex: idx,
          debit: cred,
          credit: deb,
          description: `JV ${entry.voucherNo || entry.no || ''}${
            line.detail ? ' - ' + line.detail : entry.narration ? ' - ' + entry.narration : ''
          }`,
          linkedTransactionId: entry.id,
          createdAt: entry.createdAt || new Date().toISOString(),
          accountType: 'general',
          accountName: 'Journal Voucher',
        });
      } else if (type === 'party') {
        await updatePartyBalanceFromJournal(line.accountId || line.accountName, deb, cred, false);
      } else if (type === 'capital') {
        if (cred > 0) {
          await capitalService.addEntry({
            type: 'Add',
            amount: cred,
            date: entry.date,
            description: `JV ${entry.voucherNo || entry.no || ''}${line.detail ? ' - ' + line.detail : ''}`,
            linkedTransactionId: entry.id,
          });
        }
        if (deb > 0) {
          await capitalService.addEntry({
            type: 'Withdraw',
            amount: deb,
            date: entry.date,
            description: `JV ${entry.voucherNo || entry.no || ''}${line.detail ? ' - ' + line.detail : ''}`,
            linkedTransactionId: entry.id,
          });
        }
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
   *  - party balance: balance + debit - credit (via shared updatePartyBalanceFromJournal)
   *  - bank balance: balance - debit + credit
   *  - cash: find cashBookEntries with linkedTransactionId = entry.id (fallback: description starts with 'JV ' + entry.no)
   *          and delete them.
   *  - capital: delete capitalEntries with linkedTransactionId = entry.id
   */
  async reversePosting(entry) {
    const lines = entry.lines || [];

    // 1. Reverse party and bank balances
    for (const line of lines) {
      const deb = Number(line.debit) || 0;
      const cred = Number(line.credit) || 0;
      if (deb === 0 && cred === 0) continue;
      const type = (line.accountType || '').toLowerCase();

      if (type === 'party') {
        await updatePartyBalanceFromJournal(line.accountId || line.accountName, deb, cred, true);
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

    // 2. Reverse linked Cash Book entries
    if (db.cashBookEntries) {
      let linkedCashEntries = [];
      if (entry.id) {
        linkedCashEntries = await db.cashBookEntries
          .where({ linkedTransactionId: entry.id })
          .toArray();
      }
      if (linkedCashEntries.length === 0 && (entry.no || entry.voucherNo)) {
        const prefix = `JV ${entry.voucherNo || entry.no}`;
        const allCb = await db.cashBookEntries.toArray();
        linkedCashEntries = allCb.filter((cb) => cb.description && cb.description.startsWith(prefix));
      }

      for (const cb of linkedCashEntries) {
        await db.cashBookEntries.delete(cb.id);
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
    // Run recalculation automatically so stored party balance can never drift from the ledger
    await partyService.recalculateAllBalances();
    await cashService.recalculateCashBalance();
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
      narration:
        (updatedData.narration !== undefined ? updatedData.narration : existing.narration).trim() ||
        'Journal Transaction',
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
    // Run recalculation automatically so stored party balance can never drift from the ledger
    await partyService.recalculateAllBalances();
    await cashService.recalculateCashBalance();
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
    // Run recalculation automatically so stored party balance can never drift from the ledger
    await partyService.recalculateAllBalances();
    await cashService.recalculateCashBalance();
  },
};
