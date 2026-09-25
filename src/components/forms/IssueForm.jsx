import React, { useState } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import DatePicker from '../ui/DatePicker.jsx';
import { fmt, getTodayStr } from '../../utils/formatters.js';

export default function IssueForm({ warehouses = [], items = [], stockEntries = [], onSubmit, onCancel }) {
  const [date, setDate] = useState(getTodayStr());
  const [fromWarehouse, setFromWarehouse] = useState(warehouses[0]?.name || 'Raw Material Store');
  const [toArea, setToArea] = useState('Production Area');
  const [itemId, setItemId] = useState(items[0]?.id || '');
  const [unit, setUnit] = useState('KG');
  const [nugs, setNugs] = useState(1);
  const [issueQtyInput, setIssueQtyInput] = useState(100);
  const [errors, setErrors] = useState({});

  const selectedItem = items.find((i) => i.id === itemId);
  const nugFactor = selectedItem?.piecesToKg || 100;

  // Calculate issue Qty in KG based on unit selection
  const computedQtyKg = unit === 'Nug' ? Number(nugs || 0) * nugFactor : Number(issueQtyInput || 0);

  // Find matching stock record to check available stock & average rate
  const matchingStock = stockEntries.find(
    (s) =>
      s.itemId === itemId &&
      (s.quality === selectedItem?.quality || !selectedItem?.quality) &&
      (s.warehouseName === fromWarehouse || s.warehouseId === fromWarehouse)
  ) || stockEntries.find((s) => s.itemId === itemId && s.quality === selectedItem?.quality)
    || stockEntries.find((s) => s.itemId === itemId);

  const availableQty = matchingStock ? Number(matchingStock.qty || 0) : 0;
  const currentAvgRate = matchingStock ? Number(matchingStock.avgRate || 0) : Number(selectedItem?.defaultRate || 0);
  const derivedValue = computedQtyKg * currentAvgRate;

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!itemId) {
      newErrors.itemId = 'Please select an item to issue';
    }

    if (computedQtyKg <= 0) {
      newErrors.issueQty = 'Issue quantity must be greater than 0';
    } else if (computedQtyKg > availableQty) {
      newErrors.issueQty = `Only ${availableQty} KG available in ${fromWarehouse} — cannot issue ${computedQtyKg} KG`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      date,
      fromWarehouse,
      toArea,
      items: [
        {
          itemId,
          itemName: selectedItem ? selectedItem.name : 'Cotton Waste',
          quality: selectedItem ? selectedItem.quality : 'Cotton A',
          unit,
          nugs: unit === 'Nug' ? Number(nugs) : 0,
          issueQty: computedQtyKg,
          availableQty,
        },
      ],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        <Input
          label="To Department / Area"
          value={toArea}
          onChange={setToArea}
          placeholder="e.g. Production Area"
          required
        />
      </div>

      <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-4">
        <h4 className="text-xs font-bold text-[#1E3A5F] uppercase tracking-wider">Item Issue Details</h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Item to Issue"
            value={itemId}
            onChange={(v) => {
              setItemId(v);
              setErrors({});
            }}
            options={items.map((i) => ({ value: i.id, label: `${i.name} [${i.quality}]` }))}
            placeholder="Select item..."
            required
            error={errors.itemId}
          />

          <Select
            label="Unit Type"
            value={unit}
            onChange={setUnit}
            options={[
              { value: 'KG', label: 'KG (Kilograms)' },
              { value: 'Nug', label: `Nug / Piece (1 Nug = ${nugFactor} KG)` },
            ]}
          />

          {unit === 'Nug' ? (
            <Input
              label="Quantity (Nugs)"
              type="number"
              min="1"
              value={nugs}
              onChange={(v) => {
                setNugs(v);
                setErrors({});
              }}
              required
              error={errors.issueQty}
            />
          ) : (
            <Input
              label="Issue Quantity (KG)"
              type="number"
              min="1"
              value={issueQtyInput}
              onChange={(v) => {
                setIssueQtyInput(v);
                setErrors({});
              }}
              required
              error={errors.issueQty}
            />
          )}
        </div>

        {/* Stock Info & Validation Card */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-lg border border-[#E0DBD3] text-xs">
          <div>
            <span className="text-gray-500 font-medium">Available Stock in Store: </span>
            <span className={`font-bold ${availableQty >= computedQtyKg ? 'text-emerald-700' : 'text-red-600'}`}>
              {availableQty} KG
            </span>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Calculated Issue Qty: </span>
            <span className="font-bold text-[#1E3A5F]">{computedQtyKg} KG</span>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Derived Rate / Value: </span>
            <span className="font-bold text-gray-700">
              {fmt(currentAvgRate)}/kg → {fmt(derivedValue)}
            </span>
          </div>
        </div>

        {errors.issueQty && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold">
            ⚠️ {errors.issueQty}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={computedQtyKg > availableQty || computedQtyKg <= 0}
        >
          Issue Material
        </Button>
      </div>
    </form>
  );
}

