import { db } from '../db/database.js';
import { fmt } from '../utils/formatters.js';
import { partySide } from '../utils/partyBalances.js';

/**
 * Builds the complete transaction list for a party across all vouchers and ledgers.
 * Can be called synchronously by passing preloaded datasets (from hooks),
 * or will fetch from Dexie database if preloaded data is omitted.
 *
 * Mapping convention:
 *  - Purchase: credit = total, debit = 0
 *  - Sale: debit = total, credit = 0
 *  - Receipt: credit = amount, debit = 0
 *  - Payment: debit = amount, credit = 0
 *  - Cash Given: debit = amount, credit = 0
 *  - Cash Received: credit = amount, debit = 0
 *  - Material Issue: debit = totalValue, credit = 0
 *  - Journal Voucher: its own debit / credit
 */
/**
 * Normalizes date to 'YYYY-MM-DD' for reliable string comparison.
 * Handles ISO dates ('2026-10-12...'), DD/MM/YYYY, DD-MM-YYYY, etc.
 */
export function parseDateToYMD(dateVal) {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return str;
}

/**
 * Extracts a numeric creation timestamp from a transaction or its ID.
 */
export function getTransactionTimestamp(t) {
  if (t.createdAt) {
    const time = new Date(t.createdAt).getTime();
    if (!isNaN(time) && time > 0) return time;
  }
  if (t.id) {
    const match = String(t.id).match(/_(\d{10,13})(_|$)/);
    if (match) {
      const num = Number(match[1]);
      if (!isNaN(num) && num > 1000000000000) return num;
    }
  }
  const ymd = parseDateToYMD(t.date);
  if (ymd) {
    const time = new Date(ymd).getTime();
    if (!isNaN(time)) return time;
  }
  return 0;
}

/**
 * Strict chronological comparator (oldest on top, newest at bottom):
 * 1. Date ascending (oldest date first)
 * 2. Creation time ascending (created earlier first)
 * 3. Voucher number ascending (e.g. SAL-0001 before SAL-0002)
 * 4. Stable ID ascending
 */
export function compareTransactionsChronological(a, b) {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  // 1. Date ascending (oldest first)
  const dateA = parseDateToYMD(a.date);
  const dateB = parseDateToYMD(b.date);
  if (dateA && dateB && dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }

  // 2. Creation timestamp ascending (created earlier first)
  const timeA = getTransactionTimestamp(a);
  const timeB = getTransactionTimestamp(b);
  if (timeA && timeB && timeA !== timeB) {
    return timeA - timeB;
  }

  // 3. Sequential bill/voucher number ascending
  const noA = String(a.no || a.billNo || '');
  const noB = String(b.no || b.billNo || '');
  if (noA && noB && noA !== noB) {
    return noA.localeCompare(noB, undefined, { numeric: true });
  }

  // 4. Stable ID ascending
  return String(a.id || '').localeCompare(String(b.id || ''));
}

