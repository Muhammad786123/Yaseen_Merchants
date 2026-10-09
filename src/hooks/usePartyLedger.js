import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database.js';
import { useParties } from './useParties.js';
import { usePurchases } from './usePurchases.js';
import { useSales } from './useSales.js';
import { useFinances } from './useFinances.js';
import { useCashBook } from './useCashBook.js';
import { useIssues } from './useIssues.js';
import { fmt } from '../utils/formatters.js';

/**
 * Custom hook to compile and calculate 9-column Party Account Ledger transactions
 * matching legacy PERBALACC statement layout.
 *
 * Columns: Date, Detail, Bill No., Quantity, Weight, Rate, Debit (Dr), Credit (Cr), Balance
 */
export function usePartyLedger(selectedPartyId) {
  const { parties } = useParties();
  const { purchases } = usePurchases();
  const { sales } = useSales();
  const { receipts, payments } = useFinances();
  const { cashBookEntries } = useCashBook();
  const { issues } = useIssues();
  const journalEntries = useLiveQuery(() => (db.journalEntries ? db.journalEntries.toArray() : []), []) || [];

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  const transactions = [];

  // 1. Purchase Invoices
  purchases.forEach((p) => {
    if (p.supplierId === selectedPartyId || p.partyId === selectedPartyId) {
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
        date: p.date,
        billNo: p.no || p.refNo || 'PUR',
        type: 'Purchase Invoice',
        detail,
        quantity: totalNugs > 0 ? totalNugs : '-',
        weight: totalKg > 0 ? totalKg : '-',
        rate,
        debit: Number(p.total || 0),
        credit: 0,
      });
    }
  });

  // 2. Sale Invoices
  sales.forEach((s) => {
    if (s.customerId === selectedPartyId || s.partyId === selectedPartyId) {
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
        date: s.date,
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

  // 3. Receipts (Customer Payment received)
  receipts.forEach((r) => {
    if (r.partyId === selectedPartyId) {
      const detailStr = r.account
        ? `Receipt — ${r.account}${r.description ? ` (${r.description})` : ''}`
        : `Receipt — ${r.description || 'Customer Payment'}`;

      transactions.push({
        id: r.id,
        date: r.date,
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

  // 4. Payments (Supplier Settlement paid)
  payments.forEach((p) => {
    if (p.partyId === selectedPartyId) {
      const detailStr = p.account
        ? `Payment — ${p.account}${p.description ? ` (${p.description})` : ''}`
        : `Payment — ${p.description || 'Supplier Settlement'}`;

      transactions.push({
        id: p.id,
        date: p.date,
        billNo: p.no || p.refNo || 'PAY',
        type: 'Payment (Supplier Settlement)',
        detail: detailStr,
        quantity: '-',
        weight: '-',
        rate: '-',
        debit: 0,
        credit: Number(p.amount || 0),
      });
    }
  });

  // 5. Cash Book Entries
  cashBookEntries.forEach((cb) => {
    if (cb.partyId === selectedPartyId) {
      if (cb.type === 'CashGiven') {
        transactions.push({
          id: cb.id,
          date: cb.date,
          billNo: cb.refNo || 'CB-GIVE',
          type: 'Cash Given',
          detail: `Cash Given — ${cb.description || 'Physical cash given'}`,
          quantity: '-',
          weight: '-',
          rate: '-',
          debit: Number(cb.debit || cb.amount || 0),
          credit: 0,
        });
      } else if (cb.type === 'CashReceived') {
        transactions.push({
          id: cb.id,
          date: cb.date,
          billNo: cb.refNo || 'CB-RCV',
          type: 'Cash Received',
          detail: `Cash Received — ${cb.description || 'Physical cash received'}`,
          quantity: '-',
          weight: '-',
          rate: '-',
          debit: 0,
          credit: Number(cb.credit || cb.amount || 0),
        });
      }
    }
  });

  // 6. Issues (Material Issue rows if party-linked)
  issues.forEach((iss) => {
    if (
      iss.partyId === selectedPartyId ||
      iss.supplierId === selectedPartyId ||
      iss.customerId === selectedPartyId
    ) {
      const items = iss.items || [];
      const totalNugs = items.reduce((sum, i) => sum + Number(i.nugs || 0), 0);
      const totalKg = items.reduce((sum, i) => sum + Number(i.issueQty || i.qty || 0), 0);
      const rate = items[0]?.rate || '-';
      const detail = `Issue — ${iss.toArea || 'Material Issue'}`;

      transactions.push({
        id: iss.id,
        date: iss.date,
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

  // 7. Journal Entries (JV)
  journalEntries.forEach((jv) => {
    (jv.lines || []).forEach((line, idx) => {
      if (line.accountType === 'party' && line.accountId === selectedPartyId) {
        transactions.push({
          id: `${jv.id}_${idx}`,
          date: jv.date,
          billNo: jv.no || 'JV',
          type: 'Journal Voucher',
          detail: line.detail ? `JV: ${line.detail}` : (jv.narration ? `JV: ${jv.narration}` : 'Journal Entry'),
          quantity: '-',
          weight: '-',
          rate: '-',
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
        });
      }
    });
  });

  // Sort chronologically by date
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Compute running balance
  let runningBalance = Number(selectedParty?.openingBalance || 0);
  const ledgerRows = transactions.map((t) => {
    runningBalance += t.debit - t.credit;
    return { ...t, balance: runningBalance };
  });

  return {
    selectedParty,
    transactions,
    ledgerRows,
    openingBalance: Number(selectedParty?.openingBalance || 0),
    currentBalance: selectedParty?.balance !== undefined ? selectedParty.balance : runningBalance,
  };
}
