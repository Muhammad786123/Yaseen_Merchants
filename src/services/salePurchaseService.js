import { db } from '../db/database.js';
import { issueTotalValue } from './issueService.js';
import { getLineLabel } from '../utils/formatters.js';

export const salePurchaseService = {
  /**
   * Retrieves all Sale, Purchase, Expense, and Material Issue transactions in chronological date order
   * for the unified Sale Purchase A/C (Mall A/C) ledger.
   * Mal Kharid (Purchase) = Debit (Cost)
   * Mal Farokht (Sale) = Credit (Revenue)
   * Expenses (Labour, Electricity, Rent, etc.) = Debit (Cost/Expense)
   * Material Issues = Debit
   */
  async getLedger() {
    const purchases = await db.purchases.toArray();
    const sales = await db.sales.toArray();
    const expenses = await db.expenses.toArray();
    const issues = db.issues ? await db.issues.toArray() : [];
    const journalEntries = db.journalEntries ? await db.journalEntries.toArray() : [];

    const entries = [];

    // 1. Purchase of goods (Mal Kharid) -> Debit Mall A/C
    purchases.forEach((p) => {
      const totalQty = p.items ? p.items.reduce((s, i) => s + Number(i.quantity || 0), 0) : Number(p.quantity || 0);
      const totalWeight = p.items ? p.items.reduce((s, i) => s + Number(i.weight || 0), 0) : Number(p.weight || 0);
      const firstItem = p.items && p.items[0];
      const rate = firstItem ? Number(firstItem.rate || 0) : Number(p.rate || 0);

      entries.push({
        id: p.id,
        rawId: p.id,
        no: p.no,
        date: p.date,
        createdAt: p.createdAt,
        type: 'Purchase (Mal Kharid)',
        category: 'Purchase',
        partyName: p.supplierName,
        description: p.items
          ? p.items.map((i) => getLineLabel(i)).join(', ')
          : 'Raw Material Purchase',
        quantity: totalQty || undefined,
        weight: totalWeight || undefined,
        rate: rate || undefined,
        debit: Number(p.total || 0),
        credit: 0,
        rawEntry: p,
      });
    });

    // 2. Sale of goods (Mal Farokht) -> Credit Mall A/C
    sales.forEach((s) => {
      const totalQty = s.items ? s.items.reduce((acc, i) => acc + Number(i.quantity || 0), 0) : Number(s.quantity || 0);
      const totalWeight = s.items ? s.items.reduce((acc, i) => acc + Number(i.weight || 0), 0) : Number(s.weight || 0);
      const firstItem = s.items && s.items[0];
      const rate = firstItem ? Number(firstItem.rate || 0) : Number(s.rate || 0);

      entries.push({
        id: s.id,
        rawId: s.id,
        no: s.no,
        date: s.date,
        createdAt: s.createdAt,
        type: 'Sale (Mal Farokht)',
        category: 'Sale',
        partyName: s.customerName,
        description: s.items
          ? s.items.map((i) => getLineLabel(i)).join(', ')
          : 'Finished Product Sale',
        quantity: totalQty || undefined,
        weight: totalWeight || undefined,
        rate: rate || undefined,
        debit: 0,
        credit: Number(s.total || 0),
        rawEntry: s,
      });
    });

    // 3. Operating Expenses (Jati Kharcha, Labour, Rent, Electricity, etc.) -> Debit Mall A/C
    expenses.forEach((e) => {
      entries.push({
        id: e.id,
        rawId: e.id,
        no: e.id ? e.id.toUpperCase().replace('EXP_', 'EXP-') : 'EXP',
        date: e.date,
        createdAt: e.createdAt,
        type: `Expense (${e.category || 'General'})`,
        category: 'Expense',
        partyName: e.category || 'Expense',
        description: e.description || e.category,
        debit: Number(e.amount || 0),
        credit: 0,
        rawEntry: e,
      });
    });

    // 4. Journal Adjustments to Mall A/C & Expenses
    journalEntries.forEach((jv) => {
      (jv.lines || []).forEach((line, idx) => {
        if (line.accountType === 'mall' || line.accountType === 'expense') {
          const deb = Number(line.debit || 0);
          const cred = Number(line.credit || 0);
          if (deb > 0 || cred > 0) {
            const isOpening =
              jv.isOpening ||
              (jv.narration && jv.narration.toLowerCase().includes('opening')) ||
              (line.detail && line.detail.toLowerCase().includes('opening')) ||
              jv.no === 'JV-0001' ||
              jv.refNo === 'JV-0001';

            entries.push({
              id: `${jv.id}_line_${idx}`,
              rawId: jv.id,
              no: jv.no || jv.refNo || 'JV',
              date: jv.date,
              createdAt: jv.createdAt,
              type:
                line.accountType === 'mall'
                  ? isOpening
                    ? 'Opening Balance (Mall A/C)'
                    : 'Journal Adjustment (Mall A/C)'
                  : `Journal Adjustment (Expense — ${line.accountId || line.accountName})`,
              category: 'Journal',
              isOpening: isOpening && line.accountType === 'mall',
              partyName: line.accountName || (line.accountType === 'mall' ? 'Mall A/C' : 'Expense'),
              description: line.detail || jv.narration || 'Journal Voucher Adjustment',
              debit: deb,
              credit: cred,
              rawEntry: jv,
            });
          }
        }
      });
    });

    // 5. Cash Book Mall/Trading accounts (accountType === 'mall')
    const cashBookEntries = db.cashBookEntries ? await db.cashBookEntries.toArray() : [];
    cashBookEntries.forEach((cb) => {
      if (cb.accountType === 'mall') {
        const deb = Number(cb.debit || 0);
        const cred = Number(cb.credit || 0);
        if (deb > 0 || cred > 0) {
          const head = cb.head || (cb.accountName?.toLowerCase().includes('sale') ? 'Sale' : cb.accountName?.toLowerCase().includes('purchase') ? 'Purchase' : 'Mall');
          const cbNo = cb.cashBookNo ? `CB-${String(cb.cashBookNo).padStart(4, '0')}` : cb.refNo || 'CB';
          entries.push({
            id: cb.id,
            rawId: cb.id,
            no: cbNo,
            cashBookNo: cb.cashBookNo,
            date: cb.date,
            createdAt: cb.createdAt,
            type: `Cash Book (${head})`,
            category: 'CashBook',
            head: head,
            partyName: cb.accountName || `Mall A/C (${head})`,
            description: cb.description || `Cash Book #${cb.cashBookNo || ''}`,
            debit: deb,
            credit: cred,
            rawEntry: cb,
          });
        }
      }
    });

    // 6. Material Issues -> Debit Mall A/C only if affecting Mall A/C
    issues.forEach((iss) => {
      if (!iss.affectMall && !iss.affectsMall && iss.accountType !== 'mall') return;
      const items = iss.items || [];
      const totalWeight = items.reduce((sum, i) => sum + Number(i.issueQty !== undefined ? i.issueQty : (i.qty || 0)), 0);
      const totalNugs = items.reduce((sum, i) => sum + Number(i.nugs || 0), 0);
      const firstItem = items[0];
      const rate = firstItem ? Number(firstItem.rate || 0) : undefined;
      const val = issueTotalValue(iss);

      entries.push({
        id: iss.id,
        rawId: iss.id,
        no: iss.no || 'ISS',
        date: iss.date,
        createdAt: iss.createdAt,
        type: 'Material Issue',
        category: 'Issue',
        partyName: iss.toArea || iss.fromWarehouse || 'Material Issue',
        description: items.map((i) => `${i.itemName} (${i.issueQty || i.qty} KG)`).join(', ') || 'Material Issue',
        quantity: totalNugs || undefined,
        weight: totalWeight || undefined,
        rate: rate || undefined,
        debit: val,
        credit: 0,
        rawEntry: iss,
      });
    });

    // Sort by date, then createdAt, then voucher number
    entries.sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      if (a.isOpening && !b.isOpening) return -1;
      if (!a.isOpening && b.isOpening) return 1;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return String(a.no || '').localeCompare(String(b.no || ''), undefined, { numeric: true });
    });

    let running = 0;
    const ledger = entries.map((e) => {
      running = running + (Number(e.credit) || 0) - (Number(e.debit) || 0);
      return {
        ...e,
        balance: running,
      };
    });

    return ledger;
  },

  async getSummary() {
    const ledger = await this.getLedger();

    const totalSales = ledger.filter((l) => l.category === 'Sale').reduce((sum, l) => sum + l.credit, 0);
    const totalPurchases = ledger.filter((l) => l.category === 'Purchase').reduce((sum, l) => sum + l.debit, 0);
    const totalExpenses = ledger
      .filter((l) => l.category === 'Expense')
      .reduce((sum, l) => sum + l.debit, 0);
    const jvAdjustments = ledger
      .filter((l) => l.category === 'Journal')
      .reduce((sum, l) => sum + l.credit - l.debit, 0);
    const cashBookAdjustments = ledger
      .filter((l) => l.category === 'CashBook')
      .reduce((sum, l) => sum + l.credit - l.debit, 0);

    const netBalance = totalSales - (totalPurchases + totalExpenses) + jvAdjustments + cashBookAdjustments;

    return {
      totalSales,
      totalPurchases,
      totalExpenses,
      jvAdjustments,
      cashBookAdjustments,
      netBalance,
    };
  },
};

