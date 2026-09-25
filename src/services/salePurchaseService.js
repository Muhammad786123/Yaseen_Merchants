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

    const entries = [];

    // 1. Purchase of goods (Mal Kharid) -> Debit Mall A/C
    purchases.forEach((p) => {
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
        debit: Number(p.total || 0),
        credit: 0,
      });
    });

    // 2. Sale of goods (Mal Farokht) -> Credit Mall A/C
    sales.forEach((s) => {
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
        category: e.category || 'Expense',
        partyName: e.category || 'Expense',
        description: e.description || e.category,
        debit: Number(e.amount || 0),
        credit: 0,
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
      .filter((l) => l.category !== 'Sale' && l.category !== 'Purchase')
      .reduce((sum, l) => sum + l.debit, 0);

    const netBalance = totalSales - (totalPurchases + totalExpenses);

    return {
      totalSales,
      totalPurchases,
      totalExpenses,
      netBalance,
    };
  },
};

