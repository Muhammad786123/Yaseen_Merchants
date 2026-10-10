import React, { useState } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import DatePicker from '../ui/DatePicker.jsx';
import { isRequired } from '../../utils/validators.js';
import { fmt } from '../../utils/formatters.js';
import { PlusCircle, Info } from 'lucide-react';

export default function StockAdjustmentForm({
  items = [],
  qualities = [],
  warehouses = [],
  initialData = null,
  onSubmit,
  onCancel,
}) {
  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().split('T')[0]
  );
  const type = 'ADD'; // Addition only per Decision 8
  const [adjustmentType, setAdjustmentType] = useState(
    initialData?.adjustmentType || 'Opening Balance'
  );
  const [itemId, setItemId] = useState(initialData?.itemId || items[0]?.id || '');
  const [quality, setQuality] = useState(
    initialData?.quality || qualities[0]?.name || 'Cotton A'
  );
  const [warehouseId, setWarehouseId] = useState(
    initialData?.warehouseId || warehouses[0]?.id || ''
  );
  const [qty, setQty] = useState(initialData?.qty ? String(initialData.qty) : '');
  // Rate always starts empty with no auto-suggest per Decision 7
  const [rate, setRate] = useState(initialData?.rate ? String(initialData.rate) : '');
  const [reason, setReason] = useState(initialData?.reason || initialData?.note || '');
  const [errors, setErrors] = useState({});

  const numQty = Math.abs(parseFloat(qty) || 0);
  const numRate = parseFloat(rate) || 0;
  const totalValue = numQty * numRate;

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!isRequired(date)) errs.date = 'Date is required';
    if (!itemId) errs.itemId = 'Please select an item';
    if (!quality) errs.quality = 'Please select a quality grade';
    if (!warehouseId) errs.warehouseId = 'Please select a warehouse';
    if (!qty || numQty <= 0) errs.qty = 'Quantity must be greater than 0';
    if (!rate || numRate <= 0) errs.rate = 'Valuation rate (Rs./kg) is required';
    if (!isRequired(reason)) {
      errs.reason = 'Reason/Note is required to explain this manual stock addition';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const selectedItem = items.find((i) => i.id === itemId);
    const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);

    onSubmit({
      date,
      type: 'ADD',
      adjustmentType,
      itemId,
      itemName: selectedItem?.name || 'Item',
      quality,
      warehouseId,
      warehouseName: selectedWarehouse?.name || 'Warehouse',
      qty: numQty,
      rate: numRate,
      amount: totalValue,
      reason: reason.trim(),
      note: reason.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
      {/* Header Banner - Addition Only */}
      <div className="flex items-center gap-2 p-2 bg-[#EBE9ED] border-2 border-black text-black font-bold">
        <PlusCircle className="w-4 h-4 text-[#1a6b2e]" />
        <span className="uppercase tracking-wide">+ Manual Stock Addition (Opening Balance / Inward Correction)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Date */}
        <DatePicker
          label="Addition Date"
          value={date}
          onChange={setDate}
          required
          error={errors.date}
        />

        {/* Reason Classification */}
        <Select
          label="Addition Classification"
          value={adjustmentType}
          onChange={setAdjustmentType}
          options={[
            { value: 'Opening Balance', label: 'Opening Balance (Initial setup / migration)' },
            { value: 'Physical Count Correction', label: 'Physical Count Correction (Surplus)' },
            { value: 'Transferred from Outside', label: 'Transferred from External Source' },
            { value: 'General Adjustment', label: 'General Stock Inward Addition' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Item Selection */}
        <Select
          label="Inventory Item"
          value={itemId}
          onChange={setItemId}
          required
          options={items.map((i) => ({
            value: i.id,
            label: `${i.code ? `${i.code} - ` : ''}${i.name}`,
          }))}
          error={errors.itemId}
        />

        {/* Quality Grade */}
        <Select
          label="Quality Grade"
          value={quality}
          onChange={setQuality}
          required
          options={qualities.map((q) => ({
            value: q.name,
            label: q.name,
          }))}
          error={errors.quality}
        />

        {/* Warehouse */}
        <Select
          label="Target Warehouse / Store"
          value={warehouseId}
          onChange={setWarehouseId}
          required
          options={warehouses.map((w) => ({
            value: w.id,
            label: `${w.name} (${w.type || 'Storage'})`,
          }))}
          error={errors.warehouseId}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Quantity (KG) */}
        <Input
          label="Quantity (KG)"
          type="number"
          step="any"
          value={qty}
          onChange={setQty}
          placeholder="Enter quantity in KG"
          required
          error={errors.qty}
        />

        {/* Rate (Rs./kg) - starts blank, no auto-fill */}
        <Input
          label="Valuation Rate (Rs. / KG)"
          type="number"
          step="any"
          value={rate}
          onChange={setRate}
          placeholder="Enter valuation rate (Rs./KG)"
          required
          error={errors.rate}
        />
      </div>

      {/* Reason / Note */}
      <Input
        label="Reason / Audit Explanation"
        value={reason}
        onChange={setReason}
        placeholder="e.g. Opening stock at go-live, physical count audit godam 1"
        required
        error={errors.reason}
      />

      {/* Financial Valuation Summary Card */}
      <div className="p-2.5 bg-white border border-black flex items-center justify-between">
        <div>
          <span className="text-xs text-gray-700 font-bold">Calculated Stock Value:</span>
          <div className="font-mono text-base font-black text-black">
            {fmt(totalValue)}
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-700 font-bold">Stock Added:</span>
          <div className="font-mono text-base font-bold text-[#1a6b2e]">
            +{numQty.toLocaleString('en-PK')} KG
          </div>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="flex items-start gap-2 p-2 bg-[#EBE9ED] border border-black text-xs text-black">
        <Info className="w-4 h-4 text-black shrink-0 mt-0.5" />
        <div>
          <strong>Pure Stock Movement:</strong> This entry increases stock inventory and updates moving average rate. It does <strong>not</strong> create party payable, cash book, or invoice records.
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-black">
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          {initialData ? 'Update Stock Addition' : 'Record Stock Addition'}
        </Button>
      </div>
    </form>
  );
}
