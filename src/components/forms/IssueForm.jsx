import React, { useState } from 'react';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import DatePicker from '../ui/DatePicker.jsx';
import { useQualities } from '../../hooks/useQualities.js';
import { fmt, getTodayStr } from '../../utils/formatters.js';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

export default function IssueForm({
  warehouses = [],
  items = [],
  qualities: qualitiesProp = [],
  stockEntries = [],
  onSubmit,
  onCancel,
}) {
  const { qualities: loadedQualities } = useQualities();
  const qualities = qualitiesProp.length > 0 ? qualitiesProp : loadedQualities;

  const [date, setDate] = useState(getTodayStr());
  const [fromWarehouse, setFromWarehouse] = useState(warehouses[0]?.name || 'Raw Material Store');

  const defaultQuality = qualities[0]?.name || 'Cotton A';
  const defaultItemId = items[0]?.id || '';

  const [lines, setLines] = useState([
    {
      id: 'line_' + Date.now(),
      itemId: defaultItemId,
      quality: defaultQuality,
      unit: 'KG',
      nugs: 1,
      issueQtyInput: 100,
    },
  ]);

  const [errors, setErrors] = useState({});

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: 'line_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        itemId: defaultItemId,
        quality: qualities[prev.length % (qualities.length || 1)]?.name || defaultQuality,
        unit: 'KG',
        nugs: 1,
        issueQtyInput: 100,
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

  // Compute stock, rate, and values for each line
  const computedLines = lines.map((line, idx) => {
    const selectedItem = items.find((i) => i.id === line.itemId);
    const nugFactor = selectedItem?.piecesToKg || selectedItem?.nugFactor || 100;
    const computedQtyKg =
      line.unit === 'Nug' ? Number(line.nugs || 0) * nugFactor : Number(line.issueQtyInput || 0);

    // Prior quantities of the same item+quality in earlier rows
    const priorQtyUsed = lines
      .slice(0, idx)
      .filter((l) => l.itemId === line.itemId && l.quality === line.quality)
      .reduce((sum, l) => {
        const itemObj = items.find((i) => i.id === l.itemId);
        const factor = itemObj?.piecesToKg || itemObj?.nugFactor || 100;
        return sum + (l.unit === 'Nug' ? Number(l.nugs || 0) * factor : Number(l.issueQtyInput || 0));
      }, 0);

    // Find stock matching item + quality + warehouse
    const matchingStock =
      stockEntries.find(
        (s) =>
          s.itemId === line.itemId &&
          s.quality === line.quality &&
          (s.warehouseName === fromWarehouse || s.warehouseId === fromWarehouse)
      ) ||
      stockEntries.find((s) => s.itemId === line.itemId && s.quality === line.quality) ||
      stockEntries.find((s) => s.itemId === line.itemId);

    const totalAvailable = matchingStock ? Number(matchingStock.qty || 0) : 0;
    const availableQty = Math.max(0, totalAvailable - priorQtyUsed);
    const currentAvgRate = matchingStock
      ? Number(matchingStock.avgRate || 0)
      : Number(selectedItem?.defaultRate || 0);
    const derivedValue = computedQtyKg * currentAvgRate;

    const isExceeded = computedQtyKg > availableQty || computedQtyKg <= 0;

    return {
      ...line,
      selectedItem,
      nugFactor,
      computedQtyKg,
      availableQty,
      totalAvailable,
      currentAvgRate,
      derivedValue,
      isExceeded,
    };
  });

  const totalQty = computedLines.reduce((sum, l) => sum + l.computedQtyKg, 0);
  const totalValue = computedLines.reduce((sum, l) => sum + l.derivedValue, 0);
  const hasErrors = computedLines.some((l) => l.isExceeded);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    computedLines.forEach((l, idx) => {
      if (!l.itemId) {
        newErrors[`item_${idx}`] = `Line ${idx + 1}: Please select an item`;
      } else if (l.computedQtyKg <= 0) {
        newErrors[`qty_${idx}`] = `Line ${idx + 1}: Quantity must be greater than 0`;
      } else if (l.computedQtyKg > l.availableQty) {
        newErrors[`qty_${idx}`] = `Line ${idx + 1} (${l.selectedItem?.name || 'Item'} - ${l.quality}): Only ${l.availableQty} KG available in ${fromWarehouse} (requested ${l.computedQtyKg} KG)`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payloadItems = computedLines.map((l) => ({
      itemId: l.itemId,
      itemName: l.selectedItem ? l.selectedItem.name : 'Cotton Waste',
      quality: l.quality || 'Cotton A',
      unit: l.unit,
      nugs: l.unit === 'Nug' ? Number(l.nugs) : 0,
      issueQty: l.computedQtyKg,
      availableQty: l.availableQty,
      rate: l.currentAvgRate,
      value: l.derivedValue,
    }));

    onSubmit({
      date,
      fromWarehouse,
      items: payloadItems,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header Fields - Issue Date and From Warehouse only (No department field) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF9F7] p-4 rounded-xl border border-[#E0DBD3]">
        <DatePicker label="Issue Date" value={date} onChange={setDate} required />
        <Select
          label="From Warehouse"
          value={fromWarehouse}
          onChange={(v) => {
            setFromWarehouse(v);
            setErrors({});
          }}
          options={warehouses.map((w) => ({ value: w.name, label: w.name }))}
          required
        />
      </div>

      {/* Repeatable Line Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider">
            Issue Line Items ({lines.length})
          </h4>
          <span className="text-[11px] text-gray-500 font-medium">
            Add multiple qualities or items under this single Issue Slip
          </span>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {computedLines.map((line, idx) => (
            <div
              key={line.id || idx}
              className={`p-3.5 rounded-xl border transition-all ${
                line.isExceeded
                  ? 'bg-red-50/40 border-red-300'
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
                <div className="sm:col-span-4">
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

                {/* Quality Select */}
                <div className="sm:col-span-3">
                  <Select
                    label="Quality Grade"
                    value={line.quality}
                    onChange={(v) => handleLineChange(idx, 'quality', v)}
                    options={qualities.map((q) => ({ value: q.name, label: q.name }))}
                    required
                  />
                </div>

                {/* Unit Type Select */}
                <div className="sm:col-span-2">
                  <Select
                    label="Unit"
                    value={line.unit}
                    onChange={(v) => handleLineChange(idx, 'unit', v)}
                    options={[
                      { value: 'KG', label: 'KG' },
                      { value: 'Nug', label: 'Nug' },
                    ]}
                  />
                </div>

                {/* Quantity Input */}
                <div className="sm:col-span-3">
                  {line.unit === 'Nug' ? (
                    <Input
                      label={`Nugs (${line.nugFactor} KG/ea)`}
                      type="number"
                      min="1"
                      value={line.nugs}
                      onChange={(v) => handleLineChange(idx, 'nugs', v)}
                      required
                    />
                  ) : (
                    <Input
                      label="Quantity (KG)"
                      type="number"
                      min="1"
                      value={line.issueQtyInput}
                      onChange={(v) => handleLineChange(idx, 'issueQtyInput', v)}
                      required
                    />
                  )}
                </div>
              </div>

              {/* Line Stock Info Card */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs">
                <div>
                  <span className="text-gray-500 font-medium">Available in Store: </span>
                  <span
                    className={`font-bold ${
                      line.availableQty >= line.computedQtyKg && line.computedQtyKg > 0
                        ? 'text-emerald-700'
                        : 'text-red-600'
                    }`}
                  >
                    {line.availableQty} KG
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Issue Qty: </span>
                  <span className="font-bold text-[#1E3A5F]">{line.computedQtyKg} KG</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Rate / Value: </span>
                  <span className="font-bold text-gray-700">
                    {fmt(line.currentAvgRate)}/kg → {fmt(line.derivedValue)}
                  </span>
                </div>
              </div>

              {/* Error on this specific line */}
              {line.computedQtyKg > line.availableQty && (
                <div className="mt-2 flex items-center gap-1.5 p-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Line #{idx + 1}: Requested {line.computedQtyKg} KG exceeds available {line.availableQty} KG in {fromWarehouse}
                  </span>
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
          <strong className="text-[#1E3A5F] font-mono">{totalQty} KG</strong>
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
        <Button type="submit" variant="primary" disabled={hasErrors || totalQty <= 0}>
          Issue Material ({lines.length} items)
        </Button>
      </div>
    </form>
  );
}
