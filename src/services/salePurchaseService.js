import { db } from '../db/database.js';

export const salePurchaseService = {
  /**
   * Retrieves all Sale, Purchase, and Expense transactions in chronological date order
   * for the unified Sale Purchase A/C (Mall A/C) ledger.
   * Mal Kharid (Purchase) = Debit (Cost)
   * Mal Farokht (Sale) = Credit (Revenue)
   * Expenses (Labour, Electricity, Rent, etc.) = Debit (Cost/Expense)
   */
  async getLedger() {
    const purchases = await db.purchases.toArray();
    const sales = await db.sales.toArray();
    const expenses = await db.expenses.toArray();
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
        type: 'Purchase (Mal Kharid)',
        category: 'Purchase',
        partyName: p.supplierName,
        description: p.items
          ? p.items.map((i) => (i.type === 'service' ? i.serviceDescription : i.itemName)).join(', ')
          : 'Raw Material Purchase',
        quantity: totalQty || undefined,
        weight: totalWeight || undefined,
        rate: rate || undefined,
        debit: Number(p.total || 0),
        credit: 0,
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
        type: 'Sale (Mal Farokht)',
        category: 'Sale',
        partyName: s.customerName,
        description: s.items
          ? s.items.map((i) => (i.type === 'service' ? i.serviceDescription : i.itemName)).join(', ')
          : 'Finished Product Sale',
        quantity: totalQty || undefined,
        weight: totalWeight || undefined,
        rate: rate || undefined,
        debit: 0,
        credit: Number(s.total || 0),
      });
    });

    // 3. Operating Expenses (Jati Kharcha, Labour, Rent, Electricity, etc.) -> Debit Mall A/C
    expenses.forEach((e) => {
      entries.push({
        id: e.id,
        rawId: e.id,
        no: e.id ? e.id.toUpperCase().replace('EXP_', 'EXP-') : 'EXP',
        date: e.date,
        type: `Expense (${e.category || 'General'})`,
        category: 'Expense',
        partyName: e.category || 'Expense',
        description: e.description || e.category,
        debit: Number(e.amount || 0),
        credit: 0,
      });
    });

    // 4. Journal Adjustments to Mall A/C & Expenses
    journalEntries.forEach((jv) => {
      (jv.lines || []).forEach((line, idx) => {
        if (line.accountType === 'mall' || line.accountType === 'expense') {
          const deb = Number(line.debit || 0);
          const cred = Number(line.credit || 0);
          if (deb > 0 || cred > 0) {
            entries.push({
              id: `${jv.id}_line_${idx}`,
              rawId: jv.id,
              no: jv.no || jv.refNo || 'JV',
              date: jv.date,
              type:
                line.accountType === 'mall'
                  ? 'Journal Adjustment (Mall A/C)'
                  : `Journal Adjustment (Expense — ${line.accountId || line.accountName})`,
              category: 'Journal',
              partyName: line.accountName || (line.accountType === 'mall' ? 'Mall A/C' : 'Expense'),
              description: line.detail || jv.narration || 'Journal Voucher Adjustment',
              debit: deb,
              credit: cred,
            });
          }
        }
      });
    });

    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = 0;
    const ledger = entries.map((e) => {
      running = running + e.credit - e.debit;
      return {
        ...e,
        balance: running,
      };
    });

    return ledger.reverse();
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

    const netBalance = totalSales - (totalPurchases + totalExpenses) + jvAdjustments;

    return {
      totalSales,
      totalPurchases,
      totalExpenses,
      jvAdjustments,
      netBalance,
    };
  },
};

