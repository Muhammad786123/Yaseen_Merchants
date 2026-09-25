import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useStock } from '../../hooks/useStock.js';
import { useItems } from '../../hooks/useItems.js';
import { usePurchases } from '../../hooks/usePurchases.js';
import { useSales } from '../../hooks/useSales.js';
import { useIssues } from '../../hooks/useIssues.js';
import { fmt, formatDate } from '../../utils/formatters.js';

export default function StockLedger() {
  const { items } = useItems();
  const { purchases } = usePurchases();
  const { sales } = useSales();
  const { issues } = useIssues();

  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || 'i1');

  const selectedItem = items.find((i) => i.id === selectedItemId);

  // Combine purchase inward, sale outward, and issue movement entries for the selected item
  const movements = [];

  purchases.forEach((p) => {
    p.items?.forEach((it) => {
      if (it.itemId === selectedItemId) {
        movements.push({
          date: p.date,
          type: 'IN (Purchase)',
          refNo: p.no,
          party: p.supplierName,
          inQty: it.qty,
          outQty: 0,
          rate: it.rate,
        });
      }
    });
  });

  sales.forEach((s) => {
    s.items?.forEach((it) => {
      if (it.itemId === selectedItemId) {
        movements.push({
          date: s.date,
          type: 'OUT (Sale)',
          refNo: s.no,
          party: s.customerName,
          inQty: 0,
          outQty: it.qty,
          rate: it.rate,
        });
      }
    });
  });

  issues.forEach((iss) => {
    iss.items?.forEach((it) => {
      if (it.itemId === selectedItemId) {
        movements.push({
          date: iss.date,
          type: 'OUT (Issue)',
          refNo: iss.no,
          party: iss.toArea,
          inQty: 0,
          outQty: it.issueQty,
          rate: it.rate,
        });
      }
    });
  });

  movements.sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningQty = 0;
  const ledgerRows = movements.map((m) => {
    runningQty += m.inQty - m.outQty;
    return { ...m, balanceQty: runningQty };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Item Movement Ledger"
        subtitle="Detailed inventory movement audit trail for individual raw materials and finished goods"
      />

      <div className="bg-white p-4 rounded-xl border border-[#E0DBD3] max-w-md">
        <Select
          label="Select Inventory Item"
          value={selectedItemId}
          onChange={setSelectedItemId}
          options={items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name} [${i.quality}]` }))}
        />
      </div>

      {selectedItem && (
        <div className="p-4 bg-white rounded-xl border border-[#E0DBD3] flex flex-wrap gap-6 text-xs font-medium">
          <div>
            <span className="text-gray-500">Item Code:</span>{' '}
            <span className="font-bold text-[#1E3A5F]">{selectedItem.code}</span>
          </div>
          <div>
            <span className="text-gray-500">Category:</span>{' '}
            <Badge variant={selectedItem.category === 'Raw Material' ? 'orange' : 'green'}>
              {selectedItem.category}
            </Badge>
          </div>
          <div>
            <span className="text-gray-500">Default Rate:</span>{' '}
            <span className="font-bold text-gray-900">{fmt(selectedItem.defaultRate)}</span>
          </div>
        </div>
      )}

      <Table
        headers={['Date', 'Ref / Document #', 'Transaction Type', 'Party / Destination', 'In (KG)', 'Out (KG)', 'Balance (KG)']}
        emptyText="No movement history recorded for this item."
      >
        {ledgerRows.map((row, idx) => (
          <TR key={idx}>
            <TD>{formatDate(row.date)}</TD>
            <TD mono className="font-bold text-[#1E3A5F]">{row.refNo}</TD>
            <TD>
              <Badge variant={row.inQty > 0 ? 'green' : 'amber'}>
                {row.type}
              </Badge>
            </TD>
            <TD>{row.party}</TD>
            <TD mono right className="text-emerald-600 font-bold">{row.inQty || '-'}</TD>
            <TD mono right className="text-red-500 font-bold">{row.outQty || '-'}</TD>
            <TD mono right className="font-bold text-[#1E3A5F]">{row.balanceQty}</TD>
          </TR>
        ))}
      </Table>
    </div>
  );
}
