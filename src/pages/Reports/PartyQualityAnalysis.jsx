import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Search,
  Users,
  Layers,
} from 'lucide-react';
import PrintHeader from '../../components/common/PrintHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import { safePrint } from '../../utils/printUtils.js';
import { fmt, fmtNum, formatDate, getTodayStr } from '../../utils/formatters.js';
import { useCompanyProfile } from '../../context/CompanyProfileContext.jsx';

/**
 * PartyQualityAnalysis component for Reports.jsx
 * Quality = Item itself (سوکس ویسٹ, قلیس, کومبر).
 *
 * Supports two analysis modes:
 * 1. 'party_quality': Party → Quality (For a party, which quality/item was bought/sold and how much)
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
  const urduPartyLabel = isPurchase ? 'سپلائر' : 'گاہک';

  // Filters state - BOTH selectors visible in BOTH modes
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');

  // Expandable row state: map of rowKey -> boolean
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (key) => {
    setExpandedRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 1. Flatten invoices into line items
  // Business definition: Quality means the Item name itself (سوکس ویسٹ, قلیس, etc.)
  const {
    flattenedLines,
    qualityLines,
    serviceLines,
    invoicesGrandTotal,
  } = useMemo(() => {
    const flat = [];
    let invTotal = 0;

    invoices.forEach((inv) => {
      invTotal += Number(inv.total || 0);
      const partyId = isPurchase ? (inv.supplierId || '') : (inv.customerId || '');
      const partyName = isPurchase
        ? (inv.supplierName || 'نامعلوم سپلائر')
        : (inv.customerName || 'نامعلوم گاہک');
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
        const qualityName = isService
          ? (it.serviceDescription?.trim() || 'Service Line')
          : ((it.itemName || it.quality || '').trim() || 'آئٹم');
        const itemId = it.itemId || it.id || '';
        const itemName = qualityName;

        flat.push({
          lineId: `${inv.id || invNo}_${idx}`,
          invoiceId: inv.id,
          invoiceNo: invNo,
          date: invDate,
          partyId,
          partyName,
          warehouseName: inv.warehouseName || '',
          itemId,
          itemName,
          quality: qualityName,
          unitType,
          nugs,
          qty,
          rate,
          amount,
          isService,
        });
      });
    });

    const qual = flat.filter((l) => !l.isService);
    const serv = flat.filter((l) => l.isService);

    return {
      flattenedLines: flat,
      qualityLines: qual,
      serviceLines: serv,
      invoicesGrandTotal: invTotal,
    };
  }, [invoices, isPurchase]);

  // Distinct qualities (items) from catalog items + transaction lines
  const availableQualities = useMemo(() => {
    const set = new Set();
    items.forEach((i) => i.name && set.add(i.name.trim()));
    qualityLines.forEach((l) => l.quality && set.add(l.quality.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ur'));
  }, [items, qualityLines]);

  // Relevant parties for selector
  const relevantParties = useMemo(() => {
    const list = parties.filter((p) =>
      isPurchase ? p.type === 'Supplier' || p.type === 'Both' : p.type === 'Customer' || p.type === 'Both'
    );
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ur'));
  }, [parties, isPurchase]);

  // Filtered party list for Party selector (searchable)
  const filteredPartyOptions = useMemo(() => {
    if (!partySearchQuery) return relevantParties;
    const q = partySearchQuery.toLowerCase();
    return relevantParties.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q))
    );
  }, [relevantParties, partySearchQuery]);

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
    if (selectedQuality) {
      targetLines = targetLines.filter(
        (l) => l.quality.toLowerCase() === selectedQuality.toLowerCase()
      );
    }

    // Group by Party first
    const partyMap = new Map();

    targetLines.forEach((line) => {
      const pKey = line.partyId || line.partyName;
      if (!partyMap.has(pKey)) {
        partyMap.set(pKey, {
          partyId: line.partyId,
          partyName: line.partyName,
          qualitiesMap: new Map(),
          totalQty: 0,
          totalAmount: 0,
          invoicesSet: new Set(),
        });
      }

      const pGroup = partyMap.get(pKey);
      pGroup.totalQty += line.qty;
      pGroup.totalAmount += line.amount;
      pGroup.invoicesSet.add(line.invoiceNo);

      // Group by Quality (Item) under this party
      const qKey = line.quality;
      if (!pGroup.qualitiesMap.has(qKey)) {
        pGroup.qualitiesMap.set(qKey, {
          qualityKey: qKey,
          quality: line.quality,
          lines: [],
          totalQty: 0,
          totalAmount: 0,
          invoicesSet: new Set(),
        });
      }

      const qGroup = pGroup.qualitiesMap.get(qKey);
      qGroup.lines.push(line);
      qGroup.totalQty += line.qty;
      qGroup.totalAmount += line.amount;
      qGroup.invoicesSet.add(line.invoiceNo);
    });

    // Convert map to structured array
    const result = Array.from(partyMap.values()).map((p) => {
      const qualityRows = Array.from(p.qualitiesMap.values()).map((q) => ({
        ...q,
        avgRate: q.totalQty > 0 ? q.totalAmount / q.totalQty : 0,
        invoicesCount: q.invoicesSet.size,
      }));

      // Sort qualities by quantity descending
      qualityRows.sort((a, b) => b.totalQty - a.totalQty);

      return {
        ...p,
        qualityRows,
        avgRate: p.totalQty > 0 ? p.totalAmount / p.totalQty : 0,
        invoicesCount: p.invoicesSet.size,
      };
    });

    // Sort parties alphabetically
    result.sort((a, b) => (a.partyName || '').localeCompare(b.partyName || '', 'ur'));
    return result;
  }, [mode, qualityLines, selectedPartyId, partySearchQuery, selectedQuality]);

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
    if (selectedPartyId) {
      targetLines = targetLines.filter((l) => l.partyId === selectedPartyId);
    } else if (partySearchQuery) {
      const q = partySearchQuery.toLowerCase();
      targetLines = targetLines.filter((l) => l.partyName.toLowerCase().includes(q));
    }

    // Group by Quality first
    const qualityMap = new Map();

    targetLines.forEach((line) => {
      const qKey = line.quality;
      if (!qualityMap.has(qKey)) {
        qualityMap.set(qKey, {
          quality: line.quality,
          partiesMap: new Map(),
          totalQty: 0,
          totalAmount: 0,
          invoicesSet: new Set(),
        });
      }

      const qGroup = qualityMap.get(qKey);
      qGroup.totalQty += line.qty;
      qGroup.totalAmount += line.amount;
      qGroup.invoicesSet.add(line.invoiceNo);

      // Group by Party under this quality
      const pKey = line.partyId || line.partyName;
      if (!qGroup.partiesMap.has(pKey)) {
        qGroup.partiesMap.set(pKey, {
          partyId: line.partyId,
          partyName: line.partyName,
          lines: [],
          totalQty: 0,
          totalAmount: 0,
          invoicesSet: new Set(),
        });
      }

      const pGroup = qGroup.partiesMap.get(pKey);
      pGroup.lines.push(line);
      pGroup.totalQty += line.qty;
      pGroup.totalAmount += line.amount;
      pGroup.invoicesSet.add(line.invoiceNo);
    });

    // Convert map to structured array
    const result = Array.from(qualityMap.values()).map((q) => {
      const partyRows = Array.from(q.partiesMap.values()).map((p) => ({
        ...p,
        avgRate: p.totalQty > 0 ? p.totalAmount / p.totalQty : 0,
        invoicesCount: p.invoicesSet.size,
      }));

      // Sort parties by quantity descending
      partyRows.sort((a, b) => b.totalQty - a.totalQty);

      return {
        ...q,
        partyRows,
        avgRate: q.totalQty > 0 ? q.totalAmount / q.totalQty : 0,
        invoicesCount: q.invoicesSet.size,
      };
    });

    // Sort qualities alphabetically
    result.sort((a, b) => (a.quality || '').localeCompare(b.quality || '', 'ur'));
    return result;
  }, [mode, qualityLines, selectedQuality, selectedPartyId, partySearchQuery]);

  // Overall totals for Quality → Party
  const qualityPartyTotals = useMemo(() => {
    let qty = 0;
    let amount = 0;
    const invSet = new Set();

    qualityPartyGroups.forEach((qg) => {
      qty += qg.totalQty;
      amount += qg.totalAmount;
      qg.invoicesSet.forEach((no) => invSet.add(no));
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
  const activeTotals = mode === 'party_quality' ? partyQualityTotals : qualityPartyTotals;
  const displayedGroupedTotal = activeTotals.totalAmount;

  // Filtered invoices subset matching current active filters (party + quality)
  const filteredInvoicesSubset = useMemo(() => {
    return invoices.filter((inv) => {
      const partyId = isPurchase ? inv.supplierId : inv.customerId;
      const partyName = isPurchase ? inv.supplierName : inv.customerName;

      if (selectedPartyId && partyId !== selectedPartyId) return false;
      if (partySearchQuery && !partyName?.toLowerCase().includes(partySearchQuery.toLowerCase())) {
        return false;
      }
      if (selectedQuality) {
        const hasQuality = (inv.items || []).some(
          (it) => it.type !== 'service' && (it.itemName || it.quality || '').trim().toLowerCase() === selectedQuality.toLowerCase()
        );
        if (!hasQuality) return false;
      }
      return true;
    });
  }, [invoices, isPurchase, selectedPartyId, partySearchQuery, selectedQuality]);

  // Invoice subset total for the same filter
  const targetReconciliationInvoiceTotal = useMemo(() => {
    // If filtering by quality specifically, calculate sum of lines matching that quality
    if (selectedQuality) {
      let sum = 0;
      filteredInvoicesSubset.forEach((inv) => {
        (inv.items || []).forEach((it) => {
          if (it.type !== 'service' && (it.itemName || it.quality || '').trim().toLowerCase() === selectedQuality.toLowerCase()) {
            const q = Number(it.qty ?? it.weight ?? 0);
            const r = Number(it.rate || 0);
            sum += Number(it.amount !== undefined ? it.amount : q * r);
          }
        });
      });
      return sum;
    }

    // Otherwise if filtering by party or all, sum of invoices
    return filteredInvoicesSubset.reduce((s, inv) => s + Number(inv.total || 0), 0);
  }, [filteredInvoicesSubset, selectedQuality]);

  // Matching service lines for party
  const matchingServiceTotal = useMemo(() => {
    if (selectedQuality) return 0; // Quality filter focuses purely on that physical quality
    return serviceLines
      .filter((l) => {
        if (selectedPartyId && l.partyId !== selectedPartyId) return false;
        if (partySearchQuery && !l.partyName.toLowerCase().includes(partySearchQuery.toLowerCase())) {
          return false;
        }
        return true;
      })
      .reduce((s, l) => s + l.amount, 0);
  }, [serviceLines, selectedQuality, selectedPartyId, partySearchQuery]);

  const combinedGroupedPlusServices = displayedGroupedTotal + matchingServiceTotal;
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
        'Quality (Item)',
        'Quantity (KG)',
        'Weighted Avg Rate (Rs)',
        'Total Amount (PKR)',
        'Invoice Count',
      ];

      partyQualityGroups.forEach((pg) => {
        pg.qualityRows.forEach((q) => {
          rows.push([
            `"${pg.partyName}"`,
            `"${q.quality}"`,
            q.totalQty.toFixed(2),
            q.avgRate.toFixed(2),
            q.totalAmount.toFixed(2),
            q.invoicesCount,
          ]);
        });
      });

      // Totals row
      rows.push([
        '"TOTAL"',
        '""',
        partyQualityTotals.totalQty.toFixed(2),
        partyQualityTotals.avgRate.toFixed(2),
        partyQualityTotals.totalAmount.toFixed(2),
        partyQualityTotals.invoicesCount,
      ]);
    } else {
      filename = `${type}_quality_party_analysis_${dateStr}.csv`;
      headers = [
        'Quality (Item)',
        partyLabel,
        'Quantity (KG)',
        'Weighted Avg Rate (Rs)',
        'Total Amount (PKR)',
        'Invoice Count',
      ];

      qualityPartyGroups.forEach((qg) => {
        qg.partyRows.forEach((p) => {
          rows.push([
            `"${qg.quality}"`,
            `"${p.partyName}"`,
            p.totalQty.toFixed(2),
            p.avgRate.toFixed(2),
            p.totalAmount.toFixed(2),
            p.invoicesCount,
          ]);
        });
      });

      // Totals row
      rows.push([
        '"TOTAL"',
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

  // Timestamp for print footer (dd/mm/yyyy)
  const now = new Date();
  const printTimestamp = `${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <div className="space-y-4">
      {/* ── Top Controls & Filter Toolbar ────────────────────────────── */}
      <div className="bg-[#FAF9F7] p-3 border-2 border-black space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Mode Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onModeChange && onModeChange('party_quality')}
              className={`px-3 py-1.5 text-xs font-bold border border-black cursor-pointer transition-colors flex items-center gap-1.5 ${
                mode === 'party_quality'
                  ? 'bg-[#1E3A5F] text-white shadow-sm'
                  : 'bg-white text-gray-800 hover:bg-gray-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Party → Quality (پارٹی وار)</span>
            </button>
            <button
              type="button"
              onClick={() => onModeChange && onModeChange('quality_party')}
              className={`px-3 py-1.5 text-xs font-bold border border-black cursor-pointer transition-colors flex items-center gap-1.5 ${
                mode === 'quality_party'
                  ? 'bg-[#1E3A5F] text-white shadow-sm'
                  : 'bg-white text-gray-800 hover:bg-gray-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Quality → Party (کوالٹی وار)</span>
            </button>
            <span className="text-xs text-gray-500 font-medium ms-1">
              ({isPurchase ? 'خریداری انوائسز' : 'فروخت انوائسز'})
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
              پرنٹ رپورٹ (Print)
            </Button>
          </div>
        </div>

        {/* Dynamic Dual Filters: Both Party & Quality available in both modes */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-300 text-xs">
          {/* 1. Party Selector (Searchable) */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[240px] max-w-sm">
            <span className="font-bold text-gray-900 whitespace-nowrap">{partyLabel} (پارٹی):</span>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="bg-white border border-black px-2 py-1 text-xs outline-none flex-1 font-semibold"
            >
              <option value="">All parties (تمام پارٹیاں) ({relevantParties.length})</option>
              {filteredPartyOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.city ? `(${p.city})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Party Search Input */}
          <div className="flex items-center gap-1 w-48">
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
                className="text-gray-500 hover:text-red-700 font-bold px-1 cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* 2. Quality (Item) Selector */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[220px] max-w-sm">
            <span className="font-bold text-gray-900 whitespace-nowrap">Quality / Item (کوالٹی):</span>
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              className="bg-white border border-black px-2 py-1 text-xs outline-none flex-1 font-semibold"
            >
              <option value="">All qualities (تمام کوالٹیز) ({availableQualities.length})</option>
              {availableQualities.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
            {selectedQuality && (
              <button
                type="button"
                onClick={() => setSelectedQuality('')}
                className="text-gray-500 hover:text-red-700 font-bold px-1 cursor-pointer"
                title="Clear quality filter"
              >
                ×
              </button>
            )}
          </div>

          {/* Active Date Range Indicator */}
          <div className="ms-auto text-gray-700 font-mono text-xs bg-white border border-gray-300 px-2.5 py-1 font-semibold" dir="ltr">
            {dateFrom ? formatDate(dateFrom) : 'Start'} → {dateTo ? formatDate(dateTo) : 'Present'}
          </div>
        </div>
      </div>

      {/* ── Main Printable Container ─────────────────────────────────── */}
      <div id="party-quality-print-area" className="report-rtl bg-white border-2 border-black w-full max-w-[1400px] mx-auto flex flex-col" dir="rtl" style={{ minHeight: '440px' }}>
        {/* Printable Official Header */}
        <PrintHeader
          documentTitle={
            isPurchase
              ? 'Purchase Report - Party wise / Quality wise'
              : 'Sale Report - Party wise / Quality wise'
          }
          urduTitle={
            isPurchase
              ? 'خریداری رپورٹ - پارٹی وار / کوالٹی وار'
              : 'فروخت رپورٹ - پارٹی وار / کوالٹی وار'
          }
          subtitle={`Official ${isPurchase ? 'Procurement' : 'Revenue'} breakdown by party and quality (items) derived directly from ledger transactions`}
          partyName={
            selectedPartyObj
              ? `${selectedPartyObj.name} (${selectedPartyObj.city || ''})`
              : selectedQuality
              ? `Quality / Item: ${selectedQuality}`
              : 'All Parties / All Qualities'
          }
          dateStr={
            dateFrom || dateTo
              ? `${dateFrom ? formatDate(dateFrom) : 'All time'} to ${dateTo ? formatDate(dateTo) : 'Present'}`
              : 'All Available Records'
          }
        />

        {/* Screen Header Bar */}
        <div className="p-3 border-b-2 border-black bg-[#FAF9F7] flex flex-wrap justify-between items-center text-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-urdu text-lg font-bold text-black">
              {mode === 'party_quality'
                ? selectedPartyId
                  ? `${selectedPartyObj?.name || 'منتخب پارٹی'} — کوالٹی وار تفصیل (Quality Breakdown)`
                  : `تمام ${isPurchase ? 'سپلائرز' : 'گاہک'} — پارٹی وار کوالٹی جائزہ`
                : selectedQuality
                ? `کوالٹی "${selectedQuality}" — ${urduPartyLabel} وار تفصیل`
                : `تمام کوالٹیز (آئٹمز) — پارٹی وار جائزہ`}
            </span>
            {selectedQuality && (
              <span className="bg-[#FFEB3B] border border-black px-2 py-0.5 text-xs font-bold text-black">
                {selectedQuality}
              </span>
            )}
          </div>
          <span className="font-mono text-gray-700 text-sm font-semibold" dir="ltr">
            {mode === 'party_quality'
              ? `${partyQualityGroups.length} parties grouped`
              : `${qualityPartyGroups.length} qualities grouped`}
          </span>
        </div>

        {/* ── Table Layout ────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 min-h-0 w-full">
          {mode === 'party_quality' ? (
            /* =========================================================
               VIEW 1: PARTY → QUALITY TABLE
               ========================================================= */
            <table className="w-full text-base border-collapse border border-black" dir="rtl" style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '6%' }} />
                {!selectedPartyId && <col style={{ width: '24%' }} />}
                <col style={{ width: selectedPartyId ? '34%' : '24%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead className="bg-[#DFDFDF] sticky top-0 z-10 border-b-2 border-black">
                <tr>
                  <th className="border border-black px-2.5 py-2.5 text-center text-base font-bold">#</th>
                  {!selectedPartyId && (
                    <th className="border border-black px-3.5 py-2.5 text-start text-base font-bold font-urdu">{partyLabel} (پارٹی)</th>
                  )}
                  <th className="border border-black px-3.5 py-2.5 text-start text-base font-bold font-urdu">کوالٹی / آئٹم (Quality)</th>
                  <th className="border border-black px-3.5 py-2.5 text-left text-base font-bold" dir="ltr">Total Qty (KG)</th>
                  <th className="border border-black px-3.5 py-2.5 text-left text-base font-bold" dir="ltr">Avg Rate (Rs)</th>
                  <th className="border border-black px-3.5 py-2.5 text-left text-base font-bold" dir="ltr">Total Amount (PKR)</th>
                  <th className="border border-black px-3.5 py-2.5 text-center text-base font-bold font-urdu">انوائسز (Invoices)</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {partyQualityGroups.length === 0 ? (
                  <tr>
                    <td
                      colSpan={selectedPartyId ? 6 : 7}
                      className="text-center py-8 text-gray-500 font-bold border border-black text-base"
                    >
                      No records matching the selected party or quality filter
                    </td>
                  </tr>
                ) : (
                  partyQualityGroups.map((pg) => {
                    const isSingleParty = Boolean(selectedPartyId);

                    return (
                      <React.Fragment key={pg.partyId || pg.partyName}>
                        {/* If "All parties", render a prominent Party Header */}
                        {!isSingleParty && (
                          <tr className="bg-[#F2F0EC] border-b border-black font-bold">
                            <td
                              colSpan={7}
                              className="border border-black px-3.5 py-2.5 text-base text-[#1E3A5F] tracking-wide"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold font-urdu text-lg text-black">
                                  {partyLabel}: {pg.partyName}
                                </span>
                                <span className="font-mono text-gray-800 text-sm font-semibold" dir="ltr">
                                  {pg.qualityRows.length} item{pg.qualityRows.length > 1 ? 's' : ''} • Total: {fmt(pg.totalAmount)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Quality Rows for this party */}
                        {pg.qualityRows.map((qRow, qIdx) => {
                          const rowKey = `${pg.partyId || pg.partyName}___${qRow.qualityKey}`;
                          const isExpanded = Boolean(expandedRows[rowKey]);

                          return (
                            <React.Fragment key={rowKey}>
                              <tr
                                onClick={() => toggleRow(rowKey)}
                                className={`cursor-pointer transition-colors ${
                                  isExpanded
                                    ? 'bg-amber-50/70 font-semibold'
                                    : qIdx % 2 === 0
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
                                    <span>{qIdx + 1}</span>
                                  </div>
                                </td>
                                {!selectedPartyId && (
                                  <td className="border border-black px-3.5 py-2.5 text-gray-900 font-medium text-base">
                                    {pg.partyName}
                                  </td>
                                )}
                                <td className="border border-black px-3.5 py-2.5 font-bold text-gray-900 text-base font-urdu">
                                  {qRow.quality}
                                </td>
                                <td className="border border-black px-3.5 py-2.5 text-left font-mono font-bold text-gray-900 text-base tabular-nums" dir="ltr">
                                  {qRow.totalQty.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                                  <span className="text-gray-600 font-normal text-sm">kg</span>
                                </td>
                                <td className="border border-black px-3.5 py-2.5 text-left font-mono text-gray-800 text-base tabular-nums" dir="ltr">
                                  {fmtNum(qRow.avgRate)}
                                </td>
                                <td className="border border-black px-3.5 py-2.5 text-left font-mono font-bold text-[#1E3A5F] text-base tabular-nums" dir="ltr">
                                  {fmt(qRow.totalAmount)}
                                </td>
                                <td className="border border-black px-3.5 py-2.5 text-center font-mono">
                                  <span className="bg-blue-50 border border-blue-400 px-2 py-0.5 rounded text-xs font-bold text-[#1E3A5F]">
                                    {qRow.invoicesCount} {qRow.invoicesCount === 1 ? 'inv' : 'invs'}
                                  </span>
                                </td>
                              </tr>

                              {/* Expanded Invoices Sub-table */}
                              {isExpanded && (
                                <tr className="bg-[#FFFDF7]">
                                  <td
                                    colSpan={selectedPartyId ? 6 : 7}
                                    className="border border-black p-3.5 bg-amber-50/30"
                                  >
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-sm font-bold text-gray-800 border-b border-gray-300 pb-1.5">
                                        <span className="font-urdu text-base font-bold">
                                          انوائسز کی تفصیل — {pg.partyName} ({qRow.quality})
                                        </span>
                                        <span className="font-mono text-gray-600 text-sm" dir="ltr">
                                          {qRow.lines.length} invoice line{qRow.lines.length > 1 ? 's' : ''}
                                        </span>
                                      </div>

                                      <table className="w-full text-sm border-collapse border border-gray-400 bg-white">
                                        <thead className="bg-[#EBE9E4] text-gray-800">
                                          <tr>
                                            <th className="border border-gray-400 px-3 py-1.5 text-start text-sm font-bold">Date (dd/mm/yyyy)</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-start text-sm font-bold">Invoice #</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-start text-sm font-bold">Godown</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-center text-sm font-bold">Unit</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-left text-sm font-bold" dir="ltr">Weight (KG)</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-left text-sm font-bold" dir="ltr">Rate (Rs)</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-left text-sm font-bold" dir="ltr">Amount (PKR)</th>
                                          </tr>
                                        </thead>
                                        <tbody className="tabular-nums">
                                          {qRow.lines.map((ln, lnIdx) => (
                                            <tr key={lnIdx} className="hover:bg-yellow-50/50">
                                              <td className="border border-gray-400 px-3 py-1.5 font-mono text-sm text-start" dir="ltr">
                                                {formatDate(ln.date)}
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 font-mono font-bold text-[#1E3A5F] text-sm text-start" dir="ltr">
                                                {ln.invoiceNo}
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 text-gray-800 text-sm text-start">
                                                {ln.warehouseName || '-'}
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 text-center font-mono text-sm">
                                                <span className="text-gray-600">KG</span>
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 text-left font-mono font-bold text-sm" dir="ltr">
                                                {ln.qty.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 text-left font-mono text-sm" dir="ltr">
                                                {fmtNum(ln.rate)}
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 text-left font-mono font-bold text-gray-900 text-sm" dir="ltr">
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
                              colSpan={3}
                              className="border border-black px-3.5 py-2 text-start font-urdu text-base font-bold"
                            >
                              میزان سب ٹوٹل ({pg.partyName}):
                            </td>
                            <td className="border border-black px-3.5 py-2 text-left font-mono font-bold text-base tabular-nums" dir="ltr">
                              {pg.totalQty.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                            </td>
                            <td className="border border-black px-3.5 py-2 text-left font-mono text-gray-900 text-base tabular-nums" dir="ltr">
                              {fmtNum(pg.avgRate)}
                            </td>
                            <td className="border border-black px-3.5 py-2 text-left font-mono font-bold text-[#1E3A5F] text-base tabular-nums" dir="ltr">
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
                      colSpan={selectedPartyId ? 2 : 3}
                      className="border border-black px-3.5 py-2.5 text-start font-urdu font-bold text-[17px]"
                    >
                      {selectedPartyId ? 'پارٹی کا کل میزان (Party Total):' : 'کل میزان (Grand Total - All Parties):'}
                    </td>
                    <td className="border border-black px-3.5 py-2.5 text-left font-mono font-bold text-gray-950 text-[17px] tabular-nums" dir="ltr">
                      {partyQualityTotals.totalQty.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      kg
                    </td>
                    <td className="border border-black px-3.5 py-2.5 text-left font-mono font-bold text-gray-850 text-[17px] tabular-nums" dir="ltr">
                      {fmtNum(partyQualityTotals.avgRate)}
                    </td>
                    <td className="border border-black px-3.5 py-2.5 text-left font-mono font-bold text-[17px] text-[#1E3A5F] tabular-nums" dir="ltr">
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
              <colgroup>
                <col style={{ width: '6%' }} />
                {!selectedQuality && <col style={{ width: '24%' }} />}
                <col style={{ width: selectedQuality ? '34%' : '24%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead className="bg-[#DFDFDF] sticky top-0 z-10 border-b-2 border-black">
                <tr>
                  <th className="border border-black px-2.5 py-2.5 text-center text-base font-bold">#</th>
                  {!selectedQuality && (
                    <th className="border border-black px-3.5 py-2.5 text-start text-base font-bold font-urdu">کوالٹی / آئٹم (Quality)</th>
                  )}
                  <th className="border border-black px-3.5 py-2.5 text-start text-base font-bold font-urdu">{partyLabel} (پارٹی)</th>
                  <th className="border border-black px-3.5 py-2.5 text-left text-base font-bold" dir="ltr">Total Qty (KG)</th>
                  <th className="border border-black px-3.5 py-2.5 text-left text-base font-bold" dir="ltr">Avg Rate (Rs)</th>
                  <th className="border border-black px-3.5 py-2.5 text-left text-base font-bold" dir="ltr">Total Amount (PKR)</th>
                  <th className="border border-black px-3.5 py-2.5 text-center text-base font-bold font-urdu">انوائسز (Invoices)</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {qualityPartyGroups.length === 0 ? (
                  <tr>
                    <td colSpan={selectedQuality ? 6 : 7} className="text-center py-8 text-gray-500 font-bold border border-black text-base">
                      No records matching the selected quality or party filter
                    </td>
                  </tr>
                ) : (
                  qualityPartyGroups.map((qg) => {
                    const isSingleQuality = Boolean(selectedQuality);

                    return (
                      <React.Fragment key={qg.quality}>
                        {/* If "All qualities", render a Quality Header */}
                        {!isSingleQuality && (
                          <tr className="bg-[#F2F0EC] border-b border-black font-bold">
                            <td
                              colSpan={7}
                              className="border border-black px-3.5 py-2.5 text-base text-[#1E3A5F] tracking-wide"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold font-urdu text-lg text-black">
                                  کوالٹی / آئٹم: {qg.quality}
                                </span>
                                <span className="font-mono text-gray-800 text-sm font-semibold" dir="ltr">
                                  {qg.partyRows.length} {partyLabel.toLowerCase()}{qg.partyRows.length > 1 ? 's' : ''} • Total: {fmt(qg.totalAmount)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Parties for this quality */}
                        {qg.partyRows.map((pRow, pIdx) => {
                          const rowKey = `qp___${qg.quality}___${pRow.partyId || pRow.partyName}`;
                          const isExpanded = Boolean(expandedRows[rowKey]);

                          return (
                            <React.Fragment key={rowKey}>
                              <tr
                                onClick={() => toggleRow(rowKey)}
                                className={`cursor-pointer transition-colors ${
                                  isExpanded
                                    ? 'bg-amber-50/70 font-semibold'
                                    : pIdx % 2 === 0
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
                                    <span>{pIdx + 1}</span>
                                  </div>
                                </td>
                                {!selectedQuality && (
                                  <td className="border border-black px-3.5 py-2.5 text-gray-900 font-urdu text-base font-bold">
                                    {qg.quality}
                                  </td>
                                )}
                                <td className="border border-black px-3.5 py-2.5 font-bold text-gray-900 text-base">
                                  {pRow.partyName}
                                </td>
                                <td className="border border-black px-3.5 py-2.5 text-left font-mono font-bold text-gray-900 text-base tabular-nums" dir="ltr">
                                  {pRow.totalQty.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                                  <span className="text-gray-600 font-normal text-sm">kg</span>
                                </td>
                                <td className="border border-black px-3.5 py-2.5 text-left font-mono text-gray-800 text-base tabular-nums" dir="ltr">
                                  {fmtNum(pRow.avgRate)}
                                </td>
                                <td className="border border-black px-3.5 py-2.5 text-left font-mono font-bold text-[#1E3A5F] text-base tabular-nums" dir="ltr">
                                  {fmt(pRow.totalAmount)}
                                </td>
                                <td className="border border-black px-3.5 py-2.5 text-center font-mono">
                                  <span className="bg-blue-50 border border-blue-400 px-2 py-0.5 rounded text-xs font-bold text-[#1E3A5F]">
                                    {pRow.invoicesCount} {pRow.invoicesCount === 1 ? 'inv' : 'invs'}
                                  </span>
                                </td>
                              </tr>

                              {/* Expanded Invoices for this party */}
                              {isExpanded && (
                                <tr className="bg-[#FFFDF7]">
                                  <td colSpan={selectedQuality ? 6 : 7} className="border border-black p-3.5 bg-amber-50/30">
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-sm font-bold text-gray-800 border-b border-gray-300 pb-1.5">
                                        <span className="font-urdu text-base font-bold">
                                          انوائسز کی تفصیل — {pRow.partyName} ({qg.quality})
                                        </span>
                                        <span className="font-mono text-gray-600 text-sm" dir="ltr">
                                          {pRow.lines.length} invoice line{pRow.lines.length > 1 ? 's' : ''}
                                        </span>
                                      </div>

                                      <table className="w-full text-sm border-collapse border border-gray-400 bg-white">
                                        <thead className="bg-[#EBE9E4] text-gray-800">
                                          <tr>
                                            <th className="border border-gray-400 px-3 py-1.5 text-start text-sm font-bold">Date (dd/mm/yyyy)</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-start text-sm font-bold">Invoice #</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-start text-sm font-bold">Godown</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-center text-sm font-bold">Unit</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-left text-sm font-bold" dir="ltr">Weight (KG)</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-left text-sm font-bold" dir="ltr">Rate (Rs)</th>
                                            <th className="border border-gray-400 px-3 py-1.5 text-left text-sm font-bold" dir="ltr">Amount (PKR)</th>
                                          </tr>
                                        </thead>
                                        <tbody className="tabular-nums">
                                          {pRow.lines.map((ln, lnIdx) => (
                                            <tr key={lnIdx} className="hover:bg-yellow-50/50">
                                              <td className="border border-gray-400 px-3 py-1.5 font-mono text-sm text-start" dir="ltr">
                                                {formatDate(ln.date)}
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 font-mono font-bold text-[#1E3A5F] text-sm text-start" dir="ltr">
                                                {ln.invoiceNo}
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 text-gray-800 text-sm text-start">
                                                {ln.warehouseName || '-'}
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 text-center font-mono text-sm">
                                                <span className="text-gray-600">KG</span>
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 text-left font-mono font-bold text-sm" dir="ltr">
                                                {ln.qty.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 text-left font-mono text-sm" dir="ltr">
                                                {fmtNum(ln.rate)}
                                              </td>
                                              <td className="border border-gray-400 px-3 py-1.5 text-left font-mono font-bold text-gray-900 text-sm" dir="ltr">
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

                        {/* Subtotal row per quality in "All qualities" mode */}
                        {!isSingleQuality && (
                          <tr className="bg-[#DFDFDF] font-bold border-b-2 border-black">
                            <td
                              colSpan={3}
                              className="border border-black px-3.5 py-2 text-start font-urdu text-base font-bold"
                            >
                              میزان سب ٹوٹل ({qg.quality}):
                            </td>
                            <td className="border border-black px-3.5 py-2 text-left font-mono font-bold text-base tabular-nums" dir="ltr">
                              {qg.totalQty.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                            </td>
                            <td className="border border-black px-3.5 py-2 text-left font-mono text-gray-900 text-base tabular-nums" dir="ltr">
                              {fmtNum(qg.avgRate)}
                            </td>
                            <td className="border border-black px-3.5 py-2 text-left font-mono font-bold text-[#1E3A5F] text-base tabular-nums" dir="ltr">
                              {fmt(qg.totalAmount)}
                            </td>
                            <td className="border border-black px-3.5 py-2 text-center font-mono text-base font-bold">
                              {qg.invoicesCount}
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
                    <td colSpan={selectedQuality ? 2 : 3} className="border border-black px-3.5 py-2.5 text-start font-urdu font-bold text-[17px]">
                      {selectedQuality ? `کوالٹی "${selectedQuality}" کا کل میزان:` : 'کل کوالٹیز کا میزان (Grand Total):'}
                    </td>
                    <td className="border border-black px-3.5 py-2.5 text-left font-mono font-bold text-gray-950 text-[17px] tabular-nums" dir="ltr">
                      {qualityPartyTotals.totalQty.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      kg
                    </td>
                    <td className="border border-black px-3.5 py-2.5 text-left font-mono font-bold text-gray-850 text-[17px] tabular-nums" dir="ltr">
                      {fmtNum(qualityPartyTotals.avgRate)}
                    </td>
                    <td className="border border-black px-3.5 py-2.5 text-left font-mono font-bold text-[17px] text-[#1E3A5F] tabular-nums" dir="ltr">
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

        {/* ── Reconciliation Footer Box with Green Matches Badge ───────────────────────── */}
        <div className="p-3 bg-[#F9F8F6] border-t-2 border-black space-y-1.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-extrabold text-[#1E3A5F] uppercase tracking-wide">
                Audit Reconciliation:
              </span>
              <span className="font-mono text-gray-800 text-xs">
                Grouped Total:{' '}
                <strong className="text-black">{fmt(displayedGroupedTotal)}</strong>
              </span>

              {matchingServiceTotal > 0 && (
                <>
                  <span className="text-gray-400">+</span>
                  <span className="font-mono text-gray-800 text-xs">
                    Services:{' '}
                    <strong className="text-black">{fmt(matchingServiceTotal)}</strong>
                  </span>
                  <span className="text-gray-400">=</span>
                  <span className="font-mono text-gray-800 font-bold text-xs">
                    Combined:{' '}
                    <strong className="text-[#1E3A5F]">{fmt(combinedGroupedPlusServices)}</strong>
                  </span>
                </>
              )}

              <span className="text-gray-400">vs</span>
              <span className="font-mono text-gray-800 text-xs">
                Invoice Filter Total:{' '}
                <strong className="text-[#1E3A5F]">{fmt(targetReconciliationInvoiceTotal)}</strong>
              </span>
            </div>

            {/* Reconciliation Status Badge - Green "Matches" check as requested */}
            <div className="flex items-center gap-1.5">
              {isReconciled ? (
                <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-600 text-emerald-800 px-2.5 py-1 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Matches invoice-wise item total: ✓ (Rs. {targetReconciliationInvoiceTotal.toLocaleString()})</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-600 text-amber-900 px-2.5 py-1 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>
                    Difference: {fmt(targetReconciliationInvoiceTotal - combinedGroupedPlusServices)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-gray-600 italic">
            * Weighted average rates are accurately computed as Σ Amount ÷ Σ KG Quantity across all underlying invoice lines.
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
              <div className="font-bold text-gray-800 uppercase tracking-wide text-sm font-urdu">
                تیار کنندہ (Prepared By)
              </div>
              <div className="text-xs text-gray-600 mt-0.5 print-note-text">Accountant / Data Operator</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-44 max-w-full h-8 border-b-2 border-gray-600 mb-1.5" />
              <div className="font-bold text-gray-800 uppercase tracking-wide text-sm font-urdu">
                تصدیق کنندہ (Verified By)
              </div>
              <div className="text-xs text-gray-600 mt-0.5 print-note-text">Accounts Department</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-44 max-w-full h-8 border-b-2 border-gray-600 mb-1.5" />
              <div className="font-bold text-gray-800 uppercase tracking-wide text-sm font-urdu">
                دستخط مجاز (Authorized Signature)
              </div>
              <div className="text-xs text-gray-600 mt-0.5 print-note-text">Proprietor / {legalName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
