import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import ClassicLedgerView from '../../components/common/ClassicLedgerView.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import StockTransferForm from '../../components/forms/StockTransferForm.jsx';
import { useWarehouses } from '../../hooks/useWarehouses.js';
import { useItems } from '../../hooks/useItems.js';
import { useQualities } from '../../hooks/useQualities.js';
import { useStock } from '../../hooks/useStock.js';
import { usePurchases } from '../../hooks/usePurchases.js';
import { useSales } from '../../hooks/useSales.js';
import { useIssues } from '../../hooks/useIssues.js';
import { useProductions } from '../../hooks/useProductions.js';
import { useStockAdjustments } from '../../hooks/useStockAdjustments.js';
import { useStockTransfers } from '../../hooks/useStockTransfers.js';
import { useApp } from '../../context/AppContext.jsx';
import { Warehouse as WarehouseIcon } from 'lucide-react';

export default function WarehouseLedger() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const paramWarehouseId = searchParams.get('warehouse');

  const { warehouses } = useWarehouses();
  const { items } = useItems();
  const { qualities } = useQualities();
  const { stockEntries } = useStock();
  const { purchases } = usePurchases();
  const { sales } = useSales();
  const { issues } = useIssues();
  const { productions } = useProductions();
  const { stockAdjustments } = useStockAdjustments();
  const {
    stockTransfers,
    updateStockTransfer,
    deleteStockTransfer,
  } = useStockTransfers();
  const { showToast } = useApp();

  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    paramWarehouseId || warehouses[0]?.id || ''
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [deletingTransferId, setDeletingTransferId] = useState(null);

  useEffect(() => {
    if (paramWarehouseId) {
      setSelectedWarehouseId(paramWarehouseId);
    } else if (!selectedWarehouseId && warehouses.length > 0) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [warehouses, paramWarehouseId, selectedWarehouseId]);

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);

  // Compile all movements for this warehouse
  const movements = [];

  // 1. Inward Purchases into this warehouse
  purchases.forEach((p) => {
    const isThisWarehouse =
      (selectedWarehouse && p.warehouseName === selectedWarehouse.name) ||
      p.warehouseId === selectedWarehouseId;

    if (isThisWarehouse) {
      (p.items || []).forEach((it) => {
        if (it.type !== 'service') {
          movements.push({
            date: p.date,
            type: 'Purchase',
            refNo: p.no,
            party: p.supplierName,
            itemName: it.itemName,
            quality: it.quality,
            quantity: it.nugs || it.bags || 0,
            weight: Number(it.weight || it.qty || 0),
            inQty: Number(it.qty || 0),
            outQty: 0,
            rate: Number(it.rate || 0),
            detail: `${it.itemName || 'مال'} ${it.quality ? `[${it.quality}]` : ''} - خریداری از ${p.supplierName || 'سپلائر'}`,
          });
        }
      });
    }
  });

  // 2. Outward Sales: REMOVED (Sales do not affect stock, Option B)

  // 3. Outward Issues from this warehouse to production floor
  issues.forEach((iss) => {
    const isThisWarehouse =
      (selectedWarehouse && iss.fromWarehouse === selectedWarehouse.name) ||
      iss.warehouseId === selectedWarehouseId;

    if (isThisWarehouse) {
      (iss.items || []).forEach((it) => {
        movements.push({
          date: iss.date,
          type: 'Issue',
          refNo: iss.no,
          party: 'پروڈکشن فلور',
          itemName: it.itemName,
          quality: it.quality,
          quantity: it.nugs || 0,
          weight: Number(it.weight || it.issueQty || it.qty || 0),
          inQty: 0,
          outQty: Number(it.issueQty || it.qty || 0),
          rate: Number(it.rate || 0),
          detail: `${it.itemName || 'مال'} ${it.quality ? `[${it.quality}]` : ''} - ایشو برائے پروڈکشن`,
        });
      });
    }
  });

  // 4. Inward Production finished goods (if finished goods store)
  if (
    selectedWarehouse &&
    (selectedWarehouse.name.toLowerCase().includes('finished') ||
      selectedWarehouse.type === 'Finished Goods' ||
      selectedWarehouse.type === 'Production')
  ) {
    productions.forEach((prd) => {
      movements.push({
        date: prd.date,
        type: 'Production',
        refNo: prd.no,
        party: 'پلانٹ پیداوار',
        itemName: prd.product,
        quality: '',
        quantity: 0,
        weight: Number(prd.outputQty || 0),
        inQty: Number(prd.outputQty || 0),
        outQty: 0,
        rate: 0,
        detail: `${prd.product || 'تیار مال'} - پلانٹ آؤٹ پٹ پروڈکشن`,
      });
    });
  }

  // 5. Manual Stock Adjustments for this warehouse
  stockAdjustments.forEach((adj) => {
    const isThisWarehouse =
      (selectedWarehouse && adj.warehouseName === selectedWarehouse.name) ||
      adj.warehouseId === selectedWarehouseId;

    if (isThisWarehouse) {
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
        quality: adj.quality,
        quantity: 0,
        weight: qty,
        inQty: isReduce ? 0 : qty,
        outQty: isReduce ? qty : 0,
        rate: rate,
        detail: isReduce
          ? `${adj.itemName || 'مال'} [${adj.quality || ''}] - اسٹاک کمی (${adj.reason || 'Reduction'})`
          : `${adj.itemName || 'مال'} [${adj.quality || ''}] - اسٹاک اندراج (${adj.reason || 'Opening'})`,
      });
    }
  });

  // 6. Stock Transfers (Out on source warehouse, In on destination warehouse)
  stockTransfers.forEach((trf) => {
    const isFromWarehouse =
      (selectedWarehouse && trf.fromWarehouseName === selectedWarehouse.name) ||
      trf.fromWarehouseId === selectedWarehouseId;
    const isToWarehouse =
      (selectedWarehouse && trf.toWarehouseName === selectedWarehouse.name) ||
      trf.toWarehouseId === selectedWarehouseId;
    const qty = Number(trf.qty || 0);

    if (isFromWarehouse) {
      movements.push({
        date: trf.date,
        type: 'Transfer (Out)',
        refNo: trf.no,
        transferId: trf.id,
        transferData: trf,
        party: `منتقلی برائے ${trf.toWarehouseName || trf.toWarehouseId}`,
        itemName: trf.itemName,
        quality: trf.quality,
        quantity: 0,
        weight: qty,
        inQty: 0,
        outQty: qty,
        rate: 0,
        detail: `اسٹاک منتقلی (Out) — منتقلی برائے ${trf.toWarehouseName || ''}${trf.quality ? ` [${trf.quality}]` : ''}${trf.remarks ? ` (${trf.remarks})` : ''}`,
      });
    }

    if (isToWarehouse) {
      movements.push({
        date: trf.date,
        type: 'Transfer (In)',
        refNo: trf.no,
        transferId: trf.id,
        transferData: trf,
        party: `منتقلی از ${trf.fromWarehouseName || trf.fromWarehouseId}`,
        itemName: trf.itemName,
        quality: trf.quality,
        quantity: 0,
        weight: qty,
        inQty: qty,
        outQty: 0,
        rate: 0,
        detail: `اسٹاک منتقلی (In) — موصول از ${trf.fromWarehouseName || ''}${trf.quality ? ` [${trf.quality}]` : ''}${trf.remarks ? ` (${trf.remarks})` : ''}`,
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
      transferData: m.transferData,
      transferId: m.transferId,
    };
  });

  const handleRowClick = (row) => {
    if (!row) return;
    if (row.transferData) {
      setEditingTransfer(row.transferData);
      return;
    }
    const t = (row.rawType || '').toLowerCase();
    const bill = (row.billNo || '').toLowerCase();
    if (bill.startsWith('pur') || t.includes('purchase')) {
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
        title="Warehouse Stock A/C Ledger"
        subtitle="Traditional bordered PERBALACC-style movement statement recording all purchases in, issues out, and sales out for this storage location"
        actions={
          <Button variant="secondary" icon={WarehouseIcon} onClick={() => navigate('/warehouses')}>
            Manage Warehouses
          </Button>
        }
      />

      <ClassicLedgerView
        accountType="Warehouse"
        acCode={selectedWarehouse?.id || 'WH-01'}
        accountName={selectedWarehouse?.name || ''}
        urduName={selectedWarehouse?.urduName || selectedWarehouse?.nameUrdu || selectedWarehouse?.name}
        englishName={selectedWarehouse?.name}
        phone={selectedWarehouse?.phone || ''}
        badgeText="گودام"
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
              label="Select Warehouse / Godown"
              value={selectedWarehouseId}
              onChange={(val) => {
                setSelectedWarehouseId(val);
                navigate(`/warehouse-ledger?warehouse=${val}`, { replace: true });
              }}
              options={warehouses.map((w) => ({
                value: w.id,
                label: `${w.name} (${w.type || 'General'})`,
              }))}
            />
          </div>
        }
      />

      {/* Edit Stock Transfer Modal */}
      <Modal
        isOpen={!!editingTransfer}
        onClose={() => setEditingTransfer(null)}
        title={editingTransfer ? `Edit Stock Transfer — ${editingTransfer.no}` : 'Edit Stock Transfer'}
      >
        <div className="space-y-4">
          <StockTransferForm
            warehouses={warehouses}
            items={items}
            qualities={qualities}
            stockEntries={stockEntries}
            initialData={editingTransfer}
            onSubmit={async (data) => {
              await updateStockTransfer(editingTransfer.id, data);
              showToast(`Stock transfer ${editingTransfer.no} updated successfully!`);
              setEditingTransfer(null);
            }}
            onCancel={() => setEditingTransfer(null)}
          />
          <div className="pt-2 border-t border-gray-200 flex justify-start">
            <button
              type="button"
              onClick={() => setDeletingTransferId(editingTransfer.id)}
              className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
            >
              Delete this transfer record
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Stock Transfer Dialog */}
      <ConfirmDialog
        isOpen={!!deletingTransferId}
        title="Delete Stock Transfer"
        message="Are you sure you want to delete this stock transfer record? This will reverse the transfer and return stock to the source godown."
        onConfirm={async () => {
          await deleteStockTransfer(deletingTransferId);
          showToast('Stock transfer deleted and stock reversed!');
          setDeletingTransferId(null);
          setEditingTransfer(null);
        }}
        onCancel={() => setDeletingTransferId(null)}
      />
    </div>
  );
}
