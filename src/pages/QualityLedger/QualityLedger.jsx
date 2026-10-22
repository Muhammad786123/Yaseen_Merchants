import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import ClassicLedgerView from '../../components/common/ClassicLedgerView.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import { useItems } from '../../hooks/useItems.js';
import { usePurchases } from '../../hooks/usePurchases.js';
import { useSales } from '../../hooks/useSales.js';
import { useIssues } from '../../hooks/useIssues.js';
import { useStockAdjustments } from '../../hooks/useStockAdjustments.js';
import { useStockTransfers } from '../../hooks/useStockTransfers.js';
import { Layers } from 'lucide-react';

export default function QualityLedger() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const paramItemId = searchParams.get('item') || searchParams.get('quality');

  const { items } = useItems();
  const { purchases } = usePurchases();
  const { sales } = useSales();
  const { issues } = useIssues();
  const { stockAdjustments } = useStockAdjustments();
  const { stockTransfers } = useStockTransfers();

  const [selectedItemId, setSelectedItemId] = useState(
    paramItemId || items[0]?.id || ''
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (paramItemId) {
      setSelectedItemId(paramItemId);
    } else if (!selectedItemId && items.length > 0) {
      setSelectedItemId(items[0].id);
    }
  }, [items, paramItemId, selectedItemId]);

  const selectedItem = items.find((i) => i.id === selectedItemId);
  const itemName = selectedItem?.name || '';

  // Compile all movements of this specific item across all warehouses
  const movements = [];

  purchases.forEach((p) => {
    (p.items || []).forEach((it) => {
      if ((it.itemId === selectedItemId || it.itemName === itemName) && it.type !== 'service') {
        movements.push({
          date: p.date,
          type: 'Purchase',
          refNo: p.no,
          party: p.supplierName,
          itemName: it.itemName,
          warehouse: p.warehouseName,
          quantity: it.nugs || it.bags || 0,
          weight: Number(it.weight || it.qty || 0),
          inQty: Number(it.qty || 0),
          outQty: 0,
          rate: Number(it.rate || 0),
          detail: `${it.itemName || 'مال'} - خریداری از ${p.supplierName || 'سپلائر'} (${p.warehouseName || ''})`,
        });
      }
    });
  });

  // Sales do NOT appear in Quality Ledger (Option B - Sales do not affect stock)

  issues.forEach((iss) => {
    (iss.items || []).forEach((it) => {
      if (it.itemId === selectedItemId || it.itemName === itemName) {
        movements.push({
          date: iss.date,
          type: 'Issue',
          refNo: iss.no,
          party: 'پروڈکشن فلور',
          itemName: it.itemName,
          warehouse: iss.fromWarehouse,
          quantity: it.nugs || 0,
          weight: Number(it.weight || it.issueQty || it.qty || 0),
          inQty: 0,
          outQty: Number(it.issueQty || it.qty || 0),
          rate: Number(it.rate || 0),
          detail: `${it.itemName || 'مال'} - ایشو برائے پروڈکشن (${iss.fromWarehouse || ''})`,
        });
      }
    });
  });

  // Manual Stock Adjustments for this item
  stockAdjustments.forEach((adj) => {
    if (adj.itemId === selectedItemId || adj.itemName === itemName) {
      const isReduce = adj.type === 'REDUCE' || Number(adj.qty) < 0;
      const qty = Math.abs(Number(adj.qty || 0));
      const rate = Number(adj.rate || 0);

      movements.push({
        date: adj.date,
        type: isReduce
          ? 'ADJ (Stock Reduce)'
          : adj.adjustmentType === 'Opening Balance'
          ? 'OPENING'
          : 'ADJ (Stock Add)',
        refNo: adj.no,
        party: adj.reason || 'Stock Adjustment',
        itemName: adj.itemName,
        warehouse: adj.warehouseName,
        quantity: 0,
        weight: qty,
        inQty: isReduce ? 0 : qty,
        outQty: isReduce ? qty : 0,
        rate: rate,
        detail: isReduce
          ? `${adj.itemName || 'مال'} - اسٹاک کمی (${adj.reason || 'Reduction'}) - گودام: ${adj.warehouseName || ''}`
          : `${adj.itemName || 'مال'} - اسٹاک اندراج (${adj.reason || 'Opening'}) - گودام: ${adj.warehouseName || ''}`,
      });
    }
  });

  // Stock Transfers for this item
  stockTransfers.forEach((trf) => {
    if (trf.itemId === selectedItemId || trf.itemName === itemName) {
      const qty = Number(trf.qty || 0);
      movements.push({
        date: trf.date,
        type: 'Transfer',
        refNo: trf.no,
        party: `${trf.fromWarehouseName || 'گودام'} ➔ ${trf.toWarehouseName || 'گودام'}`,
        itemName: trf.itemName,
        warehouse: `${trf.fromWarehouseName} ➔ ${trf.toWarehouseName}`,
        quantity: 0,
        weight: qty,
        inQty: 0,
        outQty: 0,
        rate: 0,
        detail: `منتقلی: ${trf.fromWarehouseName || ''} سے ${trf.toWarehouseName || ''} (${qty} KG)`,
      });
    }
  });

  movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningQty = 0;
  const ledgerRows = movements.map((m, idx) => {
    runningQty += m.inQty - m.outQty;
    return {
      id: `${m.refNo}-${idx}`,
      date: m.date,
      billNo: m.refNo,
      detail: m.detail,
      quantity: m.quantity > 0 ? m.quantity : '',
      weight: m.weight > 0 ? m.weight : (m.inQty || m.outQty || ''),
      rate: m.rate > 0 ? m.rate : '',
      debit: m.outQty > 0 ? m.outQty : 0,  // بنام (Outward)
      credit: m.inQty > 0 ? m.inQty : 0,  // جمع (Inward)
      balance: runningQty,   // بقایا (Balance)
      rawType: m.type,
    };
  });

  const handleRowClick = (row) => {
    if (!row) return;
    const t = (row.rawType || '').toLowerCase();
    const bill = (row.billNo || '').toLowerCase();
    if (bill.startsWith('pur') || t.includes('purchase')) {
      navigate('/purchase');
    } else if (bill.startsWith('sal') || bill.startsWith('sv') || t.includes('sale')) {
      navigate('/sale');
    } else if (bill.startsWith('iss') || t.includes('issue')) {
      navigate('/issue');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Item Ledger (آئٹم کھاتہ)"
        subtitle="Traditional bordered PERBALACC-style movement statement recording all purchases, issues, transfers, and sales of this item across all warehouses"
        actions={
          <Button variant="secondary" icon={Layers} onClick={() => navigate('/items')}>
            Manage Items
          </Button>
        }
      />

      <ClassicLedgerView
        accountType="Item"
        acCode={selectedItem?.code || selectedItem?.id || 'ITM-01'}
        accountName={itemName}
        urduName={selectedItem?.urduName || selectedItem?.nameUrdu || itemName}
        englishName={itemName}
        badgeText="آئٹم"
        rows={ledgerRows}
        openingBalance={0}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        onRowClick={handleRowClick}
        mode="quantity"
        unitLabel="KG"
        entitySelector={
          <div className="w-full sm:w-80">
            <Select
              label="Select Catalog Item"
              value={selectedItemId}
              onChange={(val) => {
                setSelectedItemId(val);
                navigate(`/item-ledger?item=${val}`, { replace: true });
              }}
              options={items.map((i) => ({
                value: i.id,
                label: `${i.code ? `${i.code} - ` : ''}${i.name}`,
              }))}
            />
          </div>
        }
      />
    </div>
  );
}