export function buildPartyTransactions(partyId, preloaded = null) {
  if (!partyId) return [];

  const purchases = preloaded?.purchases || [];
  const sales = preloaded?.sales || [];
  const receipts = preloaded?.receipts || [];
  const payments = preloaded?.payments || [];
  const cashBookEntries = preloaded?.cashBookEntries || [];
  const issues = preloaded?.issues || [];
  const journalEntries = preloaded?.journalEntries || [];

  const transactions = [];

  // 1. Purchase Invoices (Credit)
  purchases.forEach((p) => {
    if (p.supplierId === partyId || p.partyId === partyId) {
      const items = p.items || [];
      const totalNugs =
        items.reduce((sum, i) => sum + Number(i.nugs || i.bags || i.pieces || 0), 0) ||
        Number(p.nugs || 0);

      const totalKg =
        items.filter((i) => i.type !== 'service').reduce((sum, i) => sum + Number(i.qty || i.weight || 0), 0) ||
        Number(p.qty || p.weight || 0);

      let rate = '-';
      if (items.length === 1 && items[0].rate) {
        rate = items[0].rate;
      } else if (items.length > 1 && totalKg > 0) {
        const itemSum = items.reduce((sum, i) => sum + Number(i.amount || (i.qty * i.rate) || 0), 0);
        rate = Math.round((itemSum / totalKg) * 100) / 100;
      } else if (p.rate) {
        rate = p.rate;
      }

      let itemsDesc = '';
      if (items.length > 0) {
        itemsDesc = items
          .map((i) => {
            if (i.type === 'service') return i.serviceDescription || 'Service';
            const name = i.itemName || i.quality || 'Goods';
            const nugStr = i.nugs || i.bags ? `${i.nugs || i.bags} bags ` : '';
            const rateStr = i.rate ? ` @ ${fmt(i.rate)}` : '';
            return `${nugStr}${name}${rateStr}`;
          })
          .join(', ');
      }

      const detail = `Purchase — ${itemsDesc || p.note || p.supplierName || 'Goods Purchase'}`;

      transactions.push({
        id: p.id,
        date: parseDateToYMD(p.date),
        createdAt: p.createdAt,
        no: p.no,
        billNo: p.no || p.refNo || 'PUR',
        type: 'Purchase Invoice',
        detail,
        quantity: totalNugs > 0 ? totalNugs : '-',
        weight: totalKg > 0 ? totalKg : '-',
        rate,
        debit: 0,
        credit: Number(p.total || 0),
      });
    }
  });

  // 2. Sale Invoices (Debit)
  sales.forEach((s) => {
    if (s.customerId === partyId || s.partyId === partyId) {
      const items = s.items || [];
      const totalNugs =
        items.reduce((sum, i) => sum + Number(i.nugs || i.bags || i.pieces || 0), 0) ||
        Number(s.nugs || 0);

      const totalKg =
        items.filter((i) => i.type !== 'service').reduce((sum, i) => sum + Number(i.qty || i.weight || 0), 0) ||
        Number(s.qty || s.weight || 0);

      let rate = '-';
      if (items.length === 1 && items[0].rate) {
        rate = items[0].rate;
      } else if (items.length > 1 && totalKg > 0) {
        const itemSum = items.reduce((sum, i) => sum + Number(i.amount || (i.qty * i.rate) || 0), 0);
        rate = Math.round((itemSum / totalKg) * 100) / 100;
      } else if (s.rate) {
        rate = s.rate;
      }

      let itemsDesc = '';
      if (items.length > 0) {
        itemsDesc = items
          .map((i) => {
            if (i.type === 'service') return i.serviceDescription || 'Service';
            const name = i.itemName || i.quality || 'Goods';
            const nugStr = i.nugs || i.bags ? `${i.nugs || i.bags} bags ` : '';
            const rateStr = i.rate ? ` @ ${fmt(i.rate)}` : '';
            return `${nugStr}${name}${rateStr}`;
          })
          .join(', ');
      }

      const detail = `Sale — ${itemsDesc || s.note || s.customerName || 'Goods Sale'}`;

      transactions.push({
        id: s.id,
        date: parseDateToYMD(s.date),
        createdAt: s.createdAt,
        no: s.no,
        billNo: s.no || s.refNo || 'SAL',
        type: 'Sale Invoice',
        detail,
        quantity: totalNugs > 0 ? totalNugs : '-',
        weight: totalKg > 0 ? totalKg : '-',
        rate,
        debit: Number(s.total || 0),
        credit: 0,
      });
    }
  });

  // 3. Receipts (Customer Payment received -> Credit)
  receipts.forEach((r) => {
    if (r.partyId === partyId) {
      const detailStr = r.account
        ? `Receipt — ${r.account}${r.description ? ` (${r.description})` : ''}`
        : `Receipt — ${r.description || 'Customer Payment'}`;

      transactions.push({
        id: r.id,
        date: parseDateToYMD(r.date),
        createdAt: r.createdAt,
        no: r.no,
        billNo: r.no || r.refNo || 'RCT',
        type: 'Receipt (Customer Payment)',
        detail: detailStr,
        quantity: '-',
        weight: '-',
        rate: '-',
        debit: 0,
        credit: Number(r.amount || 0),
      });
    }
  });

  // 4. Payments (Supplier Settlement paid -> Debit)
  payments.forEach((p) => {
    if (p.partyId === partyId) {
      const detailStr = p.account
        ? `Payment — ${p.account}${p.description ? ` (${p.description})` : ''}`
        : `Payment — ${p.description || 'Supplier Settlement'}`;

      transactions.push({
        id: p.id,
        date: parseDateToYMD(p.date),
        createdAt: p.createdAt,
        no: p.no,
        billNo: p.no || p.refNo || 'PAY',
        type: 'Payment (Supplier Settlement)',
        detail: detailStr,
        quantity: '-',
        weight: '-',
        rate: '-',
        debit: Number(p.amount || 0),
        credit: 0,
      });
    }
  });

  // 5. Cash Book Entries (Debit = Cash Given, Credit = Cash Received)
  // Skip entries linked to other vouchers (payments, receipts, purchases, sales) to avoid double counting
  cashBookEntries.forEach((cb) => {
    if (cb.partyId === partyId) {
      if (cb.linkedTransactionId) {
        return;
      }
      const d = Number(cb.debit || (cb.type === 'CashGiven' ? cb.amount : 0) || 0);
      const c = Number(cb.credit || (cb.type === 'CashReceived' ? cb.amount : 0) || 0);
      if (d > 0 || c > 0) {
        transactions.push({
          id: cb.id,
          date: parseDateToYMD(cb.date),
          createdAt: cb.createdAt,
          no: cb.refNo || (cb.cashBookNo ? `CB-${String(cb.cashBookNo).padStart(4, '0')}` : ''),
          billNo: cb.refNo || (cb.cashBookNo ? `CB-${String(cb.cashBookNo).padStart(4, '0')}` : (d > 0 ? 'CB-GIVE' : 'CB-RCV')),
          type: d > 0 && c === 0 ? 'Cash Given' : (c > 0 && d === 0 ? 'Cash Received' : 'Cash Book'),
          detail: cb.description ? `Cash Book — ${cb.description}` : (d > 0 ? 'Cash Given — Physical cash given' : 'Cash Received — Physical cash received'),
          quantity: '-',
          weight: '-',
          rate: '-',
          debit: d,
          credit: c,
        });
      }
    }
  });

  // 6. Material Issues (Debit)
  issues.forEach((iss) => {
    if (
      iss.partyId === partyId ||
      iss.supplierId === partyId ||
      iss.customerId === partyId
    ) {
      const items = iss.items || [];
      const totalNugs = items.reduce((sum, i) => sum + Number(i.nugs || 0), 0);
      const totalKg = items.reduce((sum, i) => sum + Number(i.issueQty || i.qty || 0), 0);
      const rate = items[0]?.rate || '-';
      const detail = `Issue — ${iss.toArea || 'Material Issue'}`;

      transactions.push({
        id: iss.id,
        date: parseDateToYMD(iss.date),
        createdAt: iss.createdAt,
        no: iss.no,
        billNo: iss.no || 'ISS',
        type: 'Material Issue',
        detail,
        quantity: totalNugs > 0 ? totalNugs : '-',
        weight: totalKg > 0 ? totalKg : '-',
        rate,
        debit: Number(iss.totalValue || 0),
        credit: 0,
      });
    }
  });

  // 7. Journal Entries (Own debit / credit lines)
  journalEntries.forEach((jv) => {
    (jv.lines || []).forEach((line, idx) => {
      if (
        line.accountType === 'party' &&
        (line.accountId === partyId || line.accountName === partyId)
      ) {
        transactions.push({
          id: `${jv.id}_${idx}`,
          date: parseDateToYMD(jv.date),
          createdAt: jv.createdAt,
          no: jv.no,
          billNo: jv.no || 'JV',
          type: 'Journal Voucher',
          detail: line.detail
            ? `JV: ${line.detail}`
            : jv.narration
            ? `JV: ${jv.narration}`
            : 'Journal Entry',
          quantity: '-',
          weight: '-',
          rate: '-',
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
        });
      }
    });
  });

  // Sort strictly chronologically: oldest on top (first), newest at the bottom (last)
  transactions.sort(compareTransactionsChronological);

  return transactions;
}

