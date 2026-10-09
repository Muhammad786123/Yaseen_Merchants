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
import { useProductions } from '../../hooks/useProductions.js';
import { useStockAdjustments } from '../../hooks/useStockAdjustments.js';
import { Layers } from 'lucide-react';

export default function StockLedger() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const paramItemId = searchParams.get('item');

  const { items } = useItems();
  const { purchases } = usePurchases();
  const { sales } = useSales();
  const { issues } = useIssues();
  const { productions } = useProductions();
  const { stockAdjustments } = useStockAdjustments();

  const [selectedItemId, setSelectedItemId] = useState(paramItemId || items[0]?.id || '');
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

  // Compile all stock movements (Purchase in, Issue out, Sale out, Production in)
  const movements = [];

  purchases.forEach((p) => {
    p.items?.forEach((it) => {
      if (
        (it.itemId === selectedItemId || (selectedItem && it.itemName === selectedItem.name)) &&
        it.type !== 'service'
      ) {
        movements.push({
          date: p.date,
          type: 'Purchase',
          refNo: p.no,
          party: p.supplierName,
          quantity: it.nugs || it.bags || 0,
          weight: Number(it.weight || it.qty || 0),
          inQty: Number(it.qty || 0),
          outQty: 0,
          rate: Number(it.rate || 0),
          warehouse: p.warehouseName,
          detail: `خریداری از ${p.supplierName || 'سپلائر'}${it.quality ? ` [${it.quality}]` : ''} - گودام: ${p.warehouseName || ''}`,
        });
      }
    });
  });

  sales.forEach((s) => {
    s.items?.forEach((it) => {
      if (
        (it.itemId === selectedItemId || (selectedItem && it.itemName === selectedItem.name)) &&
        it.type !== 'service'
      ) {
        movements.push({
          date: s.date,
          type: 'Sale',
          refNo: s.no,
          party: s.customerName,
          quantity: it.nugs || it.bags || 0,
          weight: Number(it.weight || it.qty || 0),
          inQty: 0,
          outQty: Number(it.qty || 0),
          rate: Number(it.rate || 0),
          warehouse: s.warehouseName,
          detail: `فروخت برائے ${s.customerName || 'خریدار'}${it.quality ? ` [${it.quality}]` : ''} - گودام: ${s.warehouseName || ''}`,
        });
      }
    });
  });

  issues.forEach((iss) => {
    iss.items?.forEach((it) => {
      if (it.itemId === selectedItemId || (selectedItem && it.itemName === selectedItem.name)) {
        movements.push({
          date: iss.date,
          type: 'Issue',
          refNo: iss.no,
          party: 'پروڈکشن فلور',
          quantity: it.nugs || 0,
          weight: Number(it.weight || it.issueQty || it.qty || 0),
          inQty: 0,
          outQty: Number(it.issueQty || it.qty || 0),
          rate: Number(it.rate || 0),
          warehouse: iss.fromWarehouse,
          detail: `ایشو برائے پروڈکشن${it.quality ? ` [${it.quality}]` : ''} - گودام: ${iss.fromWarehouse || ''}`,
        });
      }
    });
  });

  productions.forEach((prd) => {
    if (selectedItem && prd.product === selectedItem.name) {
      movements.push({
        date: prd.date,
        type: 'Production',
        refNo: prd.no,
        party: 'پلانٹ پیداوار',
        quantity: 0,
        weight: Number(prd.outputQty || 0),
        inQty: Number(prd.outputQty || 0),
        outQty: 0,
        rate: 0,
        warehouse: 'Finished Goods Store',
        detail: `پلانٹ آؤٹ پٹ پروڈکشن - Finished Goods Store`,
      });
    }
  });

  stockAdjustments.forEach((adj) => {
    if (
      adj.itemId === selectedItemId ||
      (selectedItem && adj.itemName && adj.itemName.toLowerCase() === selectedItem.name.toLowerCase())
    ) {
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
        quantity: 0,
        weight: qty,
        inQty: isReduce ? 0 : qty,
        outQty: isReduce ? qty : 0,
        rate: rate,
        warehouse: adj.warehouseName,
        detail: isReduce
          ? `اسٹاک کمی — ${adj.reason || 'Stock Reduction'}${adj.quality ? ` [${adj.quality}]` : ''} (${adj.warehouseName || ''})`
          : `اسٹاک اندراج / ابتدائی بیلنس — ${adj.reason || 'Opening Balance'}${adj.quality ? ` [${adj.quality}]` : ''} (${adj.warehouseName || ''})`,
      });
    }
  });

  movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const openingStock = Number(selectedItem?.openingStock || 0);
  let runningQty = openingStock;
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
      balance: Math.max(0, runningQty),   // بقایا (Balance)
      marker: m.inQty > 0 ? 'جمع' : 'بنام',
      rawType: m.type,
    };
  });

  const handleRowClick = (row) => {
    if (!row) return;
    const t = (row.rawType || '').toLowerCase();
    const bill = (row.billNo || '').toLowerCase();
    if (bill.startsWith('adj') || t.includes('adj') || t.includes('opening')) {
      navigate('/stock');
    } else if (bill.startsWith('pur') || t.includes('purchase')) {
      navigate('/purchase');
    } else if (bill.startsWith('sal') || bill.startsWith('sv') || t.includes('sale')) {
      navigate('/sale');
    } else if (bill.startsWith('iss') || t.includes('issue')) {
      navigate('/issue');
    } else if (bill.startsWith('prd') || t.includes('production')) {
      navigate('/production');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Item / Raw Material A/C Ledger"
        subtitle="Traditional bordered PERBALACC-style inventory ledger recording all purchases, issues, production, and sales"
        actions={
          <Button variant="secondary" icon={Layers} onClick={() => navigate('/stock')}>
            View Stock Status
          </Button>
        }
      />

      <ClassicLedgerView
        accountType="Item"
        acCode={selectedItem?.code || selectedItem?.id || 'ITM-01'}
        accountName={selectedItem?.name || ''}
        urduName={selectedItem?.urduName || selectedItem?.nameUrdu || selectedItem?.name}
        englishName={selectedItem?.name}
        badgeText={selectedItem?.category === 'Finished Good' ? 'تیار مال' : 'خام مال'}
        rows={ledgerRows}
        openingBalance={openingStock}
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
                navigate(`/stock-ledger?item=${val}`, { replace: true });
              }}
              options={items.map((i) => ({
                value: i.id,
                label: `${i.code ? `${i.code} - ` : ''}${i.name}${i.quality ? ` [${i.quality}]` : ''}`,
              }))}
            />
          </div>
        }
      />
    </div>
  );
}
