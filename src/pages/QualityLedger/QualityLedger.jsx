import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import ClassicLedgerView from '../../components/common/ClassicLedgerView.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import { useQualities } from '../../hooks/useQualities.js';
import { usePurchases } from '../../hooks/usePurchases.js';
import { useSales } from '../../hooks/useSales.js';
import { useIssues } from '../../hooks/useIssues.js';
import { useStockAdjustments } from '../../hooks/useStockAdjustments.js';
import { Award } from 'lucide-react';

export default function QualityLedger() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const paramQualityId = searchParams.get('quality');

  const { qualities } = useQualities();
  const { purchases } = usePurchases();
  const { sales } = useSales();
  const { issues } = useIssues();
  const { stockAdjustments } = useStockAdjustments();

  const [selectedQualityId, setSelectedQualityId] = useState(
    paramQualityId || qualities[0]?.id || ''
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (paramQualityId) {
      setSelectedQualityId(paramQualityId);
    } else if (!selectedQualityId && qualities.length > 0) {
      setSelectedQualityId(qualities[0].id);
    }
  }, [qualities, paramQualityId, selectedQualityId]);

  const selectedQuality = qualities.find((q) => q.id === selectedQualityId);
  const qualityName = selectedQuality?.name || '';

  // Compile all movements of this specific quality grade across items & warehouses
  const movements = [];

  purchases.forEach((p) => {
    (p.items || []).forEach((it) => {
      if (it.quality === qualityName && it.type !== 'service') {
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

  sales.forEach((s) => {
    (s.items || []).forEach((it) => {
      if (it.quality === qualityName && it.type !== 'service') {
        movements.push({
          date: s.date,
          type: 'Sale',
          refNo: s.no,
          party: s.customerName,
          itemName: it.itemName,
          warehouse: s.warehouseName,
          quantity: it.nugs || it.bags || 0,
          weight: Number(it.weight || it.qty || 0),
          inQty: 0,
          outQty: Number(it.qty || 0),
          rate: Number(it.rate || 0),
          detail: `${it.itemName || 'مال'} - فروخت برائے ${s.customerName || 'خریدار'} (${s.warehouseName || ''})`,
        });
      }
    });
  });

  issues.forEach((iss) => {
    (iss.items || []).forEach((it) => {
      if (it.quality === qualityName) {
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

  // Manual Stock Adjustments for this quality grade
  stockAdjustments.forEach((adj) => {
    if (adj.quality === qualityName) {
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
      balance: Math.max(0, runningQty),   // بقایا (Balance)
      marker: m.inQty > 0 ? 'جمع' : 'بنام',
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
        title="Quality Grade A/C Ledger"
        subtitle="Traditional bordered PERBALACC-style movement statement recording all purchases, issues, and sales of this quality grade across all warehouses"
        actions={
          <Button variant="secondary" icon={Award} onClick={() => navigate('/qualities')}>
            Manage Qualities
          </Button>
        }
      />

      <ClassicLedgerView
        accountType="Quality"
        acCode={selectedQuality?.id || 'Q-01'}
        accountName={qualityName}
        urduName={selectedQuality?.urduName || selectedQuality?.nameUrdu || qualityName}
        englishName={qualityName}
        badgeText="کوالٹی"
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
              label="Select Quality Classification"
              value={selectedQualityId}
              onChange={(val) => {
                setSelectedQualityId(val);
                navigate(`/quality-ledger?quality=${val}`, { replace: true });
              }}
              options={qualities.map((q) => ({
                value: q.id,
                label: q.name,
              }))}
            />
          </div>
        }
      />
    </div>
  );
}
