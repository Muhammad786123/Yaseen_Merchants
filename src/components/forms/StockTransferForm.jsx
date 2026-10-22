import React, { useState, useEffect } from 'react';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import DatePicker from '../ui/DatePicker.jsx';
import { fmt, getTodayStr } from '../../utils/formatters.js';
import { AlertCircle, ArrowRightLeft } from 'lucide-react';

export default function StockTransferForm({
  warehouses = [],
  items = [],
  qualities = [],
  stockEntries = [],
  initialData = null,
  onSubmit,
  onCancel,
}) {
  const [date, setDate] = useState(initialData?.date || getTodayStr());
  const [fromWarehouse, setFromWarehouse] = useState(
    initialData?.fromWarehouseName || initialData?.fromWarehouseId || warehouses[0]?.name || ''
  );
  const [toWarehouse, setToWarehouse] = useState(
    initialData?.toWarehouseName || initialData?.toWarehouseId || warehouses[1]?.name || ''
  );
  const [itemId, setItemId] = useState(initialData?.itemId || items[0]?.id || '');
  const [quality, setQuality] = useState(initialData?.quality || '');
  const [qty, setQty] = useState(initialData?.qty !== undefined ? initialData.qty : '');
  const [remarks, setRemarks] = useState(initialData?.remarks || '');
  const [error, setError] = useState('');

  // Auto-seed warehouses if available
  useEffect(() => {
    if (!fromWarehouse && warehouses.length > 0) {
      setFromWarehouse(warehouses[0].name);
    }
    if (!toWarehouse && warehouses.length > 1) {
      setToWarehouse(warehouses[1].name);
    }
  }, [warehouses, fromWarehouse, toWarehouse]);

  const selectedItem = items.find((i) => i.id === itemId);

  // Exact match: item + quality + From warehouse from stockEntries
  const normalizedFromWh = (fromWarehouse || '').trim().toLowerCase();
  const normalizedQuality = (quality || '').trim().toLowerCase();

  const matchingStock = stockEntries.find((s) => {
    const itemMatch =
      s.itemId === itemId ||
      (selectedItem && (s.itemName || '').toLowerCase() === (selectedItem.name || '').toLowerCase());
    const whMatch =
      (s.warehouseName || '').trim().toLowerCase() === normalizedFromWh ||
      (s.warehouseId || '').trim().toLowerCase() === normalizedFromWh;
    return itemMatch && whMatch;
  });

  const availableInFromWh = matchingStock ? Number(matchingStock.qty || 0) : 0;
  const numQty = Number(qty || 0);

  const isSameWarehouse = Boolean(
    fromWarehouse && toWarehouse && fromWarehouse.trim().toLowerCase() === toWarehouse.trim().toLowerCase()
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!fromWarehouse) {
      setError('Please select the source warehouse (From Warehouse).');
      return;
    }
    if (!toWarehouse) {
      setError('Please select the destination warehouse (To Warehouse).');
      return;
    }
    if (isSameWarehouse) {
      setError('Source and destination warehouses cannot be the same. Please choose different godowns.');
      return;
    }
    if (!itemId) {
      setError('Please select an item to transfer.');
      return;
    }
    if (numQty <= 0) {
      setError('Transfer quantity must be greater than 0.');
      return;
    }

    const fromWhObj = warehouses.find(
      (w) => w.name.trim().toLowerCase() === fromWarehouse.trim().toLowerCase() || w.id === fromWarehouse
    );
    const toWhObj = warehouses.find(
      (w) => w.name.trim().toLowerCase() === toWarehouse.trim().toLowerCase() || w.id === toWarehouse
    );

    onSubmit({
      date,
      fromWarehouseId: fromWhObj?.id || fromWarehouse,
      fromWarehouseName: fromWhObj?.name || fromWarehouse,
      toWarehouseId: toWhObj?.id || toWarehouse,
      toWarehouseName: toWhObj?.name || toWarehouse,
      itemId,
      itemName: selectedItem ? selectedItem.name : 'Unknown Item',
      quality: '',
      qty: numQty,
      remarks,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF9F7] p-4 rounded-xl border border-[#E0DBD3]">
        <DatePicker label="Transfer Date" value={date} onChange={setDate} required />
        <div className="flex items-center gap-2 pt-5 text-xs text-gray-600 font-semibold">
          <ArrowRightLeft className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Inter-godown stock movement with zero net inventory impact</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* From Warehouse */}
        <Select
          label="From Warehouse (روانہ گودام)"
          value={fromWarehouse}
          onChange={(v) => {
            setFromWarehouse(v);
            setError('');
          }}
          options={warehouses.map((w) => ({ value: w.name, label: w.name }))}
          placeholder="Select source godown..."
          required
        />

        {/* To Warehouse */}
        <Select
          label="To Warehouse (موصول گودام)"
          value={toWarehouse}
          onChange={(v) => {
            setToWarehouse(v);
            setError('');
          }}
          options={warehouses.map((w) => ({ value: w.name, label: w.name }))}
          placeholder="Select destination godown..."
          required
        />
      </div>

      {isSameWarehouse && (
        <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Source and destination warehouses cannot be the same.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        {/* Item Select */}
        <div className="sm:col-span-7">
          <Select
            label="Item to Transfer"
            value={itemId}
            onChange={(v) => {
              setItemId(v);
              setError('');
            }}
            options={items.map((i) => ({
              value: i.id,
              label: `${i.code ? `${i.code} - ` : ''}${i.name}`,
            }))}
            placeholder="Select item..."
            required
          />
        </div>

        {/* Quantity (KG) */}
        <div className="sm:col-span-5">
          <Input
            label="Quantity (KG)"
            type="number"
            min="0.01"
            step="any"
            value={qty}
            onChange={(v) => {
              setQty(v);
              setError('');
            }}
            placeholder="e.g. 500"
            required
          />
        </div>
      </div>

      {/* Stock Availability in Source Godown Box */}
      {fromWarehouse && itemId && (
        <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#CBD5E1] text-xs flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-gray-600 font-medium">Available in {fromWarehouse}: </span>
            <span
              className={`font-mono font-bold ${
                availableInFromWh >= numQty && numQty > 0
                  ? 'text-emerald-700'
                  : numQty > 0
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}
            >
              {availableInFromWh.toLocaleString('en-PK')} KG
            </span>
          </div>

          <div>
            <span className="text-gray-600 font-medium">Transfer Qty: </span>
            <strong className="text-blue-900 font-mono">
              {numQty > 0 ? `${numQty.toLocaleString('en-PK')} KG` : '-'}
            </strong>
          </div>
        </div>
      )}

      {/* Remarks */}
      <Input
        label="Remarks / Note (تفصیل / وجہ)"
        value={remarks}
        onChange={setRemarks}
        placeholder="e.g. Shifted for processing / space adjustment"
      />

      {/* General Error Banner */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E0DBD3]">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!fromWarehouse || !toWarehouse || isSameWarehouse || !itemId || numQty <= 0}
        >
          {initialData ? 'Update Stock Transfer' : 'Transfer Stock (منتقلی)'}
        </Button>
      </div>
    </form>
  );
}