/**
 * Auto-assign readable numeric codes: 10001, 10002... to parties without codes.
 */
export async function ensurePartyCodes() {
  if (!db.parties) return;
  const parties = await db.parties.toArray();

  let maxCode = 10000;
  parties.forEach((p) => {
    const num = parseInt(p.code, 10);
    if (!isNaN(num) && num > maxCode && String(num) === String(p.code).trim()) {
      maxCode = num;
    }
  });

  const needCode = parties.filter((p) => {
    if (!p.code) return true;
    const num = parseInt(p.code, 10);
    return isNaN(num) || String(num) !== String(p.code).trim() || num < 10000;
  });

  if (needCode.length > 0) {
    needCode.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      return String(a.id).localeCompare(String(b.id));
    });

    await db.transaction('rw', db.parties, async () => {
      for (const p of needCode) {
        maxCode += 1;
        await db.parties.update(p.id, { code: String(maxCode) });
      }
    });
  }
}

/**
 * Auto-assign readable codes to accounts (Banks: 99101, 99102...; Cash: 99020).
 */
export async function ensureAccountCodes() {
  if (!db.accounts) return;
  const accounts = await db.accounts.toArray();
  const bankAccounts = accounts.filter((a) => !a.name.toLowerCase().includes('cash'));

  let nextBankCode = 99101;
  await db.transaction('rw', db.accounts, async () => {
    for (const b of bankAccounts) {
      const num = parseInt(b.code, 10);
      if (!b.code || isNaN(num) || num < 99100) {
        await db.accounts.update(b.id, { code: String(nextBankCode) });
      }
      nextBankCode++;
    }

    const cash = accounts.find((a) => a.name.toLowerCase().includes('cash'));
    if (cash && (!cash.code || cash.code !== '99020')) {
      await db.accounts.update(cash.id, { code: '99020' });
    }
  });
}

