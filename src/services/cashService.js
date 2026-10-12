import { db } from '../db/database.js';

/**
 * Extracts a numeric timestamp from an entry, checking createdAt first,
 * then parsing the timestamp from the id (e.g., 'cb_1712345678...').
 */
export function getEntryTimestamp(entry) {
  if (!entry) return 0;
  if (entry.createdAt) {
    const t = new Date(entry.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (entry.id && typeof entry.id === 'string') {
    const match = entry.id.match(/^cb_(\d+)/);
    if (match) {
      const num = Number(match[1]);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return 0;
}

/**
 * Chronological comparator for cashBookEntries:
 * 1. date ascending ('YYYY-MM-DD')
 * 2. creation time ascending
 * 3. stable id ascending
 */
export function compareCashEntries(a, b) {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  const dateA = a.date || '';
  const dateB = b.date || '';
  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }

  const timeA = getEntryTimestamp(a);
  const timeB = getEntryTimestamp(b);
  if (timeA !== timeB) {
    return timeA - timeB;
  }

  return (a.id || '').localeCompare(b.id || '');
}

/**
 * Helper to determine if an entry is strictly before the beforeKey.
 */
export function isEntryBeforeKey(entry, beforeKey) {
  if (!beforeKey) return true;

  // If beforeKey specifies a cashBookNo:
  if (beforeKey.cashBookNo !== undefined && beforeKey.cashBookNo !== null) {
    const targetBookNo = Number(beforeKey.cashBookNo);
    const entryBookNo = entry.cashBookNo ? Number(entry.cashBookNo) : null;

    // Entries in the exact same Cash Book are part of the book itself, NOT before it
    if (entryBookNo !== null && entryBookNo === targetBookNo) {
      return false;
    }
    // Entries in later Cash Books are after it
    if (entryBookNo !== null && entryBookNo > targetBookNo) {
      return false;
    }
    // Entries in earlier Cash Books are definitely before it
    if (entryBookNo !== null && entryBookNo < targetBookNo) {
      return true;
    }
  }

  // Fallback to chronological comparison
  return compareCashEntries(entry, beforeKey) < 0;
}

/**
 * Pure calculation function that works synchronously over arrays of entries & accounts.
 */
export function calculateCashBalanceFromEntries(entries = [], accounts = [], { beforeKey } = {}) {
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const cashAcc = safeAccounts.find((a) => a.name?.toLowerCase() === 'cash' || a.name?.toLowerCase().includes('cash'));
  const openingBalance = Number(cashAcc?.openingBalance || 0);

  const safeEntries = Array.isArray(entries) ? entries : [];
  const sorted = [...safeEntries].sort(compareCashEntries);

  let net = 0;
  for (const entry of sorted) {
    if (beforeKey && !isEntryBeforeKey(entry, beforeKey)) {
      continue;
    }
    const debit = Number(entry.debit || 0);
    const credit = Number(entry.credit || 0);
    net += (credit - debit);
  }

  return openingBalance + net;
}

/**
 * Checks if a Journal line refers to the Physical Cash account.
 */
export function isJournalCashLine(line, cashAccId = null) {
  if (!line) return false;
  const type = (line.accountType || '').toLowerCase();
  const name = (line.accountName || '').toLowerCase().trim();
  const id = String(line.accountId || '').toLowerCase().trim();

  if (type === 'cash') return true;
  if (name === 'cash' || name === 'physical cash') return true;
  if (cashAccId && (line.accountId === cashAccId || line.accountName === cashAccId)) return true;
  if (id === 'cash' || id === 'csh_cash') return true;
  return false;
}

export const cashService = {
  /**
   * ONE CASH BALANCE FUNCTION:
   * Cash account openingBalance + sum(credit - debit) over ALL cashBookEntries
   * sorted by date then by creation time.
   *
   * When beforeKey is provided, calculates balance strictly from entries
   * created before that key.
   */
  async getCashBalance({ beforeKey } = {}) {
    if (!db.accounts || !db.cashBookEntries) return 0;
    const accounts = await db.accounts.toArray();
    const entries = await db.cashBookEntries.toArray();
    return calculateCashBalanceFromEntries(entries, accounts, { beforeKey });
  },

  /**
   * Recalculates Cash balance from all entries and updates accounts.balance (Cash).
   */
  async recalculateCashBalance() {
    if (!db.accounts || !db.cashBookEntries) return 0;
    const computedBalance = await this.getCashBalance();

    const cashAcc =
      (await db.accounts.where({ name: 'Cash' }).first()) ||
      (await db.accounts.toArray()).find((a) => a.name?.toLowerCase().includes('cash'));

    if (cashAcc) {
      await db.accounts.update(cashAcc.id, {
        balance: computedBalance,
      });
    }

    return computedBalance;
  },

  /**
   * JOURNAL CASH LINES MUST ALWAYS HAVE A CASH BOOK ROW:
   * For each saved journal entry and each cash line:
   * creates a cashBookEntries row (type 'Journal', linkedTransactionId = journal id,
   * lineIndex = idx, debit = JV credit, credit = JV debit, description = 'JV <no>').
   * Idempotent (never creates duplicates).
   */
  async repairJournalCashRows() {
    if (!db.journalEntries || !db.cashBookEntries) {
      return { repairedCount: 0, currentCashBalance: 0 };
    }

    const cashAcc =
      (await db.accounts.where({ name: 'Cash' }).first()) ||
      (await db.accounts.toArray()).find((a) => a.name?.toLowerCase().includes('cash'));
    const cashAccId = cashAcc?.id;

    const journals = await db.journalEntries.toArray();
    const existingCb = await db.cashBookEntries.toArray();

    const journalIdsSet = new Set(journals.map((j) => j.id));
    let repairedCount = 0;
    const entriesToAdd = [];

    // 1. Verify every cash line in every journal entry exists in cashBookEntries
    for (const j of journals) {
      const lines = j.lines || [];
      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        const deb = Number(line.debit || 0);
        const cred = Number(line.credit || 0);
        if (deb === 0 && cred === 0) continue;

        if (isJournalCashLine(line, cashAccId)) {
          // Check if cashBookEntries row exists for this journal id and line index
          const exists = existingCb.find(
            (cb) =>
              cb.linkedTransactionId === j.id &&
              (cb.lineIndex === idx || (cb.lineIndex === undefined && idx === 0))
          );

          if (!exists) {
            const newRow = {
              id: 'cb_jv_' + j.id + '_' + idx,
              date: j.date,
              type: 'Journal',
              linkedTransactionId: j.id,
              lineIndex: idx,
              debit: cred, // JV Credit (Cash Out) -> Cash Book Debit/Benaam
              credit: deb, // JV Debit (Cash In) -> Cash Book Credit/Jamma
              description: `JV ${j.voucherNo || j.no || ''}${
                line.detail ? ' - ' + line.detail : j.narration ? ' - ' + j.narration : ''
              }`,
              createdAt: j.createdAt || new Date().toISOString(),
              accountType: 'general',
              accountName: 'Journal Voucher',
            };
            entriesToAdd.push(newRow);
            repairedCount++;
          }
        }
      }
    }

    if (entriesToAdd.length > 0) {
      await db.cashBookEntries.bulkAdd(entriesToAdd);
    }

    // 2. Remove orphaned Journal cash book entries whose journal entry no longer exists
    const orphans = existingCb.filter(
      (cb) => cb.type === 'Journal' && cb.linkedTransactionId && !journalIdsSet.has(cb.linkedTransactionId)
    );
    if (orphans.length > 0) {
      for (const o of orphans) {
        await db.cashBookEntries.delete(o.id);
      }
    }

    // 3. Keep accounts.balance (Cash) in sync with the computed cash balance
    const currentCashBalance = await this.recalculateCashBalance();

    return {
      repairedCount,
      orphansRemoved: orphans.length,
      currentCashBalance,
    };
  },
};
