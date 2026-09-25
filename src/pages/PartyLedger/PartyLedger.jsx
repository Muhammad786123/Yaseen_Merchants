import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useParties } from '../../hooks/useParties.js';
import { usePurchases } from '../../hooks/usePurchases.js';
import { useSales } from '../../hooks/useSales.js';
import { useFinances } from '../../hooks/useFinances.js';
import { useCashBook } from '../../hooks/useCashBook.js';
import { fmt, formatDate } from '../../utils/formatters.js';

export default function PartyLedger() {
  const { parties } = useParties();
  const { purchases } = usePurchases();
  const { sales } = useSales();
  const { receipts, payments } = useFinances();
  const { cashBookEntries } = useCashBook();

  const [selectedPartyId, setSelectedPartyId] = useState(parties[0]?.id || 'p1');

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  // Combine purchase, sale, receipt, payment, and direct cash book transactions for party ledger
  const transactions = [];

  purchases.forEach((p) => {
    if (p.supplierId === selectedPartyId) {
      transactions.push({
        date: p.date,
        refNo: p.no,
        type: 'Purchase Invoice',
        debit: 0,
        credit: p.total,
        note: `Purchase from ${p.supplierName}`,
      });
    }
  });

  sales.forEach((s) => {
    if (s.customerId === selectedPartyId) {
      transactions.push({
        date: s.date,
        refNo: s.no,
        type: 'Sale Invoice',
        debit: s.total,
        credit: 0,
        note: `Sale to ${s.customerName}`,
      });
    }
  });

  receipts.forEach((r) => {
    if (r.partyId === selectedPartyId) {
      transactions.push({
        date: r.date,
        refNo: r.no,
        type: 'Receipt (Customer Payment)',
        debit: 0,
        credit: r.amount,
        note: r.description || `Payment received into ${r.account}`,
      });
    }
  });

  payments.forEach((p) => {
    if (p.partyId === selectedPartyId) {
      transactions.push({
        date: p.date,
        refNo: p.no,
        type: 'Payment (Supplier Settlement)',
        debit: p.amount,
        credit: 0,
        note: p.description || `Payment paid from ${p.account}`,
      });
    }
  });

  // Direct Cash Book Given / Received entries
  cashBookEntries.forEach((cb) => {
    if (cb.partyId === selectedPartyId) {
      if (cb.type === 'CashGiven') {
        transactions.push({
          date: cb.date,
          refNo: 'CB-GIVE',
          type: 'Cash Given to Party',
          debit: cb.debit,
          credit: 0,
          note: cb.description || 'Physical cash given to party',
        });
      } else if (cb.type === 'CashReceived') {
        transactions.push({
          date: cb.date,
          refNo: 'CB-RCV',
          type: 'Cash Received from Party',
          debit: 0,
          credit: cb.credit,
          note: cb.description || 'Physical cash received from party',
        });
      }
    }
  });

  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBalance = Number(selectedParty?.openingBalance || 0);
  const ledgerRows = transactions.map((t) => {
    runningBalance += t.debit - t.credit;
    return { ...t, balance: runningBalance };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Party Statement & Ledger"
        subtitle="Complete financial debit/credit audit ledger reflecting purchases, sales, settlements, and physical cash movements"
      />

      <div className="bg-white p-4 rounded-xl border border-[#E0DBD3] max-w-md">
        <Select
          label="Select Party Account"
          value={selectedPartyId}
          onChange={setSelectedPartyId}
          options={parties.map((p) => ({ value: p.id, label: `${p.name} (${p.type} - ${p.city})` }))}
        />
      </div>

      {selectedParty && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-[#E0DBD3] text-xs">
          <div>
            <span className="text-gray-500">Party Type:</span>{' '}
            <Badge variant="blue">{selectedParty.type}</Badge>
          </div>
          <div>
            <span className="text-gray-500">Opening Balance:</span>{' '}
            <span className="font-bold">{fmt(selectedParty.openingBalance || 0)}</span>
          </div>
          <div>
            <span className="text-gray-500">Current Balance:</span>{' '}
            <span
              className={`font-bold text-sm ${
                selectedParty.balance > 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {fmt(selectedParty.balance || 0)}
            </span>
          </div>
        </div>
      )}

      <Table
        headers={['Date', 'Ref #', 'Transaction Type', 'Description / Details', 'Debit (Dr)', 'Credit (Cr)', 'Running Balance']}
        emptyText="No ledger transactions recorded for this party."
      >
        <TR highlight>
          <TD>-</TD>
          <TD mono>-</TD>
          <TD><Badge variant="gray">Opening</Badge></TD>
          <TD className="text-gray-500 italic">Initial opening balance record</TD>
          <TD mono right>-</TD>
          <TD mono right>-</TD>
          <TD mono right className="font-bold">{fmt(selectedParty?.openingBalance || 0)}</TD>
        </TR>
        {ledgerRows.map((r, idx) => (
          <TR key={idx}>
            <TD>{formatDate(r.date)}</TD>
            <TD mono className="font-bold text-[#1E3A5F]">{r.refNo}</TD>
            <TD>
              <Badge variant={r.debit > 0 ? 'blue' : 'green'}>{r.type}</Badge>
            </TD>
            <TD className="text-xs text-gray-700">{r.note}</TD>
            <TD mono right className="text-emerald-600 font-bold">{r.debit ? fmt(r.debit) : '-'}</TD>
            <TD mono right className="text-red-500 font-bold">{r.credit ? fmt(r.credit) : '-'}</TD>
            <TD mono right className="font-bold text-[#1E3A5F]">{fmt(r.balance)}</TD>
          </TR>
        ))}
      </Table>
    </div>
  );
}