export const partyService = {
  async getAll() {
    await ensurePartyCodes();
    return await db.parties.toArray();
  },

  async getById(id) {
    return await db.parties.get(id);
  },

  async add(partyData) {
    const id = partyData.id || 'p_' + Date.now();

    let code = partyData.code ? String(partyData.code).trim() : '';
    if (!code) {
      const all = await db.parties.toArray();
      let maxCode = 10000;
      all.forEach((p) => {
        const num = parseInt(p.code, 10);
        if (!isNaN(num) && num > maxCode) maxCode = num;
      });
      code = String(maxCode + 1);
    }

    const newParty = {
      id,
      code,
      name: partyData.name,
      type: partyData.type || 'Supplier',
      phone: partyData.phone || '',
      city: partyData.city || '',
      openingBalance: Number(partyData.openingBalance || 0),
      balance: Number(partyData.openingBalance || 0),
      createdAt: partyData.createdAt || new Date().toISOString(),
    };
    await db.parties.add(newParty);
    return newParty;
  },

  async update(id, partyData) {
    const existing = await db.parties.get(id);
    if (!existing) throw new Error('Party not found');
    const updated = {
      ...existing,
      ...partyData,
      code: partyData.code ? String(partyData.code).trim() : existing.code,
      openingBalance:
        partyData.openingBalance !== undefined
          ? Number(partyData.openingBalance)
          : existing.openingBalance,
    };
    await db.parties.put(updated);
    // Automatically recalculate so party balance stays in sync with ledger
    await this.recalculateAllBalances();
    return updated;
  },

  async delete(id) {
    const existing = await db.parties.get(id);
    if (!existing) return;
    const { getPartyUsageCount } = await import('../utils/masterUsageChecker.js');
    const count = await getPartyUsageCount(existing.id, existing.name);
    if (count > 0) {
      throw new Error(`This record is used in ${count} transactions. Delete or edit those first`);
    }
    const res = await db.parties.delete(id);
    await this.recalculateAllBalances();
    return res;
  },

  /**
   * Async wrapper to fetch all transactions for a single party directly from database.
   */
  async buildPartyTransactions(partyId) {
    const preloaded = {
      purchases: db.purchases ? await db.purchases.toArray() : [],
      sales: db.sales ? await db.sales.toArray() : [],
      receipts: db.receipts ? await db.receipts.toArray() : [],
      payments: db.payments ? await db.payments.toArray() : [],
      cashBookEntries: db.cashBookEntries ? await db.cashBookEntries.toArray() : [],
      issues: db.issues ? await db.issues.toArray() : [],
      journalEntries: db.journalEntries ? await db.journalEntries.toArray() : [],
    };
    return buildPartyTransactions(partyId, preloaded);
  },

  /**
   * Recalculates all party balances from underlying voucher transactions:
   * balance = openingBalance + sum(credit) - sum(debit)
   * Saves results in one atomic Dexie transaction.
   * Returns list of changed parties { id, name, oldBalance, newBalance, side }.
   */
  async recalculateAllBalances() {
    if (!db.parties) return [];

    const parties = await db.parties.toArray();
    const purchases = db.purchases ? await db.purchases.toArray() : [];
    const sales = db.sales ? await db.sales.toArray() : [];
    const receipts = db.receipts ? await db.receipts.toArray() : [];
    const payments = db.payments ? await db.payments.toArray() : [];
    const cashBookEntries = db.cashBookEntries ? await db.cashBookEntries.toArray() : [];
    const issues = db.issues ? await db.issues.toArray() : [];
    const journalEntries = db.journalEntries ? await db.journalEntries.toArray() : [];

    const preloaded = {
      purchases,
      sales,
      receipts,
      payments,
      cashBookEntries,
      issues,
      journalEntries,
    };

    const changedParties = [];
    const updates = [];

    for (const party of parties) {
      const txns = buildPartyTransactions(party.id, preloaded);
      const totalCredit = txns.reduce((sum, t) => sum + Number(t.credit || 0), 0);
      const totalDebit = txns.reduce((sum, t) => sum + Number(t.debit || 0), 0);
      const newBalance = Number(party.openingBalance || 0) + totalCredit - totalDebit;
      const oldBalance = Number(party.balance || 0);

      if (Math.abs(oldBalance - newBalance) > 0.001) {
        changedParties.push({
          id: party.id,
          name: party.name,
          oldBalance,
          newBalance,
          side: partySide(newBalance).side,
        });
      }
      updates.push({ id: party.id, balance: newBalance });
    }

    if (updates.length > 0) {
      await db.transaction('rw', db.parties, async () => {
        for (const u of updates) {
          await db.parties.update(u.id, { balance: u.balance });
        }
      });
    }

    return changedParties;
  },
};
