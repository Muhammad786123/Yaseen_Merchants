import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import PrintHeader from '../../components/common/PrintHeader.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import Modal from '../../components/ui/Modal.jsx';
import StockAdjustmentForm from '../../components/forms/StockAdjustmentForm.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { useStock } from '../../hooks/useStock.js';
import { usePurchases } from '../../hooks/usePurchases.js';
import { useSales } from '../../hooks/useSales.js';
import { useIssues } from '../../hooks/useIssues.js';
import { useProductions } from '../../hooks/useProductions.js';
import { useItems } from '../../hooks/useItems.js';
import { useQualities } from '../../hooks/useQualities.js';
import { useWarehouses } from '../../hooks/useWarehouses.js';
import { useStockAdjustments } from '../../hooks/useStockAdjustments.js';
import { useApp } from '../../context/AppContext.jsx';
import { verifyStockConsistency } from '../../utils/stockUtils.js';
import { fmt, fmtNum, formatDate } from '../../utils/formatters.js';
import { safePrint } from '../../utils/printUtils.js';
import {
  Package,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Printer,
  ChevronDown,
  ChevronRight,
  Warehouse as WarehouseIcon,
} from 'lucide-react';

const BORDER_STYLE = '1px solid #000000';

// Helper to test if a quality value is real (non-empty and not just '-')
function isRealQuality(q) {
  if (!q) return false;
  const trimmed = String(q).trim();
  return trimmed !== '' && trimmed !== '-';
}

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
  const {
    stockAdjustments,
    addStockAdjustment,
    updateStockAdjustment,
    deleteStockAdjustment,
  } = useStockAdjustments();
  const { showToast } = useApp();

  // Tab state: 'item-wise' (default) | 'warehouse-wise' | 'adjustments'
  const [activeTab, setActiveTab] = useState('item-wise');

  // Filters & Toggles
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('ALL');

  // Expandable rows for Item-wise tab
  const [expandedItemIds, setExpandedItemIds] = useState({});

  // Sync / Modals
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState(null);
  const [deletingAdjId, setDeletingAdjId] = useState(null);

  // Top summary totals directly from stockEntries
  const totalQty = useMemo(
    () => stockEntries.reduce((sum, s) => sum + Number(s.qty || 0), 0),
    [stockEntries]
  );
  const totalVal = useMemo(
    () => stockEntries.reduce((sum, s) => sum + Number(s.value || 0), 0),
    [stockEntries]
  );

  // Run automated consistency check against ledger transactions
  const consistency = useMemo(
    () =>
      verifyStockConsistency(
        purchases,
        sales,
        issues,
        productions,
        stockEntries,
        items,
        stockAdjustments
      ),
    [purchases, sales, issues, productions, stockEntries, items, stockAdjustments]
  );

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncStockEntries();
    setIsSyncing(false);
    showToast('Stock inventory recalculated & synchronized with ledger history!');
  };

  const toggleExpand = (itemId) => {
    setExpandedItemIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handlePrint = () => {
    safePrint();
  };

  // ---------------------------------------------------------------------------
  // TAB 1: Item-wise Grouping (useMemo)
  // ---------------------------------------------------------------------------
  const itemWiseData = useMemo(() => {
    const map = {};

    // First seed all known catalog items if showZeroStock is requested
    if (showZeroStock && items && items.length > 0) {
      for (const it of items) {
        map[it.id] = {
          itemId: it.id,
          itemName: it.name,
          category: it.category || 'Raw Material',
          totalQty: 0,
          totalValue: 0,
          breakdowns: [],
        };
      }
    }

    // Accumulate stock entries into item groups
    for (const entry of stockEntries) {
      const key = entry.itemId || entry.itemName;
      if (!map[key]) {
        map[key] = {
          itemId: entry.itemId || key,
          itemName: entry.itemName || 'Unknown Item',
          category: entry.category || 'Raw Material',
          totalQty: 0,
          totalValue: 0,
          breakdowns: [],
        };
      }

      const q = Number(entry.qty || 0);
      const v = Number(entry.value !== undefined ? entry.value : q * Number(entry.avgRate || 0));

      map[key].totalQty += q;
      map[key].totalValue += v;

      map[key].breakdowns.push({
        id: entry.id,
        warehouseId: entry.warehouseId,
        warehouseName: entry.warehouseName || 'Main Godown',
        quality: isRealQuality(entry.quality) ? String(entry.quality).trim() : '-',
        hasRealQuality: isRealQuality(entry.quality),
        qty: q,
        avgRate: Number(entry.avgRate || 0),
        value: v,
      });
    }

    // Finalize items with weighted average rates and breakdown shares
    const itemsList = Object.values(map).map((item) => {
      const weightedAvgRate = item.totalQty > 0 ? item.totalValue / item.totalQty : 0;
      const breakdownsWithShare = item.breakdowns.map((b) => ({
        ...b,
        share: item.totalQty > 0 ? (b.qty / item.totalQty) * 100 : 0,
      }));

      // Does this item have any real quality in its breakdown lines?
      const hasAnyRealQuality = breakdownsWithShare.some((b) => b.hasRealQuality);

      return {
        ...item,
        weightedAvgRate,
        breakdowns: breakdownsWithShare,
        hasAnyRealQuality,
      };
    });

    // Sort alphabetically by item name
    itemsList.sort((a, b) =>
      String(a.itemName || '').localeCompare(String(b.itemName || ''), 'ur')
    );

    return itemsList;
  }, [stockEntries, items, showZeroStock]);

  // Filtered Item-wise items
  const filteredItemWise = useMemo(() => {
    const qLower = search.trim().toLowerCase();
    return itemWiseData.filter((item) => {
      // 1. Search text filter
      const matchSearch =
        !qLower ||
        String(item.itemName || '').toLowerCase().includes(qLower) ||
        item.breakdowns.some((b) =>
          String(b.warehouseName || '').toLowerCase().includes(qLower)
        );

      // 2. Category filter
      const matchCat = filterCat === 'All' || item.category === filterCat;

      // 3. Zero stock filter
      const matchZero = showZeroStock ? true : item.totalQty > 0;

      return matchSearch && matchCat && matchZero;
    });
  }, [itemWiseData, search, filterCat, showZeroStock]);

  // Grand totals for visible item-wise rows
  const itemWiseGrandQty = useMemo(
    () => filteredItemWise.reduce((sum, i) => sum + i.totalQty, 0),
    [filteredItemWise]
  );
  const itemWiseGrandValue = useMemo(
    () => filteredItemWise.reduce((sum, i) => sum + i.totalValue, 0),
    [filteredItemWise]
  );

  // Check if item-wise totals match the top summary cards (when not filtered)
  const isItemWiseMatchingSummary =
    Math.abs(itemWiseGrandQty - totalQty) < 0.01 &&
    Math.abs(itemWiseGrandValue - totalVal) < 1;

  // ---------------------------------------------------------------------------
  // TAB 2: Warehouse-wise Grouping (useMemo)
  // ---------------------------------------------------------------------------
  const warehouseWiseData = useMemo(() => {
    const map = {};

    // Seed known warehouses
    for (const w of warehouses) {
      map[w.id] = {
        warehouseId: w.id,
        warehouseName: w.name,
        type: w.type || 'Godown',
        totalQty: 0,
        totalValue: 0,
        items: [],
      };
    }

    for (const entry of stockEntries) {
      const wId = entry.warehouseId || entry.warehouseName;
      if (!map[wId]) {
        map[wId] = {
          warehouseId: entry.warehouseId || wId,
          warehouseName: entry.warehouseName || 'Warehouse',
          type: 'Godown',
          totalQty: 0,
          totalValue: 0,
          items: [],
        };
      }

      const q = Number(entry.qty || 0);
      const v = Number(entry.value !== undefined ? entry.value : q * Number(entry.avgRate || 0));

      map[wId].totalQty += q;
      map[wId].totalValue += v;
      map[wId].items.push({
        id: entry.id,
        itemId: entry.itemId,
        itemName: entry.itemName,
        category: entry.category,
        quality: isRealQuality(entry.quality) ? String(entry.quality).trim() : '-',
        hasRealQuality: isRealQuality(entry.quality),
        qty: q,
        avgRate: Number(entry.avgRate || 0),
        value: v,
        warehouseId: entry.warehouseId,
        warehouseName: entry.warehouseName,
      });
    }

    const list = Object.values(map).map((wh) => {
      const avgRate = wh.totalQty > 0 ? wh.totalValue / wh.totalQty : 0;
      const hasAnyRealQuality = wh.items.some((it) => it.hasRealQuality);
      return {
        ...wh,
        avgRate,
        hasAnyRealQuality,
      };
    });

    list.sort((a, b) =>
      String(a.warehouseName || '').localeCompare(String(b.warehouseName || ''))
    );
    return list;
  }, [stockEntries, warehouses]);

  // Filtered Warehouse-wise data
  const filteredWarehouses = useMemo(() => {
    const qLower = search.trim().toLowerCase();

    return warehouseWiseData
      .map((wh) => {
        // If a specific warehouse is selected, filter out other warehouses
        if (
          selectedWarehouseId !== 'ALL' &&
          wh.warehouseId !== selectedWarehouseId &&
          wh.warehouseName !== selectedWarehouseId
        ) {
          return null;
        }

        // Filter items within this warehouse
        const matchingItems = wh.items.filter((it) => {
          const matchSearch =
            !qLower ||
            String(it.itemName || '').toLowerCase().includes(qLower) ||
            String(it.warehouseName || '').toLowerCase().includes(qLower);

          const matchCat = filterCat === 'All' || it.category === filterCat;
          const matchZero = showZeroStock ? true : it.qty > 0;
          return matchSearch && matchCat && matchZero;
        });

        // If warehouse has no matching items and not showing zero stock, omit
        if (matchingItems.length === 0 && !showZeroStock && selectedWarehouseId === 'ALL') {
          return null;
        }

        const subtotalQty = matchingItems.reduce((s, it) => s + it.qty, 0);
        const subtotalVal = matchingItems.reduce((s, it) => s + it.value, 0);
        const subtotalAvgRate = subtotalQty > 0 ? subtotalVal / subtotalQty : 0;
        const hasAnyRealQuality = matchingItems.some((it) => it.hasRealQuality);

        return {
          ...wh,
          items: matchingItems,
          totalQty: subtotalQty,
          totalValue: subtotalVal,
          avgRate: subtotalAvgRate,
          hasAnyRealQuality,
        };
      })
      .filter(Boolean);
  }, [warehouseWiseData, selectedWarehouseId, search, filterCat, showZeroStock]);

  // Grand totals across all visible warehouses
  const warehouseGrandQty = useMemo(
    () => filteredWarehouses.reduce((sum, w) => sum + w.totalQty, 0),
    [filteredWarehouses]
  );
  const warehouseGrandValue = useMemo(
    () => filteredWarehouses.reduce((sum, w) => sum + w.totalValue, 0),
    [filteredWarehouses]
  );

  // Selected warehouse name label for title
  const selectedWarehouseTitle = useMemo(() => {
    if (selectedWarehouseId === 'ALL') return 'All Warehouses (تمام گودام)';
    const match = warehouses.find(
      (w) => w.id === selectedWarehouseId || w.name === selectedWarehouseId
    );
    return match ? match.name : selectedWarehouseId;
  }, [selectedWarehouseId, warehouses]);

  // Filtered Adjustments
  const filteredAdjustments = useMemo(() => {
    const qLower = search.trim().toLowerCase();
    return stockAdjustments.filter((a) => {
      return (
        !qLower ||
        String(a.itemName || '').toLowerCase().includes(qLower) ||
        String(a.warehouseName || '').toLowerCase().includes(qLower) ||
        String(a.reason || '').toLowerCase().includes(qLower)
      );
    });
  }, [stockAdjustments, search]);

  return (
    <div className="space-y-4">
      {/* Printable Header Area (Visible only when printed) */}
      <div className="hidden print:block">
        <PrintHeader
          documentTitle={
            activeTab === 'warehouse-wise'
              ? `Stock - ${selectedWarehouseTitle}`
              : 'Stock - Item-wise (آئٹم وار)'
          }
          subtitle="Inventory Valuation & Stock Status Report"
          dateStr={formatDate(new Date())}
        />
      </div>

      {/* Page Header (Hidden on print) */}
      <div className="no-print">
        <PageHeader
          title="Stock Inventory Status"
          subtitle="Warehouse inventory levels, weighted average valuation rates, and live balances"
          actions={
            <div className="flex items-center gap-2">
              {consistency.isConsistent ? (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-[#E8F5E9] text-[#1B5E20] border border-black">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1B5E20]" />
                  <span>100% In Sync with Ledger</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-[#FFEB3B] text-black border border-black">
                  <AlertTriangle className="w-3.5 h-3.5 text-black" />
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
      </div>

      {/* Summary Cards (Always visible on screen and print) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="ltr">
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

      {/* Tabs Row (Hidden on print) */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-black gap-2 no-print pt-2">
        <div className="flex items-center gap-1">
          <button
            id="tab-item-wise"
            type="button"
            onClick={() => setActiveTab('item-wise')}
            className={`px-4 py-2 font-bold text-xs sm:text-sm border-t-2 border-x-2 border-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'item-wise'
                ? 'bg-[#1a6b2e] text-white -mb-[2px] pb-[10px]'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Item-wise (آئٹم وار)</span>
            <span className="font-mono text-xs opacity-90">({itemWiseData.length})</span>
          </button>

          <button
            id="tab-warehouse-wise"
            type="button"
            onClick={() => setActiveTab('warehouse-wise')}
            className={`px-4 py-2 font-bold text-xs sm:text-sm border-t-2 border-x-2 border-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'warehouse-wise'
                ? 'bg-[#1a6b2e] text-white -mb-[2px] pb-[10px]'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            <WarehouseIcon className="w-4 h-4" />
            <span>Warehouse-wise (گودام وار)</span>
            <span className="font-mono text-xs opacity-90">({warehouses.length})</span>
          </button>

          <button
            id="tab-adjustments"
            type="button"
            onClick={() => setActiveTab('adjustments')}
            className={`px-4 py-2 font-bold text-xs sm:text-sm border-t-2 border-x-2 border-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'adjustments'
                ? 'bg-[#1a6b2e] text-white -mb-[2px] pb-[10px]'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            <Pencil className="w-4 h-4" />
            <span>Manual Additions (دستی اندراج)</span>
            <span className="font-mono text-xs opacity-90">({stockAdjustments.length})</span>
          </button>
        </div>

        {/* Print Button for Current Tab */}
        <div className="no-print pb-1">
          <Button variant="primary" icon={Printer} onClick={handlePrint}>
            Print {activeTab === 'warehouse-wise' ? 'Warehouse Report' : 'Item Report'}
          </Button>
        </div>
      </div>

      {/* Filter Bar (Hidden on print) */}
      <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FAF9F7] p-2.5 border-2 border-black">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={
              activeTab === 'warehouse-wise'
                ? 'Search warehouse or item...'
                : 'Search by item name or warehouse...'
            }
            className="w-full sm:w-72"
          />

          {/* Warehouse Dropdown on Warehouse-wise tab */}
          {activeTab === 'warehouse-wise' && (
            <div className="flex items-center gap-2">
              <label htmlFor="warehouse-select" className="text-xs font-bold text-gray-800 whitespace-nowrap">
                Warehouse / Godown:
              </label>
              <select
                id="warehouse-select"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="bg-white border-2 border-black px-3 py-1.5 text-xs font-bold text-black outline-none cursor-pointer focus:border-blue-700"
              >
                <option value="ALL">All Warehouses (تمام گودام)</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.type || 'Godown'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Filter */}
          {activeTab !== 'adjustments' && (
            <div className="flex items-center gap-1 border border-black bg-white p-0.5">
              {['All', 'Raw Material', 'Finished Product'].map((cat) => (
                <button
                  key={cat}
                  type="button"
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

        {/* Zero Stock Checkbox */}
        {activeTab !== 'adjustments' && (
          <label className="flex items-center gap-2 text-xs font-bold text-gray-900 cursor-pointer select-none px-2 py-1 bg-white border border-black">
            <input
              type="checkbox"
              checked={showZeroStock}
              onChange={(e) => setShowZeroStock(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-black focus:ring-emerald-500 cursor-pointer"
            />
            <span>Show zero stock (صفر اسٹاک دکھائیں)</span>
          </label>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* TAB 1: Item-wise (آئٹم وار) View                                      */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'item-wise' && (
        <div className="bg-white border-2 border-black overflow-x-auto print:overflow-visible print:border-none shadow-xs">
          <table
            className="w-full border-collapse text-sm text-black"
            style={{ borderCollapse: 'collapse', border: BORDER_STYLE, direction: 'rtl' }}
            dir="rtl"
          >
            <thead>
              <tr className="bg-[#DFDFDF] border-b-2 border-black text-gray-950 font-bold text-center">
                <th style={{ border: BORDER_STYLE, padding: '8px 6px', width: '4%' }} className="text-center no-print">
                  #
                </th>
                <th style={{ border: BORDER_STYLE, padding: '8px 10px', width: '32%' }} className="text-start font-urdu text-base font-bold">
                  آئٹم کا نام (Item Name)
                </th>
                <th style={{ border: BORDER_STYLE, padding: '8px 8px', width: '14%' }} className="text-center text-xs sm:text-sm font-bold">
                  کیٹیگری (Category)
                </th>
                <th style={{ border: BORDER_STYLE, padding: '8px 8px', width: '16%' }} className="text-left font-bold text-base" dir="ltr">
                  کل مقدار (Qty KG)
                </th>
                <th style={{ border: BORDER_STYLE, padding: '8px 8px', width: '14%' }} className="text-left font-bold text-base" dir="ltr">
                  اوسط ریٹ (Avg Rate Rs)
                </th>
                <th style={{ border: BORDER_STYLE, padding: '8px 10px', width: '16%' }} className="text-left font-bold text-base" dir="ltr">
                  کل مالیت (Total Value Rs)
                </th>
                <th style={{ border: BORDER_STYLE, padding: '8px 6px', width: '8%' }} className="text-center text-xs font-bold no-print">
                  کھاتہ (Ledger)
                </th>
              </tr>
            </thead>

            <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
              {filteredItemWise.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ border: BORDER_STYLE, padding: '24px 12px' }}
                    className="text-center text-gray-500 font-urdu text-sm"
                  >
                    کوئی آئٹم اسٹاک میں موجود نہیں ہے۔ (No stock entries found)
                  </td>
                </tr>
              ) : (
                filteredItemWise.map((item, idx) => {
                  const isExpanded = !!expandedItemIds[item.itemId];

                  return (
                    <React.Fragment key={item.itemId || idx}>
                      {/* Main Item Row */}
                      <tr
                        className={`hover:bg-blue-50/50 transition-colors ${
                          idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'
                        }`}
                      >
                        {/* Expand Toggle */}
                        <td
                          style={{ border: BORDER_STYLE, padding: '6px 4px' }}
                          className="text-center no-print"
                        >
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.itemId)}
                            className="p-1 text-gray-700 hover:text-black cursor-pointer inline-flex items-center justify-center"
                            title={isExpanded ? 'Collapse breakdown' : 'Expand breakdown'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#1a6b2e]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </td>

                        {/* Item Name */}
                        <td
                          style={{ border: BORDER_STYLE, padding: '6px 10px' }}
                          className="text-start font-bold text-gray-950 font-urdu text-base"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              onClick={() => toggleExpand(item.itemId)}
                              className="cursor-pointer hover:underline"
                            >
                              {item.itemName}
                            </span>
                            {item.breakdowns.length > 1 && (
                              <span className="no-print text-[11px] font-sans px-1.5 py-0.2 bg-gray-100 text-gray-700 border border-gray-300">
                                {item.breakdowns.length} Godowns
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td style={{ border: BORDER_STYLE, padding: '6px 8px' }} className="text-center">
                          <Badge variant={item.category === 'Raw Material' ? 'orange' : 'green'}>
                            {item.category}
                          </Badge>
                        </td>

                        {/* Total Qty (KG) */}
                        <td
                          style={{ border: BORDER_STYLE, padding: '6px 8px' }}
                          className="text-left font-mono tabular-nums slashed-zero font-bold text-black text-base"
                          dir="ltr"
                        >
                          {item.totalQty.toLocaleString('en-PK')} KG
                        </td>

                        {/* Weighted Avg Rate */}
                        <td
                          style={{ border: BORDER_STYLE, padding: '6px 8px' }}
                          className="text-left font-mono tabular-nums slashed-zero text-sm text-gray-900"
                          dir="ltr"
                        >
                          {fmt(item.weightedAvgRate)}
                        </td>

                        {/* Total Value (Rs) */}
                        <td
                          style={{ border: BORDER_STYLE, padding: '6px 10px' }}
                          className="text-left font-mono tabular-nums slashed-zero font-bold text-black text-base"
                          dir="ltr"
                        >
                          {fmt(item.totalValue)}
                        </td>

                        {/* Actions (Ledger Button) */}
                        <td
                          style={{ border: BORDER_STYLE, padding: '6px 6px' }}
                          className="text-center no-print"
                        >
                          <button
                            type="button"
                            onClick={() => navigate(`/stock-ledger?item=${item.itemId}`)}
                            className="p-1 border border-black bg-white hover:bg-emerald-50 text-emerald-800 inline-flex items-center gap-1 font-bold text-xs cursor-pointer"
                            title="Open Stock Ledger for this item"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Ledger</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Breakdown Row (Per warehouse / per quality) */}
                      {isExpanded && (
                        <tr className="bg-[#FAF9F7] print:table-row">
                          <td colSpan={7} style={{ border: BORDER_STYLE, padding: '8px 12px' }}>
                            <div className="bg-white border border-black p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-gray-700 border-b border-gray-300 pb-1">
                                <span>
                                  گودام وار تفصیل (Godown Breakdown for {item.itemName}):
                                </span>
                                <span className="font-mono tabular-nums text-gray-600">
                                  {item.breakdowns.length} Location{item.breakdowns.length > 1 ? 's' : ''}
                                </span>
                              </div>

                              <table
                                className="w-full border-collapse text-xs border border-gray-300"
                                dir="rtl"
                              >
                                <thead>
                                  <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                                    <th className="p-2 text-start">گودام (Warehouse Store)</th>
                                    {item.hasAnyRealQuality && (
                                      <th className="p-2 text-center">کوالٹی (Quality)</th>
                                    )}
                                    <th className="p-2 text-left" dir="ltr">مقدار (Qty KG)</th>
                                    <th className="p-2 text-left" dir="ltr">ریٹ (Avg Rate)</th>
                                    <th className="p-2 text-left" dir="ltr">مالیت (Value Rs)</th>
                                    <th className="p-2 text-start" style={{ width: '18%' }}>
                                      حصہ (Share %)
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.breakdowns.map((b, bIdx) => (
                                    <tr
                                      key={b.id || bIdx}
                                      className="border-b border-gray-200 hover:bg-gray-50"
                                    >
                                      {/* Warehouse Name */}
                                      <td className="p-2 text-start font-bold text-gray-900">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            navigate(`/warehouse-ledger?warehouse=${b.warehouseId}`)
                                          }
                                          className="hover:underline text-blue-900 cursor-pointer flex items-center gap-1"
                                          title="Open Warehouse Ledger"
                                        >
                                          <WarehouseIcon className="w-3.5 h-3.5 text-gray-500" />
                                          <span>{b.warehouseName}</span>
                                        </button>
                                      </td>

                                      {/* Quality Grade (shown only if item has any real quality) */}
                                      {item.hasAnyRealQuality && (
                                        <td className="p-2 text-center">
                                          {b.hasRealQuality ? (
                                            <span className="bg-[#FFEB3B] border border-black px-1.5 py-0.5 font-bold text-xs text-black">
                                              {b.quality}
                                            </span>
                                          ) : (
                                            <span className="text-gray-400 font-mono">-</span>
                                          )}
                                        </td>
                                      )}

                                      {/* Qty */}
                                      <td
                                        className="p-2 text-left font-mono tabular-nums slashed-zero font-bold text-black"
                                        dir="ltr"
                                      >
                                        {b.qty.toLocaleString('en-PK')} KG
                                      </td>

                                      {/* Avg Rate */}
                                      <td className="p-2 text-left font-mono tabular-nums text-gray-800" dir="ltr">
                                        {fmt(b.avgRate)}
                                      </td>

                                      {/* Value */}
                                      <td
                                        className="p-2 text-left font-mono tabular-nums slashed-zero font-bold text-black"
                                        dir="ltr"
                                      >
                                        {fmt(b.value)}
                                      </td>

                                      {/* Share Bar */}
                                      <td className="p-2 text-start">
                                        <div className="flex items-center gap-2" dir="ltr">
                                          <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                                            <div
                                              className="bg-[#1a6b2e] h-full rounded-full transition-all"
                                              style={{
                                                width: `${Math.min(100, Math.max(0, b.share))}%`,
                                              }}
                                            />
                                          </div>
                                          <span className="font-mono text-[11px] font-bold text-gray-700 tabular-nums w-10 text-right">
                                            {b.share.toFixed(1)}%
                                          </span>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Bottom Grand Totals Row */}
            <tfoot>
              <tr className="bg-[#DFDFDF] border-t-2 border-black font-bold text-black">
                <td style={{ border: BORDER_STYLE, padding: '8px 4px' }} className="no-print"></td>
                <td
                  colSpan={2}
                  style={{ border: BORDER_STYLE, padding: '8px 10px' }}
                  className="text-start font-urdu text-base font-bold text-black"
                >
                  <div className="flex items-center justify-between">
                    <span>میزان کل (Grand Total Items):</span>
                    {search === '' && filterCat === 'All' && (
                      <span
                        className={`no-print text-xs px-2 py-0.5 border font-sans font-bold flex items-center gap-1 ${
                          isItemWiseMatchingSummary
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-red-100 text-red-800 border-red-300'
                        }`}
                      >
                        {isItemWiseMatchingSummary ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Matches Summary Cards</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                            <span>Differs from cards</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </td>

                {/* Grand Total Qty */}
                <td
                  style={{ border: BORDER_STYLE, padding: '8px 8px' }}
                  className="text-left font-mono tabular-nums slashed-zero font-extrabold text-black text-lg"
                  dir="ltr"
                >
                  {itemWiseGrandQty.toLocaleString('en-PK')} KG
                </td>

                {/* Blank rate cell */}
                <td style={{ border: BORDER_STYLE, padding: '8px 8px' }} className="text-left font-mono text-gray-500" dir="ltr">
                  —
                </td>

                {/* Grand Total Value */}
                <td
                  style={{ border: BORDER_STYLE, padding: '8px 10px' }}
                  className="text-left font-mono tabular-nums slashed-zero font-extrabold text-black text-lg"
                  dir="ltr"
                >
                  {fmt(itemWiseGrandValue)}
                </td>

                <td style={{ border: BORDER_STYLE, padding: '8px 6px' }} className="no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: Warehouse-wise (گودام وار) View                                 */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'warehouse-wise' && (
        <div className="space-y-4">
          {filteredWarehouses.length === 0 ? (
            <div className="bg-white border-2 border-black p-8 text-center text-gray-500 font-urdu text-base">
              کوئی اسٹاک اس گودام میں موجود نہیں ہے۔ (No inventory found in selected warehouse)
            </div>
          ) : (
            filteredWarehouses.map((wh) => (
              <div
                key={wh.warehouseId}
                className="bg-white border-2 border-black overflow-hidden shadow-xs print:border-none print:shadow-none"
              >
                {/* Warehouse Summary Strip Above Table */}
                <div
                  className="bg-[#FAF9F7] border-b-2 border-black p-3 flex flex-wrap items-center justify-between gap-3"
                  dir="ltr"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/warehouse-ledger?warehouse=${wh.warehouseId}`)}
                      className="font-black text-base text-[#1E3A5F] hover:underline flex items-center gap-1.5 cursor-pointer"
                      title="Open Warehouse Ledger"
                    >
                      <WarehouseIcon className="w-5 h-5 text-gray-700" />
                      <span>{wh.warehouseName}</span>
                    </button>
                    <span className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 font-bold border border-gray-300">
                      {wh.type || 'Godown'}
                    </span>
                    <span className="text-xs text-gray-600 font-medium">
                      ({wh.items.length} item{wh.items.length !== 1 ? 's' : ''})
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm font-mono tabular-nums slashed-zero font-bold">
                    <div className="text-gray-800">
                      <span className="text-xs font-sans text-gray-500 font-normal me-1">Total Qty:</span>
                      <span className="text-black font-extrabold">{wh.totalQty.toLocaleString('en-PK')} KG</span>
                    </div>
                    <div className="text-gray-800">
                      <span className="text-xs font-sans text-gray-500 font-normal me-1">Avg Rate:</span>
                      <span>{fmt(wh.avgRate)}</span>
                    </div>
                    <div className="text-[#1a6b2e]">
                      <span className="text-xs font-sans text-gray-500 font-normal me-1">Total Value:</span>
                      <span className="font-extrabold">{fmt(wh.totalValue)}</span>
                    </div>
                  </div>
                </div>

                {/* Warehouse Items Table */}
                <div className="overflow-x-auto print:overflow-visible">
                  <table
                    className="w-full border-collapse text-sm text-black"
                    style={{ borderCollapse: 'collapse', border: BORDER_STYLE, direction: 'rtl' }}
                    dir="rtl"
                  >
                    <thead>
                      <tr className="bg-[#DFDFDF] border-b border-black text-gray-950 font-bold text-center">
                        <th style={{ border: BORDER_STYLE, padding: '6px 10px', width: '34%' }} className="text-start font-urdu text-sm font-bold">
                          آئٹم کا نام (Item Name)
                        </th>
                        <th style={{ border: BORDER_STYLE, padding: '6px 8px', width: '14%' }} className="text-center text-xs font-bold">
                          کیٹیگری (Category)
                        </th>
                        {wh.hasAnyRealQuality && (
                          <th style={{ border: BORDER_STYLE, padding: '6px 8px', width: '12%' }} className="text-center text-xs font-bold">
                            کوالٹی (Quality)
                          </th>
                        )}
                        <th style={{ border: BORDER_STYLE, padding: '6px 8px', width: '14%' }} className="text-left font-bold" dir="ltr">
                          مقدار (Qty KG)
                        </th>
                        <th style={{ border: BORDER_STYLE, padding: '6px 8px', width: '12%' }} className="text-left font-bold" dir="ltr">
                          اوسط ریٹ (Avg Rate)
                        </th>
                        <th style={{ border: BORDER_STYLE, padding: '6px 10px', width: '14%' }} className="text-left font-bold" dir="ltr">
                          کل مالیت (Value Rs)
                        </th>
                      </tr>
                    </thead>

                    <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {wh.items.map((it, itIdx) => (
                        <tr
                          key={it.id || itIdx}
                          className={`hover:bg-blue-50/50 transition-colors ${
                            itIdx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'
                          }`}
                        >
                          {/* Item Name (Clickable -> Stock Ledger) */}
                          <td style={{ border: BORDER_STYLE, padding: '6px 10px' }} className="text-start font-bold">
                            <button
                              type="button"
                              onClick={() => navigate(`/stock-ledger?item=${it.itemId}`)}
                              className="hover:underline text-blue-900 cursor-pointer font-urdu text-base"
                              title="Open Stock Ledger"
                            >
                              {it.itemName}
                            </button>
                          </td>

                          {/* Category */}
                          <td style={{ border: BORDER_STYLE, padding: '6px 8px' }} className="text-center">
                            <Badge variant={it.category === 'Raw Material' ? 'orange' : 'green'}>
                              {it.category}
                            </Badge>
                          </td>

                          {/* Quality Grade (shown only if warehouse has real quality) */}
                          {wh.hasAnyRealQuality && (
                            <td style={{ border: BORDER_STYLE, padding: '6px 8px' }} className="text-center">
                              {it.hasRealQuality ? (
                                <span className="bg-[#FFEB3B] border border-black px-1.5 py-0.5 font-bold text-xs text-black">
                                  {it.quality}
                                </span>
                              ) : (
                                <span className="text-gray-400 font-mono">-</span>
                              )}
                            </td>
                          )}

                          {/* Qty */}
                          <td
                            style={{ border: BORDER_STYLE, padding: '6px 8px' }}
                            className="text-left font-mono tabular-nums slashed-zero font-bold text-black text-base"
                            dir="ltr"
                          >
                            {it.qty.toLocaleString('en-PK')} KG
                          </td>

                          {/* Avg Rate */}
                          <td style={{ border: BORDER_STYLE, padding: '6px 8px' }} className="text-left font-mono tabular-nums text-gray-800" dir="ltr">
                            {fmt(it.avgRate)}
                          </td>

                          {/* Total Value */}
                          <td
                            style={{ border: BORDER_STYLE, padding: '6px 10px' }}
                            className="text-left font-mono tabular-nums slashed-zero font-bold text-black text-base"
                            dir="ltr"
                          >
                            {fmt(it.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {/* Subtotal Row */}
                    <tfoot>
                      <tr className="bg-[#EBE9ED] border-t border-black font-bold text-black">
                        <td
                          colSpan={wh.hasAnyRealQuality ? 3 : 2}
                          style={{ border: BORDER_STYLE, padding: '6px 10px' }}
                          className="text-start font-urdu text-sm font-bold"
                        >
                          میزان گودام ({wh.warehouseName} Subtotal):
                        </td>
                        <td
                          style={{ border: BORDER_STYLE, padding: '6px 8px' }}
                          className="text-left font-mono tabular-nums slashed-zero font-bold text-black text-base"
                          dir="ltr"
                        >
                          {wh.totalQty.toLocaleString('en-PK')} KG
                        </td>
                        <td style={{ border: BORDER_STYLE, padding: '6px 8px' }} className="text-left font-mono text-gray-600" dir="ltr">
                          {fmt(wh.avgRate)}
                        </td>
                        <td
                          style={{ border: BORDER_STYLE, padding: '6px 10px' }}
                          className="text-left font-mono tabular-nums slashed-zero font-bold text-black text-base"
                          dir="ltr"
                        >
                          {fmt(wh.totalValue)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))
          )}

          {/* Grand Total Row at end of All Warehouses */}
          {filteredWarehouses.length > 1 && (
            <div className="bg-[#DFDFDF] border-2 border-black p-3.5 flex flex-wrap items-center justify-between text-black font-bold">
              <span className="font-urdu text-base font-bold">
                میزان کل تمام گودام (Grand Total All Warehouses):
              </span>
              <div className="flex items-center gap-6 font-mono tabular-nums slashed-zero text-lg font-black" dir="ltr">
                <div>
                  <span className="text-xs font-sans text-gray-600 font-normal me-2">Total Volume:</span>
                  <span>{warehouseGrandQty.toLocaleString('en-PK')} KG</span>
                </div>
                <div>
                  <span className="text-xs font-sans text-gray-600 font-normal me-2">Total Valuation:</span>
                  <span>{fmt(warehouseGrandValue)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 3: Manual Stock Additions (دستی اندراج)                             */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'adjustments' && (
        <div className="bg-white border-2 border-black overflow-x-auto print:overflow-visible">
          <table
            className="w-full border-collapse text-sm text-black"
            style={{ borderCollapse: 'collapse', border: BORDER_STYLE, direction: 'rtl' }}
            dir="rtl"
          >
            <thead>
              <tr className="bg-[#DFDFDF] border-b-2 border-black text-gray-950 font-bold text-center">
                <th style={{ border: BORDER_STYLE, padding: '6px 8px', width: '10%' }}>تاریخ (Date)</th>
                <th style={{ border: BORDER_STYLE, padding: '6px 10px', width: '22%' }} className="text-start font-urdu">
                  آئٹم کا نام (Item Name)
                </th>
                <th style={{ border: BORDER_STYLE, padding: '6px 8px', width: '12%' }}>کوالٹی (Quality)</th>
                <th style={{ border: BORDER_STYLE, padding: '6px 8px', width: '14%' }}>گودام (Warehouse)</th>
                <th style={{ border: BORDER_STYLE, padding: '6px 8px', width: '12%' }} className="text-left" dir="ltr">
                  مقدار (Qty KG)
                </th>
                <th style={{ border: BORDER_STYLE, padding: '6px 8px', width: '10%' }} className="text-left" dir="ltr">
                  ریٹ (Rate)
                </th>
                <th style={{ border: BORDER_STYLE, padding: '6px 8px', width: '12%' }} className="text-left" dir="ltr">
                  کل رقم (Amount)
                </th>
                <th style={{ border: BORDER_STYLE, padding: '6px 8px', width: '12%' }} className="text-start font-urdu">
                  تفصیل / وجہ (Reason)
                </th>
                <th style={{ border: BORDER_STYLE, padding: '6px 6px', width: '8%' }} className="no-print">
                  ایکشن (Actions)
                </th>
              </tr>
            </thead>

            <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
              {filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ border: BORDER_STYLE, padding: '24px 12px' }} className="text-center text-gray-500 font-urdu">
                    کوئی دستی اسٹاک اندراج نہیں ملا۔ (No manual stock additions found)
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map((a) => (
                  <tr key={a.id} className="hover:bg-blue-50/50">
                    <td style={{ border: BORDER_STYLE, padding: '6px 8px' }} className="text-center text-xs font-mono" dir="ltr">
                      {formatDate(a.date)}
                    </td>
                    <td style={{ border: BORDER_STYLE, padding: '6px 10px' }} className="text-start font-bold text-gray-950 font-urdu text-base">
                      {a.itemName}
                    </td>
                    <td style={{ border: BORDER_STYLE, padding: '6px 8px' }} className="text-center">
                      {isRealQuality(a.quality) ? (
                        <span className="bg-[#FFEB3B] border border-black px-1.5 py-0.5 font-bold text-xs text-black">
                          {a.quality}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-mono">-</span>
                      )}
                    </td>
                    <td style={{ border: BORDER_STYLE, padding: '6px 8px' }} className="text-center text-xs">
                      {a.warehouseName}
                    </td>
                    <td style={{ border: BORDER_STYLE, padding: '6px 8px' }} className="text-left font-mono tabular-nums font-bold text-emerald-800" dir="ltr">
                      +{Number(a.qty || 0).toLocaleString('en-PK')} KG
                    </td>
                    <td style={{ border: BORDER_STYLE, padding: '6px 8px' }} className="text-left font-mono tabular-nums text-gray-800" dir="ltr">
                      {fmt(a.rate)}
                    </td>
                    <td style={{ border: BORDER_STYLE, padding: '6px 8px' }} className="text-left font-mono tabular-nums font-bold text-black" dir="ltr">
                      {fmt(a.amount || a.qty * a.rate)}
                    </td>
                    <td style={{ border: BORDER_STYLE, padding: '6px 8px' }} className="text-start text-xs font-urdu">
                      {a.reason || a.note || 'Manual Addition'}
                    </td>
                    <td style={{ border: BORDER_STYLE, padding: '6px 6px' }} className="text-center no-print">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingAdjustment(a)}
                          className="p-1 border border-black bg-white hover:bg-amber-50 text-amber-700 cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingAdjId(a.id)}
                          className="p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Stock Entry Modal */}
      <Modal
        isOpen={isAddStockModalOpen || !!editingAdjustment}
        onClose={() => {
          setIsAddStockModalOpen(false);
          setEditingAdjustment(null);
        }}
        title={
          editingAdjustment
            ? 'Edit Manual Stock Addition'
            : 'Manual Stock Entry / Addition (دستی اسٹاک اندراج)'
        }
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
                `Stock of ${data.qty} KG (${data.itemName}${
                  data.quality ? ` - ${data.quality}` : ''
                }) added successfully!`
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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deletingAdjId}
        title="Delete Stock Record"
        message="Are you sure you want to delete this stock entry? This will reverse its effect on inventory."
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
