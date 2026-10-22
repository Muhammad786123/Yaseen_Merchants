import React, { useState } from 'react';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import DatePicker from '../ui/DatePicker.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import { useQualities } from '../../hooks/useQualities.js';
import { fmt, getTodayStr } from '../../utils/formatters.js';
import { Plus, Trash2, AlertCircle, Info } from 'lucide-react';

export default function IssueForm({
  warehouses = [],
  items = [],
  qualities: qualitiesProp = [],
  stockEntries = [],
  initialData = null,
  onSubmit,
  onCancel,
}) {
  const { qualities: loadedQualities } = useQualities();
  const qualities = qualitiesProp.length > 0 ? qualitiesProp : loadedQualities;

  const [date, setDate] = useState(initialData?.date || getTodayStr());
  const [fromWarehouse, setFromWarehouse] = useState(initialData?.fromWarehouse || '');
  const [showNegativeConfirm, setShowNegativeConfirm] = useState(false);

  // Pool of all warehouse names (from warehouses list, stock entries, and current selection)
  const warehouseOptions = Array.from(
    new Set([
      ...warehouses.map((w) => w.name),
      ...stockEntries.map((s) => s.warehouseName).filter(Boolean),
      fromWarehouse,
    ].filter(Boolean))
  );

  const [lines, setLines] = useState(() => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items.map((it, idx) => ({
        id: `line_${idx}_${Date.now()}`,
        itemId: it.itemId || '',
        quality: it.quality || '',
        unit: 'KG',
        nugs: 0,
        issueQtyInput: it.issueQty !== undefined ? it.issueQty : (it.qty !== undefined ? it.qty : ''),
      }));
    }
    return [
      {
        id: 'line_' + Date.now(),
        itemId: '',
        quality: '',
        unit: 'KG',
        nugs: 0,
        issueQtyInput: '',
      },
    ];
  });

  const [errors, setErrors] = useState({});

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: 'line_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        itemId: '',
        quality: '',
        unit: 'KG',
        nugs: 0,
        issueQtyInput: '',
      },
    ]);
  };

  const handleRemoveLine = (idx) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
    setErrors({});
  };

  const handleLineChange = (idx, field, value) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
    setErrors({});
  };

  // Compute stock, rate, and availability per line
  const computedLines = lines.map((line, idx) => {
    const selectedItem = items.find((i) => i.id === line.itemId);
    const computedQtyKg = Number(line.issueQtyInput || 0);

    // Filter stock entries for this item and selected quality
    const itemMatches = (s) =>
      s.itemId === line.itemId ||
      (selectedItem && (s.itemName || '').toLowerCase() === (selectedItem.name || '').toLowerCase());

    const matchingEntries = line.itemId
      ? stockEntries.filter((s) => itemMatches(s))
      : [];

    // Group raw stock by warehouse
    const godownRawMap = {};
    matchingEntries.forEach((s) => {
      const wName = s.warehouseName || s.warehouseId || 'Main Godown';
      godownRawMap[wName] = (godownRawMap[wName] || 0) + Number(s.qty || 0);
    });

    if (fromWarehouse && !godownRawMap[fromWarehouse]) {
      godownRawMap[fromWarehouse] = 0;
    }

    // Prior quantities used in earlier lines of this slip
    // In this slip, earlier lines deduct from `fromWarehouse`
    let priorUsedInFromWarehouse = 0;
    if (fromWarehouse) {
      priorUsedInFromWarehouse = lines
        .slice(0, idx)
        .filter((l) => {
          return (
            l.itemId === line.itemId ||
            (selectedItem && (l.itemName || '').toLowerCase() === (selectedItem.name || '').toLowerCase())
          );
        })
        .reduce((sum, l) => sum + Number(l.issueQtyInput || 0), 0);
    }

    // Build godowns breakdown list subtracting prior quantities used in that godown
    const godownsList = Object.keys(godownRawMap).map((wName) => {
      const raw = godownRawMap[wName];
      const isFromWh = fromWarehouse && fromWarehouse.trim().toLowerCase() === wName.trim().toLowerCase();
      const priorUsed = isFromWh ? priorUsedInFromWarehouse : 0;
      const available = raw - priorUsed;
      return {
        name: wName,
        raw,
        available,
      };
    });

    // Total stock across all godowns for this line
    const totalAllGodowns = godownsList.reduce((sum, g) => sum + g.available, 0);

    // Available in selected godown (if fromWarehouse chosen)
    let availableInSelected = 0;
    if (fromWarehouse) {
      const found = godownsList.find(
        (g) => g.name.trim().toLowerCase() === fromWarehouse.trim().toLowerCase()
      );
      availableInSelected = found ? found.available : 0;
    }

    // Rate / Value resolution:
    // 1. Weighted average rate of matching stock row in selected godown
    // 2. If no matching row or warehouse not chosen yet, item weighted average rate across all godowns
    let currentAvgRate = 0;
    let isItemAverage = false;

    if (line.itemId) {
      let matchingStock = null;
      if (fromWarehouse) {
        matchingStock = matchingEntries.find(
          (s) =>
            ((s.warehouseName || '').trim().toLowerCase() === fromWarehouse.trim().toLowerCase() ||
              (s.warehouseId || '').trim().toLowerCase() === fromWarehouse.trim().toLowerCase()) &&
            Number(s.avgRate || 0) > 0
        );
      }

      if (matchingStock && Number(matchingStock.avgRate) > 0) {
        currentAvgRate = Number(matchingStock.avgRate);
        isItemAverage = false;
      } else {
        // Weighted average rate across all warehouses
        const itemStockRows = stockEntries.filter(
          (s) => itemMatches(s) && Number(s.qty || 0) > 0 && Number(s.avgRate || 0) > 0
        );
        const totalItemQty = itemStockRows.reduce((sum, s) => sum + Number(s.qty || 0), 0);
        const totalItemVal = itemStockRows.reduce(
          (sum, s) => sum + (Number(s.value !== undefined ? s.value : s.qty * s.avgRate) || 0),
          0
        );

        if (totalItemQty > 0) {
          currentAvgRate = totalItemVal / totalItemQty;
          isItemAverage = true;
        } else if (selectedItem?.defaultRate) {
          currentAvgRate = Number(selectedItem.defaultRate);
          isItemAverage = false;
        }
      }
    }

    const derivedValue =
      line.itemId && computedQtyKg > 0 && currentAvgRate > 0
        ? Math.round(computedQtyKg * currentAvgRate * 100) / 100
        : 0;

    // Validation warning conditions:
    // Case 1 (Amber): requested qty > available in selected godown BUT <= total of all godowns
    let amberWarning = null;
    let redWarning = false;

    if (fromWarehouse && line.itemId && computedQtyKg > 0) {
      if (computedQtyKg > availableInSelected && computedQtyKg <= totalAllGodowns) {
        const otherGodowns = godownsList
          .filter((g) => g.name.trim().toLowerCase() !== fromWarehouse.trim().toLowerCase() && g.available > 0)
          .sort((a, b) => b.available - a.available);
        const targetGodown = otherGodowns.find((g) => g.available >= computedQtyKg) || otherGodowns[0];
        if (targetGodown) {
          amberWarning = { otherGodown: targetGodown };
        } else {
          redWarning = true;
        }
      } else if (computedQtyKg > totalAllGodowns) {
        // Case 2 (Red): requested qty > total of all godowns
        redWarning = true;
      }
    }

    const isExceeded = Boolean(fromWarehouse && line.itemId && computedQtyKg > availableInSelected);

    return {
      ...line,
      selectedItem,
      computedQtyKg,
      godownsList,
      totalAllGodowns,
      availableInSelected,
      currentAvgRate,
      isItemAverage,
      derivedValue,
      amberWarning,
      redWarning,
      isExceeded,
    };
  });

  const totalQty = computedLines.reduce((sum, l) => sum + l.computedQtyKg, 0);
  const totalValue = Math.round(computedLines.reduce((sum, l) => sum + l.derivedValue, 0) * 100) / 100;

  const doSubmit = () => {
    const payloadItems = computedLines.map((l) => ({
      itemId: l.itemId,
      itemName: l.selectedItem ? l.selectedItem.name : 'Cotton Waste',
      quality: l.quality || '',
      unit: 'KG',
      nugs: 0,
      issueQty: l.computedQtyKg,
      availableQty: l.availableInSelected,
      rate: l.currentAvgRate,
      value: l.derivedValue,
    }));

    onSubmit({
      date,
      fromWarehouse,
      items: payloadItems,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!fromWarehouse) {
      newErrors.warehouse = 'Please select a godown to issue from';
      setErrors(newErrors);
      return;
    }

    computedLines.forEach((l, idx) => {
      if (!l.itemId) {
        newErrors[`item_${idx}`] = `Line ${idx + 1}: Please select an item`;
      } else if (l.computedQtyKg <= 0) {
        newErrors[`qty_${idx}`] = `Line ${idx + 1}: Quantity must be greater than 0`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const hasNegative = computedLines.some((l) => l.computedQtyKg > l.availableInSelected);
    if (hasNegative) {
      setShowNegativeConfirm(true);
      return;
    }

    doSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header Fields - Issue Date and From Warehouse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF9F7] p-4 rounded-xl border border-[#E0DBD3]">
        <DatePicker label="Issue Date" value={date} onChange={setDate} required />
        <Select
          label="From Warehouse / Godown"
          value={fromWarehouse}
          onChange={(v) => {
            setFromWarehouse(v);
            setErrors({});
          }}
          options={warehouseOptions.map((name) => ({ value: name, label: name }))}
          placeholder="Select a godown to issue from..."
          required
          error={errors.warehouse}
        />
      </div>

      {/* Repeatable Line Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-[#1E3A5F] uppercase tracking-wider">
            Issue Line Items ({lines.length})
          </h4>
          <span className="text-xs text-gray-500 font-medium">
            Add multiple qualities or items under this single Issue Slip
          </span>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pe-1">
          {computedLines.map((line, idx) => (
            <div
              key={line.id || idx}
              className={`p-3.5 rounded-xl border transition-all ${
                line.redWarning
                  ? 'bg-red-50/40 border-red-300'
                  : line.amberWarning
                  ? 'bg-amber-50/40 border-amber-300'
                  : 'bg-white border-[#E0DBD3] hover:border-gray-300'
              }`}
            >
              {/* Row Header */}
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-[#1E3A5F]">Line #{idx + 1}</span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100/50 rounded transition-colors cursor-pointer"
                    title="Remove item line"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Item Select */}
                <div className="sm:col-span-8">
                  <Select
                    label="Item to Issue"
                    value={line.itemId}
                    onChange={(v) => handleLineChange(idx, 'itemId', v)}
                    options={items.map((i) => ({
                      value: i.id,
                      label: `${i.code ? `${i.code} - ` : ''}${i.name}`,
                    }))}
                    placeholder="Select item..."
                    required
                  />
                </div>

                {/* Quantity Input */}
                <div className="sm:col-span-4">
                  <Input
                    label="Quantity (KG)"
                    type="number"
                    min="1"
                    value={line.issueQtyInput}
                    onChange={(v) => handleLineChange(idx, 'issueQtyInput', v)}
                    required
                  />
                </div>
              </div>

              {/* Line Stock Availability & Breakdown Box */}
              {line.itemId && (
                <div className="mt-2.5 p-3 bg-[#F8FAFC] rounded-lg border border-[#CBD5E1] text-xs space-y-2">
                  {/* Row 1: Total Stock & Available in Godown */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-gray-600 font-medium">Total stock (all godowns): </span>
                      <strong className="text-gray-900 font-mono font-bold">
                        {line.totalAllGodowns.toLocaleString('en-PK')} KG
                      </strong>
                    </div>

                    <div>
                      {fromWarehouse ? (
                        <div>
                          <span className="text-gray-600 font-medium">Available in {fromWarehouse}: </span>
                          <span
                            className={`font-bold font-mono ${
                              line.availableInSelected >= line.computedQtyKg && line.computedQtyKg > 0
                                ? 'text-emerald-700'
                                : line.computedQtyKg > 0
                                ? 'text-red-600'
                                : 'text-gray-900'
                            }`}
                          >
                            {line.availableInSelected.toLocaleString('en-PK')} KG
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                          Select a godown to issue from
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Breakdown List (Clickable Godown Badges) */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-gray-200">
                    <span className="text-gray-500 font-medium">Breakdown:</span>
                    {line.godownsList.length > 0 ? (
                      line.godownsList.map((g, gIdx) => {
                        const isSelected =
                          fromWarehouse && fromWarehouse.trim().toLowerCase() === g.name.trim().toLowerCase();
                        return (
                          <button
                            key={g.name || gIdx}
                            type="button"
                            onClick={() => {
                              setFromWarehouse(g.name);
                              setErrors({});
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white font-bold shadow-xs ring-2 ring-blue-300'
                                : 'bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 font-medium hover:border-blue-400'
                            }`}
                            title={`Click to set From Warehouse to ${g.name}`}
                          >
                            <span>{g.name}:</span>
                            <span className="font-mono">{g.available.toLocaleString('en-PK')} KG</span>
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-gray-400 italic">No godown stock recorded</span>
                    )}
                  </div>

                  {/* Row 3: Rate / Value Info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-gray-200 text-gray-600">
                    <div>
                      <span className="font-medium">Issue Qty: </span>
                      <strong className="text-[#1E3A5F] font-mono">
                        {line.computedQtyKg > 0 ? `${line.computedQtyKg.toLocaleString('en-PK')} KG` : '-'}
                      </strong>
                    </div>
                    <div>
                      <span className="font-medium">Rate / Value: </span>
                      <strong className="text-gray-800 font-mono">
                        {line.currentAvgRate > 0
                          ? `${fmt(line.currentAvgRate)}/kg${line.isItemAverage ? ' (item average)' : ''} → ${fmt(
                              line.derivedValue
                            )}`
                          : '-'}
                      </strong>
                    </div>
                  </div>

                  {/* Validation Amber Message: Qty > selected godown but <= total all godowns */}
                  {line.amberWarning && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-md text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>
                          Only {line.availableInSelected.toLocaleString('en-PK')} KG in {fromWarehouse}.{' '}
                          {line.amberWarning.otherGodown.available.toLocaleString('en-PK')} KG is in{' '}
                          {line.amberWarning.otherGodown.name} - choose that godown or reduce the quantity
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFromWarehouse(line.amberWarning.otherGodown.name);
                          setErrors({});
                        }}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs shadow-xs cursor-pointer transition-colors"
                      >
                        Use {line.amberWarning.otherGodown.name}
                      </button>
                    </div>
                  )}

                  {/* Validation Red Message: Qty > total of all godowns */}
                  {line.redWarning && (
                    <div className="flex items-center gap-1.5 p-2 bg-red-50 text-red-700 border border-red-200 rounded-md text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>
                        Not enough stock: Requested {line.computedQtyKg.toLocaleString('en-PK')} KG exceeds total stock ({line.totalAllGodowns.toLocaleString('en-PK')} KG). Stock will go negative.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Another Item Button */}
        <button
          type="button"
          onClick={handleAddLine}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 hover:border-[#1E3A5F] rounded-xl text-xs font-bold text-[#1E3A5F] hover:bg-gray-50 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Another Item</span>
        </button>
      </div>

      {/* General Validation Error Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs space-y-1 font-semibold">
          {Object.values(errors).map((err, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Voucher Totals Summary Bar */}
      <div className="p-3 bg-[#FAF9F7] rounded-xl border border-[#E0DBD3] flex flex-wrap items-center justify-between text-xs font-semibold">
        <span className="text-gray-600">
          Total Items: <strong className="text-gray-900">{lines.length}</strong>
        </span>
        <span className="text-gray-600">
          Total Quantity:{' '}
          <strong className="text-[#1E3A5F] font-mono">{totalQty.toLocaleString('en-PK')} KG</strong>
        </span>
        <span className="text-gray-600">
          Total Estimated Value:{' '}
          <strong className="text-gray-900 font-mono">{fmt(totalValue)}</strong>
        </span>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E0DBD3]">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!fromWarehouse || totalQty <= 0 || computedLines.some((l) => !l.itemId || l.computedQtyKg <= 0)}
        >
          {initialData ? `Update Material Issue (${lines.length} items)` : `Issue Material (${lines.length} items)`}
        </Button>
      </div>

      {/* Negative Stock Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showNegativeConfirm}
        title="Stock will go negative"
        message={`One or more items exceed available stock in ${fromWarehouse}. Stock will go negative. Do you want to proceed and save this material issue?`}
        confirmLabel="Confirm (Stock will go negative)"
        cancelLabel="Cancel"
        danger={false}
        onConfirm={() => {
          setShowNegativeConfirm(false);
          doSubmit();
        }}
        onCancel={() => setShowNegativeConfirm(false)}
      />
    </form>
  );
}
