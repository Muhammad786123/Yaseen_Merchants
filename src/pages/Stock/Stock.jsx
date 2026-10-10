import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import { useStock } from '../../hooks/useStock.js';
import { usePurchases } from '../../hooks/usePurchases.js';
import { useSales } from '../../hooks/useSales.js';
import { useIssues } from '../../hooks/useIssues.js';
import { useProductions } from '../../hooks/useProductions.js';
import { useItems } from '../../hooks/useItems.js';
import { useQualities } from '../../hooks/useQualities.js';
import { useWarehouses } from '../../hooks/useWarehouses.js';
import { useStockAdjustments } from '../../hooks/useStockAdjustments.js';
import Modal from '../../components/ui/Modal.jsx';
import StockAdjustmentForm from '../../components/forms/StockAdjustmentForm.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { verifyStockConsistency } from '../../utils/stockUtils.js';
import { fmt, formatDate } from '../../utils/formatters.js';
import { Package, DollarSign, CheckCircle2, RefreshCw, BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';

export default function Stock() {
  const navigate = useNavigate();
  const { stockEntries, syncStockEntries } = useStock();
  const { purchases } = usePurchases();
  const { sales } = useSales();
  const { issues } = useIssues();
  const { productions } = useProductions();
  const { items } = useItems();
  const { qualities } = useQualities();
  const { warehouses } = useWarehouses();
  const { stockAdjustments, addStockAdjustment, updateStockAdjustment, deleteStockAdjustment } = useStockAdjustments();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');
  const [filterCat, setFilterCat] = useState('All');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState(null);
  const [deletingAdjId, setDeletingAdjId] = useState(null);

  const totalQty = stockEntries.reduce((sum, s) => sum + Number(s.qty || 0), 0);
  const totalVal = stockEntries.reduce((sum, s) => sum + Number(s.value || 0), 0);

  // Run automated consistency check against ledger transactions
  const consistency = verifyStockConsistency(
    purchases,
    sales,
    issues,
    productions,
    stockEntries,
    items,
    stockAdjustments
  );

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncStockEntries();
    setIsSyncing(false);
    showToast('Stock inventory recalculated & synchronized with ledger history!');
  };

  const filtered = stockEntries.filter((s) => {
    const qLower = search.toLowerCase();
    const matchSearch =
      (s.itemName || '').toLowerCase().includes(qLower) ||
      (s.quality || '').toLowerCase().includes(qLower) ||
      (s.warehouseName || '').toLowerCase().includes(qLower);

    const matchCat = filterCat === 'All' || s.category === filterCat;
    return matchSearch && matchCat;
  });

  const filteredAdjustments = stockAdjustments.filter((a) => {
    const qLower = search.toLowerCase();
    return (
      (a.itemName || '').toLowerCase().includes(qLower) ||
      (a.quality || '').toLowerCase().includes(qLower) ||
      (a.warehouseName || '').toLowerCase().includes(qLower) ||
      (a.reason || '').toLowerCase().includes(qLower)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Inventory Status"
        subtitle="Current warehouse inventory levels, average rates, and total stock valuations derived live from transaction history"
        actions={
          <div className="flex items-center gap-2">
            {consistency.isConsistent ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-[#E8F5E9] text-[#1B5E20] border border-black">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1B5E20]" />
                <span>100% In Sync with Ledger</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-[#FFEB3B] text-black border border-black">
                <span>{consistency.discrepancies.length} discrepancy detected</span>
              </span>
            )}
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={handleManualSync}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Recalculate'}
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setIsAddStockModalOpen(true)}
            >
              + Add Stock
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          label="Total Inventory Volume"
          value={`${totalQty.toLocaleString('en-PK')} KG`}
          sub="Across all warehouses & items"
          icon={Package}
        />
        <StatCard
          label="Total Stock Valuation"
          value={fmt(totalVal)}
          sub="Calculated on live weighted average purchase costs"
          icon={DollarSign}
          color="text-[#1a6b2e]"
        />
      </div>

      {/* View Tabs */}
      <div className="flex border-b-2 border-black gap-2">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 font-bold text-xs border-t-2 border-x-2 border-black transition-all cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-[#1a6b2e] text-white -mb-[2px] pb-[10px]'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          Warehouse Inventory Levels ({stockEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('adjustments')}
          className={`px-4 py-2 font-bold text-xs border-t-2 border-x-2 border-black transition-all cursor-pointer ${
            activeTab === 'adjustments'
              ? 'bg-[#1a6b2e] text-white -mb-[2px] pb-[10px]'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          Manual Stock Additions ({stockAdjustments.length})
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#EBE9ED] p-2.5 border-2 border-black">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by item, quality grade or warehouse..."
          className="w-full sm:w-80"
        />

        {activeTab === 'inventory' && (
          <div className="flex items-center gap-1 border border-black bg-white p-0.5">
            {['All', 'Raw Material', 'Finished Product'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  filterCat === cat
                    ? 'bg-[#1a6b2e] text-white'
                    : 'text-gray-800 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'inventory' ? (
        <Table
          headers={[
            'Item Name',
            'Category',
            'Quality Grade',
            'Warehouse Store',
            'Qty (KG)',
            'Avg Rate',
            'Total Value',
            'Actions',
          ]}
          emptyText="No stock entries found. Record purchases or Add Stock to build inventory."
        >
          {filtered.map((s) => (
            <TR key={s.id}>
              <TD className="font-bold text-black">{s.itemName}</TD>
              <TD>
                <Badge variant={s.category === 'Raw Material' ? 'orange' : 'green'}>
                  {s.category}
                </Badge>
              </TD>
              <TD>
                <span className="bg-[#FFEB3B] border border-black px-2 py-0.5 font-bold text-[22px] text-black">
                  {s.quality}
                </span>
              </TD>
              <TD>{s.warehouseName}</TD>
              <TD mono right className="font-bold text-black">
                {Number(s.qty || 0).toLocaleString('en-PK')} KG
              </TD>
              <TD mono right className="font-mono">{fmt(s.avgRate)}</TD>
              <TD mono right className="font-bold text-black">
                {fmt(s.value)}
              </TD>
              <TD>
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => navigate(`/stock-ledger?item=${s.itemId}`)}
                    className="p-1 border border-black bg-white hover:bg-emerald-50 text-emerald-800 flex items-center gap-1 font-bold text-xs cursor-pointer"
                    title="View detailed stock ledger movement history"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Ledger</span>
                  </button>
                </div>
              </TD>
            </TR>
          ))}
        </Table>
      ) : (
        <Table
          headers={[
            'Date',
            'Item Name',
            'Quality Grade',
            'Warehouse Store',
            'Qty (KG)',
            'Valuation Rate',
            'Total Amount',
            'Classification / Note',
            'Actions',
          ]}
          emptyText="No manual stock additions found."
        >
          {filteredAdjustments.map((a) => (
            <TR key={a.id}>
              <TD>
                {formatDate(a.date)}
                {a.editCount > 0 && (
                  <div className="text-[10px] text-amber-700 font-medium">
                    Edited ({a.updatedAt ? new Date(a.updatedAt).toLocaleDateString() : 'Yes'})
                  </div>
                )}
              </TD>
              <TD className="font-bold text-black">{a.itemName}</TD>
              <TD>
                <span className="bg-[#FFEB3B] border border-black px-2 py-0.5 font-bold text-xs text-black">
                  {a.quality}
                </span>
              </TD>
              <TD>{a.warehouseName}</TD>
              <TD mono right className="font-bold text-emerald-800">
                +{Number(a.qty || 0).toLocaleString('en-PK')} KG
              </TD>
              <TD mono right className="font-mono">{fmt(a.rate)}</TD>
              <TD mono right className="font-bold text-black">
                {fmt(a.amount || (a.qty * a.rate))}
              </TD>
              <TD>
                <div className="font-bold text-xs text-black">{a.adjustmentType || 'Opening Balance'}</div>
                <div className="text-[11px] text-gray-600">{a.reason || a.note}</div>
              </TD>
              <TD>
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => setEditingAdjustment(a)}
                    className="p-1 border border-black bg-white hover:bg-amber-50 text-amber-700 cursor-pointer"
                    title="Edit Stock Entry"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingAdjId(a.id)}
                    className="p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                    title="Delete Stock Entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </TD>
            </TR>
          ))}
        </Table>
      )}

      <Modal
        isOpen={isAddStockModalOpen || !!editingAdjustment}
        onClose={() => {
          setIsAddStockModalOpen(false);
          setEditingAdjustment(null);
        }}
        title={editingAdjustment ? "Edit Manual Stock Addition" : "Manual Stock Entry / Adjustment"}
      >
        <StockAdjustmentForm
          items={items}
          qualities={qualities}
          warehouses={warehouses}
          initialData={editingAdjustment}
          onSubmit={async (data) => {
            if (editingAdjustment) {
              await updateStockAdjustment(editingAdjustment.id, data);
              showToast('Manual stock entry updated successfully!');
            } else {
              await addStockAdjustment(data);
              showToast(
                data.type === 'ADD'
                  ? `Stock of ${data.qty} KG (${data.itemName} - ${data.quality}) added successfully!`
                  : `Stock reduced by ${data.qty} KG (${data.itemName} - ${data.quality}) successfully!`
              );
            }
            setIsAddStockModalOpen(false);
            setEditingAdjustment(null);
          }}
          onCancel={() => {
            setIsAddStockModalOpen(false);
            setEditingAdjustment(null);
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingAdjId}
        title="Delete Stock Record"
        message="Are you sure you want to delete this stock entry? This will reverse all its effects on parties, cash, bank and stock."
        onConfirm={async () => {
          await deleteStockAdjustment(deletingAdjId);
          showToast('Stock entry deleted!');
          setDeletingAdjId(null);
        }}
        onCancel={() => setDeletingAdjId(null)}
      />
    </div>
  );
}
