import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Layers,
  Users,
} from 'lucide-react';
import PrintHeader from '../../components/common/PrintHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import { safePrint } from '../../utils/printUtils.js';
import { fmt, fmtNum, formatDate, getTodayStr } from '../../utils/formatters.js';
import { useCompanyProfile } from '../../context/CompanyProfileContext.jsx';

/**
 * PartyQualityAnalysis component for Reports.jsx
 * Supports two analysis modes:
 * 1. 'party_quality': Party → Quality (For a party, which quality was bought/sold and how much)
 * 2. 'quality_party': Quality → Party (For a quality/item, which parties bought/sold and how much)
 */
export default function PartyQualityAnalysis({
  type = 'purchase', // 'purchase' | 'sale'
  mode = 'party_quality', // 'party_quality' | 'quality_party'
  onModeChange,
  invoices = [],
  parties = [],
  items = [],
  qualities = [],
  dateFrom = '',
  dateTo = '',
}) {
  const { profile } = useCompanyProfile();
  const legalName = profile?.legalName || 'Shahid Yaseen Cotton Waste Merchant';
  const address = profile?.address || 'Faisalabad, Pakistan';

  const isPurchase = type === 'purchase';
  const partyLabel = isPurchase ? 'Supplier' : 'Customer';
  const partyPluralLabel = isPurchase ? 'Suppliers' : 'Customers';

  // Filters state
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');

  // Expandable row state: map of rowKey -> boolean
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (key) => {
    setExpandedRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 1. Shared data step: Flatten invoices into line items
  const {
    flattenedLines,
    qualityLines,
    serviceLines,
    invoicesGrandTotal,
    allStockTotal,
    allServicesTotal,
  } = useMemo(() => {
    const flat = [];
    let invTotal = 0;

    invoices.forEach((inv) => {
      invTotal += Number(inv.total || 0);
      const partyId = isPurchase ? (inv.supplierId || '') : (inv.customerId || '');
      const partyName = isPurchase
        ? (inv.supplierName || 'Unknown Supplier')
        : (inv.customerName || 'Unknown Customer');
      const invNo = inv.no || inv.invoiceNo || String(inv.id);
      const invDate = inv.date;

      (inv.items || []).forEach((it, idx) => {
        const isService = it.type === 'service';
        const qty = Number(it.qty ?? it.weight ?? it.quantity ?? 0);
        const rate = Number(it.rate || 0);
        const amount = Number(
          it.amount !== undefined && it.amount !== null && it.amount !== ''
            ? it.amount
            : qty * rate
        );
        const nugs = Number(it.nugs || 0);
        const unitType = it.unitType || (nugs > 0 ? 'Nug' : 'KG');
        const quality = (it.quality || '').trim();
        const itemId = it.itemId || it.id || '';
        const itemName = it.itemName || (isService ? (it.serviceDescription || 'Service') : 'Item');

        flat.push({
          lineId: `${inv.id || invNo}_${idx}`,
          invoiceId: inv.id,
          invoiceNo: invNo,
          date: invDate,
          partyId,
          partyName,
          warehouseName: inv.warehouseName,
          itemId,
          itemName,
          quality,
          unitType,
          nugs,
          qty,
          rate,
          amount,
          isService,
        });
      });
    });

    const qual = flat.filter((l) => !l.isService && Boolean(l.quality));
    const serv = flat.filter((l) => l.isService || !l.quality);

    const stockTot = qual.reduce((s, l) => s + l.amount, 0);
    const servTot = serv.reduce((s, l) => s + l.amount, 0);

    return {
      flattenedLines: flat,
      qualityLines: qual,
      serviceLines: serv,
      invoicesGrandTotal: invTotal,
      allStockTotal: stockTot,
      allServicesTotal: servTot,
    };
  }, [invoices, isPurchase]);

  // Distinct quality options from available lines & master list
  const availableQualities = useMemo(() => {
    const set = new Set();
    qualities.forEach((q) => q.name && set.add(q.name.trim()));
    qualityLines.forEach((l) => l.quality && set.add(l.quality.trim()));
    return Array.from(set).sort();
  }, [qualities, qualityLines]);

  // Relevant parties for selector
  const relevantParties = useMemo(() => {
    const list = parties.filter((p) =>
      isPurchase ? p.type === 'Supplier' || p.type === 'Both' : p.type === 'Customer' || p.type === 'Both'
    );
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [parties, isPurchase]);

  // Filtered party list for Party selector (searchable)
  const filteredPartyOptions = useMemo(() => {
    if (!partySearchQuery) return relevantParties;
    const q = partySearchQuery.toLowerCase();
    return relevantParties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q))
    );
  }, [relevantParties, partySearchQuery]);

  // Distinct items from quality lines
  const availableItems = useMemo(() => {
    const map = new Map();
    items.forEach((i) => i.id && map.set(i.id, i.name));
    qualityLines.forEach((l) => {
      if (l.itemId && !map.has(l.itemId)) {
        map.set(l.itemId, l.itemName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items, qualityLines]);

  // -------------------------------------------------------------
  // MODE 1: Party → Quality Grouping Data
  // -------------------------------------------------------------
  const partyQualityGroups = useMemo(() => {
    if (mode !== 'party_quality') return [];

    let targetLines = qualityLines;
    if (selectedPartyId) {
      targetLines = targetLines.filter((l) => l.partyId === selectedPartyId);
    } else if (partySearchQuery) {
      const q = partySearchQuery.toLowerCase();
      targetLines = targetLines.filter((l) => l.partyName.toLowerCase().includes(q));
    }

    // Group by Party first
    const partyMap = new Map();

    targetLines.forEach((line) => {
      const pKey = line.partyId || line.partyName;
      if (!partyMap.has(pKey)) {
        partyMap.set(pKey, {
          partyId: line.partyId,
          partyName: line.partyName,
          itemsMap: new Map(),
          totalQty: 0,
          totalAmount: 0,
          invoicesSet: new Set(),
        });
      }

      const pGroup = partyMap.get(pKey);
      pGroup.totalQty += line.qty;
      pGroup.totalAmount += line.amount;
      pGroup.invoicesSet.add(line.invoiceNo);

      // Group by Item + Quality under this party
      const itemKey = `${line.itemId || line.itemName}:::${line.quality}`;
      if (!pGroup.itemsMap.has(itemKey)) {
        pGroup.itemsMap.set(itemKey, {
          itemKey,
          itemId: line.itemId,
          itemName: line.itemName,
          quality: line.quality,
          lines: [],
          totalQty: 0,
          totalAmount: 0,
          invoicesSet: new Set(),
        });
      }

      const itGroup = pGroup.itemsMap.get(itemKey);
      itGroup.lines.push(line);
      itGroup.totalQty += line.qty;
      itGroup.totalAmount += line.amount;
      itGroup.invoicesSet.add(line.invoiceNo);
    });

    // Convert map to structured array
    const result = Array.from(partyMap.values()).map((p) => {
      const itemRows = Array.from(p.itemsMap.values()).map((it) => ({
        ...it,
        avgRate: it.totalQty > 0 ? it.totalAmount / it.totalQty : 0,
        invoicesCount: it.invoicesSet.size,
      }));

      // Sort items by quantity descending
      itemRows.sort((a, b) => b.totalQty - a.totalQty);

      return {
        ...p,
        itemRows,
        avgRate: p.totalQty > 0 ? p.totalAmount / p.totalQty : 0,
        invoicesCount: p.invoicesSet.size,
      };
    });

    // Sort parties alphabetically
    result.sort((a, b) => a.partyName.localeCompare(b.partyName));
    return result;
  }, [mode, qualityLines, selectedPartyId, partySearchQuery]);

  // Overall totals for Party → Quality
  const partyQualityTotals = useMemo(() => {
    let qty = 0;
    let amount = 0;
    const invSet = new Set();

    partyQualityGroups.forEach((pg) => {
      qty += pg.totalQty;
      amount += pg.totalAmount;
      pg.invoicesSet.forEach((no) => invSet.add(no));
    });

    return {
      totalQty: qty,
      totalAmount: amount,
      avgRate: qty > 0 ? amount / qty : 0,
      invoicesCount: invSet.size,
    };
  }, [partyQualityGroups]);

  // -------------------------------------------------------------
  // MODE 2: Quality → Party Grouping Data
  // -------------------------------------------------------------
  const qualityPartyGroups = useMemo(() => {
    if (mode !== 'quality_party') return [];

    let targetLines = qualityLines;
    if (selectedQuality) {
      targetLines = targetLines.filter(
        (l) => l.quality.toLowerCase() === selectedQuality.toLowerCase()
      );
    }
    if (selectedItemId) {
      targetLines = targetLines.filter(
        (l) => l.itemId === selectedItemId || l.itemName.toLowerCase() === selectedItemId.toLowerCase()
      );
    }

    // Group by Party
    const partyMap = new Map();

    targetLines.forEach((line) => {
      const pKey = line.partyId || line.partyName;
      if (!partyMap.has(pKey)) {
        partyMap.set(pKey, {
          partyId: line.partyId,
          partyName: line.partyName,
          lines: [],
          totalQty: 0,
          totalAmount: 0,
          invoicesSet: new Set(),
        });
      }

      const pGroup = partyMap.get(pKey);
      pGroup.lines.push(line);
      pGroup.totalQty += line.qty;
      pGroup.totalAmount += line.amount;
      pGroup.invoicesSet.add(line.invoiceNo);
    });

    const result = Array.from(partyMap.values()).map((p) => ({
      ...p,
      avgRate: p.totalQty > 0 ? p.totalAmount / p.totalQty : 0,
      invoicesCount: p.invoicesSet.size,
    }));

    // Client Requirement 4: Sorted by quantity descending!
    result.sort((a, b) => b.totalQty - a.totalQty);
    return result;
  }, [mode, qualityLines, selectedQuality, selectedItemId]);

  // Overall totals for Quality → Party
  const qualityPartyTotals = useMemo(() => {
    let qty = 0;
    let amount = 0;
    const invSet = new Set();

    qualityPartyGroups.forEach((pg) => {
      qty += pg.totalQty;
      amount += pg.totalAmount;
      pg.invoicesSet.forEach((no) => invSet.add(no));
    });

    return {
      totalQty: qty,
      totalAmount: amount,
      avgRate: qty > 0 ? amount / qty : 0,
      invoicesCount: invSet.size,
    };
  }, [qualityPartyGroups]);

  // -------------------------------------------------------------
  // Reconciliation Computations
  // -------------------------------------------------------------
  const displayedGroupedTotal =
    mode === 'party_quality' ? partyQualityTotals.totalAmount : qualityPartyTotals.totalAmount;

  // Has filter applied that restricts to a subset of all lines
  const hasSubsetFilter =
    (mode === 'party_quality' && Boolean(selectedPartyId)) ||
    (mode === 'quality_party' && (Boolean(selectedQuality) || Boolean(selectedItemId)));

  // Corresponding invoice subset total for reconciliation
  const subsetInvoiceTotal = useMemo(() => {
    if (!hasSubsetFilter) return invoicesGrandTotal;
    if (mode === 'party_quality' && selectedPartyId) {
      return invoices
        .filter((inv) => (isPurchase ? inv.supplierId : inv.customerId) === selectedPartyId)
        .reduce((s, inv) => s + Number(inv.total || 0), 0);
    }
    return null;
  }, [hasSubsetFilter, mode, selectedPartyId, invoices, isPurchase, invoicesGrandTotal]);

  const subsetServiceTotal = useMemo(() => {
    if (!hasSubsetFilter) return allServicesTotal;
    if (mode === 'party_quality' && selectedPartyId) {
      return serviceLines
        .filter((l) => l.partyId === selectedPartyId)
        .reduce((s, l) => s + l.amount, 0);
    }
    return 0;
  }, [hasSubsetFilter, mode, selectedPartyId, serviceLines, allServicesTotal]);

  const targetReconciliationInvoiceTotal = hasSubsetFilter && subsetInvoiceTotal !== null
    ? subsetInvoiceTotal
    : invoicesGrandTotal;

  const targetReconciliationServiceTotal = hasSubsetFilter && subsetInvoiceTotal !== null
    ? subsetServiceTotal
    : allServicesTotal;

  const combinedGroupedPlusServices = displayedGroupedTotal + targetReconciliationServiceTotal;
  const reconciliationDifference = Math.abs(targetReconciliationInvoiceTotal - combinedGroupedPlusServices);
  const isReconciled = reconciliationDifference < 1.0;

  // Selected party object for header printing
  const selectedPartyObj = parties.find((p) => p.id === selectedPartyId);

  // -------------------------------------------------------------
  // Export CSV Handler
  // -------------------------------------------------------------
  const handleExportCsv = () => {
    let headers = [];
    let rows = [];
    const dateStr = getTodayStr();
    let filename = '';

    if (mode === 'party_quality') {
      filename = `${type}_party_quality_analysis_${dateStr}.csv`;
      headers = [
        partyLabel,
        'Item Name',
        'Quality',
        'Quantity (KG)',
        'Weighted Avg Rate (Rs)',
        'Total Amount (PKR)',
        'Invoice Count',
      ];

      partyQualityGroups.forEach((pg) => {
        pg.itemRows.forEach((it) => {
          rows.push([
            `"${pg.partyName}"`,
            `"${it.itemName}"`,
            `"${it.quality}"`,
            it.totalQty.toFixed(2),
            it.avgRate.toFixed(2),
            it.totalAmount.toFixed(2),
            it.invoicesCount,
          ]);
        });
      });

      // Totals row
      rows.push([
        '"TOTAL"',
        '""',
        '""',
        partyQualityTotals.totalQty.toFixed(2),
        partyQualityTotals.avgRate.toFixed(2),
        partyQualityTotals.totalAmount.toFixed(2),
        partyQualityTotals.invoicesCount,
      ]);
    } else {
      filename = `${type}_quality_party_analysis_${dateStr}.csv`;
      headers = [
        partyLabel,
        'Quality Selected',
        'Item Selected',
        'Quantity (KG)',
        'Weighted Avg Rate (Rs)',
        'Total Amount (PKR)',
        'Invoice Count',
      ];

      qualityPartyGroups.forEach((qg) => {
        rows.push([
          `"${qg.partyName}"`,
          `"${selectedQuality || 'All Qualities'}"`,
          `"${selectedItemId ? (availableItems.find((i) => i.id === selectedItemId)?.name || selectedItemId) : 'All Items'}"`,
          qg.totalQty.toFixed(2),
          qg.avgRate.toFixed(2),
          qg.totalAmount.toFixed(2),
          qg.invoicesCount,
        ]);
      });

      // Totals row
      rows.push([
        '"TOTAL"',
        '""',
        '""',
        qualityPartyTotals.totalQty.toFixed(2),
        qualityPartyTotals.avgRate.toFixed(2),
        qualityPartyTotals.totalAmount.toFixed(2),
        qualityPartyTotals.invoicesCount,
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    safePrint();
  };

  // Timestamp for print footer
  const now = new Date();
  const printTimestamp = `${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <div className="space-y-4">
      {/* ── Top Controls & Filter Toolbar ────────────────────────────── */}
      <div className="bg-[#FAF9F7] p-3 border-2 border-black space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Mode Badge & Description */}
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-[#1E3A5F] uppercase tracking-wide flex items-center gap-1.5">
              {mode === 'party_quality' ? (
                <>
                  <Users className="w-4 h-4 text-[#C97B2E]" />
                  Party → Quality Analysis
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 text-[#C97B2E]" />
                  Quality → Party Analysis
                </>
              )}
            </span>
            <span className="text-xs text-gray-500 font-medium">
              ({isPurchase ? 'Inward Purchases' : 'Outward Sales'})
            </span>
          </div>

          {/* Action Buttons: Print & Export */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={handleExportCsv}
              title="Export analysis table as CSV"
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={handlePrint}
              title="Print official analysis statement"
            >
              Print Analysis
            </Button>
          </div>
        </div>

        {/* Dynamic Filters depending on mode */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-300 text-xs">
          {mode === 'party_quality' ? (
            <>
              {/* Searchable Party Selector */}
              <div className="flex items-center gap-1.5 flex-1 min-w-[260px] max-w-md">
                <span className="font-bold text-gray-800 whitespace-nowrap">{partyLabel}:</span>
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="bg-white border border-black px-2 py-1 text-xs outline-none flex-1 font-semibold"
                >
                  <option value="">All {partyPluralLabel} ({relevantParties.length})</option>
                  {filteredPartyOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.city ? `(${p.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Party Search Input (filters party list or groups) */}
              <div className="flex items-center gap-1 w-56">
                <Search className="w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={partySearchQuery}
                  onChange={(e) => setPartySearchQuery(e.target.value)}
                  placeholder={`Search ${partyLabel.toLowerCase()}...`}
                  className="bg-white border border-black px-2 py-1 text-xs outline-none w-full"
                />
                {partySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPartySearchQuery('')}
                    className="text-gray-500 hover:text-red-700 font-bold px-1"
                  >
                    ×
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Quality Selector */}
              <div className="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-xs">
                <span className="font-bold text-gray-800 whitespace-nowrap">Quality:</span>
                <select
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(e.target.value)}
                  className="bg-white border border-black px-2 py-1 text-xs outline-none flex-1 font-semibold"
                >
                  <option value="">All Qualities ({availableQualities.length})</option>
                  {availableQualities.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Item Selector */}
              <div className="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-xs">
                <span className="font-bold text-gray-800 whitespace-nowrap">Item (Optional):</span>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="bg-white border border-black px-2 py-1 text-xs outline-none flex-1"
                >
                  <option value="">All Items ({availableItems.length})</option>
                  {availableItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Active Date Range Indicator */}
          <div className="ms-auto text-gray-700 font-mono text-sm bg-white border border-gray-300 px-3 py-1 font-semibold">
            Period: {dateFrom ? formatDate(dateFrom) : 'Start'} → {dateTo ? formatDate(dateTo) : 'Present'}
          </div>
        </div>
      </div>

      {/* ── Main Printable Container ─────────────────────────────────── */}
      <div id="party-quality-print-area" className="report-rtl bg-white border-2 border-black w-full max-w-[1400px] mx-auto flex flex-col" dir="rtl" style={{ height: 'calc(100vh - 250px)', minHeight: '420px' }}>
        {/* Printable Official Header */}
        <PrintHeader
          documentTitle={
            mode === 'party_quality'
              ? `${isPurchase ? 'PURCHASE' : 'SALE'} REPORT — PARTY → QUALITY ANALYSIS`
              : `${isPurchase ? 'PURCHASE' : 'SALE'} REPORT — QUALITY → PARTY ANALYSIS`
          }
          subtitle={`Official ${isPurchase ? 'Procurement' : 'Revenue'} quality breakdown derived directly from ledger transactions`}
          partyName={
            selectedPartyObj
              ? `${selectedPartyObj.name} (${selectedPartyObj.city || ''})`
              : mode === 'party_quality'
              ? 'All Parties'
              : selectedQuality
              ? `Quality: ${selectedQuality}`
              : 'All Qualities'
          }
          dateStr={
            dateFrom || dateTo
              ? `${dateFrom ? formatDate(dateFrom) : 'All time'} to ${dateTo ? formatDate(dateTo) : 'Present'}`
              : 'All Available Records'
          }
        />

        {/* Screen Header Bar */}
        <div className="p-3.5 border-b-2 border-black bg-[#FAF9F7] flex flex-wrap justify-between items-center text-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base uppercase tracking-wider text-black">
              {mode === 'party_quality'
                ? selectedPartyId
                  ? `${selectedPartyObj?.name || 'Selected Party'} — Quality Breakdown`
                  : `All ${partyPluralLabel} — Quality Breakdown`
                : selectedQuality
                ? `Quality "${selectedQuality}" — ${partyLabel} Breakdown`
                : `All Qualities — ${partyLabel} Breakdown`}
            </span>
          </div>
          <span className="font-mono text-gray-700 text-sm font-semibold" dir="ltr">
            {mode === 'party_quality'
              ? `${partyQualityGroups.length} parties grouped`
              : `${qualityPartyGroups.length} parties ranked`}
          </span>
        </div>

        {/* ── Table Layout ────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 min-h-0 w-full">
          {mode === 'party_quality' ? (
            /* =========================================================
               VIEW 1: PARTY → QUALITY TABLE
               ========================================================= */
            <table className="w-full text-base border-collapse border border-black" dir="rtl" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead className="bg-[#DFDFDF] sticky top-0 z-10 border-b-2 border-black">
                <tr>
                  <th className="border border-black px-3 py-2.5 w-12 text-center text-base font-bold">#</th>
                  {!selectedPartyId && (
                    <th className="border border-black px-3.5 py-2.5 text-base font-bold">{partyLabel}</th>
                  )}
                  <th className="border border-black px-3.5 py-2.5 text-base font-bold">Item Product</th>
                  <th className="border border-black px-3.5 py-2.5 text-base font-bold">Quality Grade</th>
                  <th className="border border-black px-3.5 py-2.5 text-right w-32 text-base font-bold">Total Qty (KG)</th>
                  <th className="border border-black px-3.5 py-2.5 text-right w-32 text-base font-bold">Avg Rate (Rs)</th>
                  <th className="border border-black px-3.5 py-2.5 text-right w-36 text-base font-bold">Total Amount (PKR)</th>
                  <th className="border border-black px-3.5 py-2.5 text-center w-28 text-base font-bold">Invoices</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {partyQualityGroups.length === 0 ? (
                  <tr>
                    <td
                      colSpan={selectedPartyId ? 7 : 8}
                      className="text-center py-8 text-gray-500 font-bold border border-black text-base"
                    >
                      No records for this selection
                    </td>
                  </tr>
                ) : (
                  partyQualityGroups.map((pg, pIdx) => {
                    const isSingleParty = Boolean(selectedPartyId);

                    return (
                      <React.Fragment key={pg.partyId || pg.partyName}>
                        {/* If "All parties", render a prominent Party Header */}
                        {!isSingleParty && (
                          <tr className="bg-[#F2F0EC] border-b border-black font-bold">
                            <td
                              colSpan={8}
                              className="border border-black px-3.5 py-2.5 text-base text-[#1E3A5F] uppercase tracking-wide"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-base">
                                  {partyLabel}: {pg.partyName}
                                </span>
                                <span className="font-mono text-gray-800 text-sm font-semibold">
                                  {pg.itemRows.length} item{pg.itemRows.length > 1 ? 's' : ''} • Subtotal: {fmt(pg.totalAmount)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Item + Quality Rows */}
                        {pg.itemRows.map((it, itIdx) => {
                          const rowKey = `${pg.partyId || pg.partyName}___${it.itemKey}`;
                          const isExpanded = Boolean(expandedRows[rowKey]);

                          return (
                            <React.Fragment key={rowKey}>
                              <tr
                                onClick={() => toggleRow(rowKey)}
                                className={`cursor-pointer transition-colors ${
                                  isExpanded
                                    ? 'bg-amber-50/70 font-semibold'
                                    : itIdx % 2 === 0
                                    ? 'bg-white hover:bg-blue-50/40'
                                    : 'bg-[#FAF9F7] hover:bg-blue-50/40'
                                }`}
                              >
                                <td className="border border-black px-2.5 py-2.5 text-center text-gray-600 font-mono text-base">
                                  <div className="flex items-center justify-center gap-1">
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-amber-700" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-gray-500" />
                                    )}
                                    <span>{itIdx + 1}</span>
                                  </div>
                                </td>
                                {!selectedPartyId && (
                                  <td className="border border-black px-3.5 py-2.5 text-gray-900 font-medium text-base">
                                    {pg.partyName}
                                  </td>
                                )}
                                <td className="border border-black px-3.5 py-2.5 font-bold text-gray-900 text-base">
                                  {it.itemName}
                                </td>
                                <td className="border border-black px-3.5 py-2.5">
                                  <span className="bg-gray-100 border border-black px-2 py-1 text-[22px] font-mono font-bold text-[#1E3A5F] inline-block leading-none">
                                    {it.quality}
                                  </span>
                                </td>
                                <td className="border border-black px-3.5 py-2.5 text-right font-mono font-bold text-gray-900 text-base tabular-nums">
                                  {it.totalQty.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                                  <span className="text-gray-600 font-normal text-sm">kg</span>
                                </td>
                                <td className="border border-black px-3.5 py-2.5 text-right font-mono text-gray-800 text-base tabular-nums">
                                  {fmtNum(it.avgRate)}
                                </td>
                                <td className="border border-black px-3.5 py-2.5 text-right font-mono font-bold text-[#1E3A5F] text-base tabular-nums">
                                  {fmt(it.totalAmount)}
                                </td>
                                <td className="border border-black px-3.5 py-2.5 text-center font-mono">
                                  <span className="bg-blue-50 border border-blue-400 px-2 py-0.5 rounded text-xs font-bold text-[#1E3A5F]">
                                    {it.invoicesCount} {it.invoicesCount === 1 ? 'inv' : 'invs'}
                                  </span>
                                </td>
                              </tr>

                              {/* Expanded Invoices Sub-table */}
                              {isExpanded && (
                                <tr className="bg-[#FFFDF7]">
                                  <td
                                    colSpan={selectedPartyId ? 7 : 8}
                                    className="border border-black p-3.5 bg-amber-50/30"
                                  >
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-sm font-bold text-gray-800 border-b border-gray-300 pb-1.5">
                                        <span>
                                          Underlying Invoices ({it.itemName} — {it.quality})
                                        </span>
                                        <span className="font-mono text-gray-600 text-sm">
                                          {it.lines.length} invoice line{it.lines.length > 1 ? 's' : ''}
                                        </span>
                                      </div>

                                      <table className="w-full text-sm border-collapse border border-gray-400 bg-white">
                                        <thead className="bg-[#EBE9E4] text-gray-800">
                                          <tr>
                                            <th className="border border-gray-400 px-3 py-1.5 w-28 text-sm font-bold">Date</th>
                                            <th className="border border-gray-400 px-3 py-1.5 w-32 text-sm font-bold">Invoice #</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-center w-28 text-sm font-bold">Unit / Nugs</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-right w-28 text-sm font-bold">Weight (KG)</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-right w-28 text-sm font-bold">Rate (Rs)</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-right w-32 text-sm font-bold">Amount (PKR)</th>
                                          </tr>
                                        </thead>
                                        <tbody className="tabular-nums">
                                          {it.lines.map((ln, lnIdx) => (
                                            <tr key={lnIdx} className="hover:bg-yellow-50/50">
                                              <td className="border border-gray-400 px-3 py-1.5 font-mono text-sm">
                                                {formatDate(ln.date)}
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 font-mono font-bold text-[#1E3A5F] text-sm">
                                                {ln.invoiceNo}
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 text-center font-mono text-sm">
                                                {ln.unitType === 'Nug' || ln.nugs > 0 ? (
                                                  <span className="font-bold text-[#A52A2A]">
                                                    {ln.nugs || 0} Nug
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-600">KG</span>
                                                )}
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 text-right font-mono font-bold text-sm">
                                                {ln.qty.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 text-right font-mono text-sm">
                                                {fmtNum(ln.rate)}
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 text-right font-mono font-bold text-gray-900 text-sm">
                                                {fmt(ln.amount)}
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
                        })}

                        {/* Subtotal row per party in "All parties" mode */}
                        {!isSingleParty && (
                          <tr className="bg-[#DFDFDF] font-bold border-b-2 border-black">
                            <td
                              colSpan={4}
                              className="border border-black px-3.5 py-2 text-right uppercase text-gray-900 text-base font-bold"
                            >
                              Subtotal ({pg.partyName}):
                            </td>
                            <td className="border border-black px-3.5 py-2 text-right font-mono font-bold text-base tabular-nums">
                              {pg.totalQty.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                            </td>
                            <td className="border border-black px-3.5 py-2 text-right font-mono text-gray-900 text-base tabular-nums">
                              {fmtNum(pg.avgRate)}
                            </td>
                            <td className="border border-black px-3.5 py-2 text-right font-mono font-bold text-[#1E3A5F] text-base tabular-nums">
                              {fmt(pg.totalAmount)}
                            </td>
                            <td className="border border-black px-3.5 py-2 text-center font-mono text-base font-bold">
                              {pg.invoicesCount}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>

              {/* Grand Totals Footer */}
              {partyQualityGroups.length > 0 && (
                <tfoot className="bg-[#DFDFDF] font-bold border-t-2 border-black">
                  <tr>
                    <td
                      colSpan={selectedPartyId ? 3 : 4}
                      className="border border-black px-3.5 py-2.5 text-right uppercase text-black font-extrabold text-[17px]"
                    >
                      {selectedPartyId ? 'Party Total Quality Summary:' : 'Grand Quality Summary (All Parties):'}
                    </td>
                    <td className="border border-black px-3.5 py-2.5 text-right font-mono font-extrabold text-gray-900 text-[17px] tabular-nums">
                      {partyQualityTotals.totalQty.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      kg
                    </td>
                    <td className="border border-black px-3.5 py-2.5 text-right font-mono font-bold text-gray-800 text-[17px] tabular-nums">
                      {fmtNum(partyQualityTotals.avgRate)}
                    </td>
                    <td className="border border-black px-3.5 py-2.5 text-right font-mono font-extrabold text-[17px] text-[#1E3A5F] tabular-nums">
                      {fmt(partyQualityTotals.totalAmount)}
                    </td>
                    <td className="border border-black px-3.5 py-2.5 text-center font-mono font-bold text-[17px]">
                      {partyQualityTotals.invoicesCount}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
            /* =========================================================
               VIEW 2: QUALITY → PARTY TABLE
               ========================================================= */
            <table className="w-full text-base border-collapse border border-black" dir="rtl" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead className="bg-[#DFDFDF] sticky top-0 z-10 border-b-2 border-black">
                <tr>
                  <th className="border border-black px-3 py-2.5 w-12 text-center text-base font-bold">#</th>
                  <th className="border border-black px-3.5 py-2.5 text-base font-bold">{partyLabel} Name</th>
                  <th className="border border-black px-3.5 py-2.5 text-right w-36 text-base font-bold">Total Qty (KG)</th>
                  <th className="border border-black px-3.5 py-2.5 text-right w-32 text-base font-bold">Avg Rate (Rs)</th>
                  <th className="border border-black px-3.5 py-2.5 text-right w-40 text-base font-bold">Total Amount (PKR)</th>
                  <th className="border border-black px-3.5 py-2.5 text-center w-32 text-base font-bold">Invoices</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {qualityPartyGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500 font-bold border border-black text-base">
                      No records for this selection
                    </td>
                  </tr>
                ) : (
                  qualityPartyGroups.map((pg, idx) => {
                    const rowKey = `quality_party___${pg.partyId || pg.partyName}`;
                    const isExpanded = Boolean(expandedRows[rowKey]);

                    return (
                      <React.Fragment key={rowKey}>
                        <tr
                          onClick={() => toggleRow(rowKey)}
                          className={`cursor-pointer transition-colors ${
                            isExpanded
                              ? 'bg-amber-50/70 font-semibold'
                              : idx % 2 === 0
                              ? 'bg-white hover:bg-blue-50/40'
                              : 'bg-[#FAF9F7] hover:bg-blue-50/40'
                          }`}
                        >
                          <td className="border border-black px-2.5 py-2.5 text-center text-gray-600 font-mono text-base">
                            <div className="flex items-center justify-center gap-1">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-amber-700" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                              )}
                              <span>{idx + 1}</span>
                            </div>
                          </td>
                          <td className="border border-black px-3.5 py-2.5 font-bold text-gray-900 text-base">
                            {pg.partyName}
                          </td>
                          <td className="border border-black px-3.5 py-2.5 text-right font-mono font-bold text-gray-900 text-base tabular-nums">
                            {pg.totalQty.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                            <span className="text-gray-600 font-normal text-sm">kg</span>
                          </td>
                          <td className="border border-black px-3.5 py-2.5 text-right font-mono text-gray-800 text-base tabular-nums">
                            {fmtNum(pg.avgRate)}
                          </td>
                          <td className="border border-black px-3.5 py-2.5 text-right font-mono font-bold text-[#1E3A5F] text-base tabular-nums">
                            {fmt(pg.totalAmount)}
                          </td>
                          <td className="border border-black px-3.5 py-2.5 text-center font-mono">
                            <span className="bg-blue-50 border border-blue-400 px-2 py-0.5 rounded text-xs font-bold text-[#1E3A5F]">
                              {pg.invoicesCount} {pg.invoicesCount === 1 ? 'inv' : 'invs'}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded Invoices for this party */}
                        {isExpanded && (
                          <tr className="bg-[#FFFDF7]">
                            <td colSpan={6} className="border border-black p-3.5 bg-amber-50/30">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm font-bold text-gray-800 border-b border-gray-300 pb-1.5">
                                  <span>
                                    Underlying Invoices for {pg.partyName}
                                  </span>
                                  <span className="font-mono text-gray-600 text-sm">
                                    {pg.lines.length} invoice line{pg.lines.length > 1 ? 's' : ''}
                                  </span>
                                </div>

                                <table className="w-full text-sm border-collapse border border-gray-400 bg-white">
                                  <thead className="bg-[#EBE9E4] text-gray-800">
                                    <tr>
                                      <th className="border border-gray-400 px-3 py-1.5 w-28 text-sm font-bold">Date</th>
                                      <th className="border border-gray-400 px-3 py-1.5 w-32 text-sm font-bold">Invoice #</th>
                                      <th className="border border-gray-400 px-3 py-1.5 text-sm font-bold">Item &amp; Quality</th>
                                      <th className="border border-gray-400 px-3 py-1.5 text-center w-28 text-sm font-bold">Unit / Nugs</th>
                                      <th className="border border-gray-400 px-3 py-1.5 text-right w-28 text-sm font-bold">Weight (KG)</th>
                                      <th className="border border-gray-400 px-3 py-1.5 text-right w-28 text-sm font-bold">Rate (Rs)</th>
                                      <th className="border border-gray-400 px-3 py-1.5 text-right w-32 text-sm font-bold">Amount (PKR)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="tabular-nums">
                                    {pg.lines.map((ln, lnIdx) => (
                                      <tr key={lnIdx} className="hover:bg-yellow-50/50">
                                        <td className="border border-gray-400 px-3 py-1.5 font-mono text-sm">
                                          {formatDate(ln.date)}
                                        </td>
                                        <td className="border border-gray-400 px-3 py-1.5 font-mono font-bold text-[#1E3A5F] text-sm">
                                          {ln.invoiceNo}
                                        </td>
                                        <td className="border border-gray-400 px-3 py-1.5 text-sm">
                                          <span className="font-bold">{ln.itemName}</span>{' '}
                                          <span className="bg-gray-100 border border-gray-400 px-1.5 py-0.5 text-xs font-mono font-bold">
                                            {ln.quality}
                                          </span>
                                        </td>
                                        <td className="border border-gray-400 px-3 py-1.5 text-center font-mono text-sm">
                                          {ln.unitType === 'Nug' || ln.nugs > 0 ? (
                                            <span className="font-bold text-[#A52A2A]">
                                              {ln.nugs || 0} Nug
                                            </span>
                                          ) : (
                                            <span className="text-gray-600">KG</span>
                                          )}
                                        </td>
                                        <td className="border border-gray-400 px-3 py-1.5 text-right font-mono font-bold text-sm">
                                          {ln.qty.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                                        </td>
                                        <td className="border border-gray-400 px-3 py-1.5 text-right font-mono text-sm">
                                          {fmtNum(ln.rate)}
                                        </td>
                                        <td className="border border-gray-400 px-3 py-1.5 text-right font-mono font-bold text-gray-900 text-sm">
                                          {fmt(ln.amount)}
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

              {/* Grand Totals Footer */}
              {qualityPartyGroups.length > 0 && (
                <tfoot className="bg-[#DFDFDF] font-bold border-t-2 border-black">
                  <tr>
                    <td colSpan={2} className="border border-black px-3.5 py-2.5 text-right uppercase text-black font-extrabold text-[17px]">
                      Total {partyPluralLabel} Summary:
                    </td>
                    <td className="border border-black px-3.5 py-2.5 text-right font-mono font-extrabold text-gray-900 text-[17px] tabular-nums">
                      {qualityPartyTotals.totalQty.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      kg
                    </td>
                    <td className="border border-black px-3.5 py-2.5 text-right font-mono font-bold text-gray-800 text-[17px] tabular-nums">
                      {fmtNum(qualityPartyTotals.avgRate)}
                    </td>
                    <td className="border border-black px-3.5 py-2.5 text-right font-mono font-extrabold text-[17px] text-[#1E3A5F] tabular-nums">
                      {fmt(qualityPartyTotals.totalAmount)}
                    </td>
                    <td className="border border-black px-3.5 py-2.5 text-center font-mono font-bold text-[17px]">
                      {qualityPartyTotals.invoicesCount}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* ── Reconciliation Footer Box ───────────────────────────────── */}
        <div className="p-3.5 bg-[#F9F8F6] border-t-2 border-black space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-extrabold text-[#1E3A5F] uppercase tracking-wide">
                Audit Reconciliation:
              </span>
              <span className="font-mono text-gray-800 text-sm">
                Grouped Stock Items Total:{' '}
                <strong className="text-black">{fmt(displayedGroupedTotal)}</strong>
              </span>

              {targetReconciliationServiceTotal > 0 && (
                <>
                  <span className="text-gray-400">+</span>
                  <span className="font-mono text-gray-800 text-sm">
                    Service / Other Lines:{' '}
                    <strong className="text-black">{fmt(targetReconciliationServiceTotal)}</strong>
                  </span>
                  <span className="text-gray-400">=</span>
                  <span className="font-mono text-gray-800 font-bold text-sm">
                    Combined:{' '}
                    <strong className="text-[#1E3A5F]">{fmt(combinedGroupedPlusServices)}</strong>
                  </span>
                </>
              )}

              <span className="text-gray-400">vs</span>
              <span className="font-mono text-gray-800 text-sm">
                Invoice-wise Total:{' '}
                <strong className="text-[#1E3A5F]">{fmt(targetReconciliationInvoiceTotal)}</strong>
              </span>
            </div>

            {/* Reconciliation Status Badge */}
            <div className="flex items-center gap-1.5">
              {isReconciled ? (
                <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-600 text-emerald-800 px-2.5 py-1 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Matches invoice-wise item total: ✓</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-600 text-amber-900 px-2.5 py-1 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>
                    Difference: {fmt(targetReconciliationInvoiceTotal - combinedGroupedPlusServices)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-600 italic">
            * Weighted average rates are accurately computed as Σ Amount ÷ Σ KG Quantity across all underlying invoice lines.
            {targetReconciliationServiceTotal > 0 && ' Service lines contain no physical quality grade and are reconciled separately.'}
          </div>
        </div>

        {/* ── Printable Closing Footer & Signatures (A4 Standard) ─────── */}
        <div
          className="hidden print:block p-4 border-t-2 border-black"
          style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
        >
          {/* Audit Line */}
          <div className="flex items-center justify-between text-xs text-gray-700 border-b border-gray-400 pb-2 mb-6 print-note-text">
            <div className="flex items-center gap-2">
              <span>
                Printed on: <strong className="font-mono">{printTimestamp}</strong>
              </span>
              <span>·</span>
              <span>
                Printed by: <strong>{legalName}</strong>
              </span>
              <span>·</span>
              <span>
                System: <strong>Yaseen Merchants Offline Accounting</strong>
              </span>
            </div>
            <div>{address}</div>
          </div>

          {/* 3-Column Signatures Block */}
          <div className="grid grid-cols-3 gap-6 text-center text-sm text-gray-700 pt-2">
            <div className="flex flex-col items-center">
              <div className="w-44 max-w-full h-8 border-b-2 border-gray-600 mb-1.5" />
              <div className="font-bold text-gray-800 uppercase tracking-wide text-sm">
                Prepared By
              </div>
              <div className="text-xs text-gray-600 mt-0.5 print-note-text">Accountant / Data Operator</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-44 max-w-full h-8 border-b-2 border-gray-600 mb-1.5" />
              <div className="font-bold text-gray-800 uppercase tracking-wide text-sm">
                Verified By
              </div>
              <div className="text-xs text-gray-600 mt-0.5 print-note-text">Accounts Department</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-44 max-w-full h-8 border-b-2 border-gray-600 mb-1.5" />
              <div className="font-bold text-gray-800 uppercase tracking-wide text-sm">
                Authorized Signature
              </div>
              <div className="text-xs text-gray-600 mt-0.5 print-note-text">Proprietor / {legalName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
