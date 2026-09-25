import React from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import { Plus, Trash2, Tag, Wrench } from 'lucide-react';
import { fmt } from '../../utils/formatters.js';

export default function TransactionItemsTable({
  lineItems = [],
  items = [],
  qualities = [],
  onChange,
  allowServices = true,
  error = '',
}) {
  const handleLineChange = (index, field, value) => {
    const updated = [...lineItems];
    const currentLine = { ...updated[index], [field]: value };

    if (field === 'type') {
      if (value === 'service') {
        currentLine.itemId = '';
        currentLine.itemName = 'Service Line';
        currentLine.quality = '';
        currentLine.serviceDescription = currentLine.serviceDescription || 'Loading Service';
        currentLine.unitType = 'KG';
        currentLine.qty = 0;
        currentLine.rate = 0;
        currentLine.amount = currentLine.amount || 500;
      } else {
        currentLine.serviceDescription = '';
        if (items.length > 0) {
          const defaultItem = items[0];
          currentLine.itemId = defaultItem.id;
          currentLine.itemName = defaultItem.name;
          currentLine.quality = defaultItem.quality || 'Cotton A';
          currentLine.unitType = 'KG';
          currentLine.nugFactor = defaultItem.nugFactor || 100;
          currentLine.qty = 100;
          currentLine.rate = defaultItem.defaultRate || 0;
          currentLine.amount = currentLine.qty * currentLine.rate;
        }
      }
    }

    if (field === 'itemId') {
      const selectedItem = items.find((i) => i.id === value);
      if (selectedItem) {
        currentLine.itemName = selectedItem.name;
        currentLine.quality = selectedItem.quality || (qualities[0]?.name || 'Cotton A');
        currentLine.nugFactor = selectedItem.nugFactor || 100;
        currentLine.rate = selectedItem.defaultRate || 0;

        if (currentLine.unitType === 'Nug') {
          currentLine.qty = Number(currentLine.nugs || 1) * currentLine.nugFactor;
        }
        currentLine.amount = Number(currentLine.qty || 0) * Number(currentLine.rate || 0);
      }
    }

    if (field === 'unitType') {
      const factor = currentLine.nugFactor || 100;
      if (value === 'Nug') {
        currentLine.nugs = currentLine.nugs || 1;
        currentLine.qty = currentLine.nugs * factor;
      } else {
        currentLine.nugs = 0;
      }
      currentLine.amount = Number(currentLine.qty || 0) * Number(currentLine.rate || 0);
    }

    if (field === 'nugs') {
      const nugsVal = Number(value || 0);
      const factor = currentLine.nugFactor || 100;
      currentLine.qty = nugsVal * factor;
      currentLine.amount = currentLine.qty * Number(currentLine.rate || 0);
    }

    if (field === 'qty' || field === 'rate') {
      const q = Number(currentLine.qty || 0);
      const r = Number(currentLine.rate || 0);
      currentLine.amount = q * r;
    }

    if (field === 'amount' && currentLine.type === 'service') {
      currentLine.amount = Number(value || 0);
    }

    updated[index] = currentLine;
    onChange(updated);
  };

  const addStockRow = () => {
    const defaultItem = items[0];
    const newRow = {
      type: 'stock',
      itemId: defaultItem ? defaultItem.id : '',
      itemName: defaultItem ? defaultItem.name : '',
      quality: defaultItem ? defaultItem.quality : (qualities[0]?.name || 'Cotton A'),
      unitType: 'KG',
      nugs: 0,
      nugFactor: defaultItem ? (defaultItem.nugFactor || 100) : 100,
      qty: 100,
      rate: defaultItem ? (defaultItem.defaultRate || 0) : 0,
      amount: defaultItem ? 100 * (defaultItem.defaultRate || 0) : 0,
      serviceDescription: '',
    };
    onChange([...lineItems, newRow]);
  };

  const addServiceRow = () => {
    const newRow = {
      type: 'service',
      itemId: '',
      itemName: 'Service Line',
      quality: '',
      unitType: 'KG',
      nugs: 0,
      nugFactor: 0,
      qty: 0,
      rate: 0,
      amount: 500,
      serviceDescription: 'Loading Service',
    };
    onChange([...lineItems, newRow]);
  };

  const removeRow = (index) => {
    if (lineItems.length > 1) {
      onChange(lineItems.filter((_, i) => i !== index));
    }
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalKg = lineItems
    .filter((i) => i.type !== 'service')
    .reduce((sum, item) => sum + Number(item.qty || 0), 0);

  return (
    <div className="border border-[#E0DBD3] rounded-xl p-4 bg-[#FAF9F7]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3A5F] flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-[#C97B2E]" />
          Transaction Line Items
        </h4>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={addStockRow} icon={Plus}>
            Add Item
          </Button>
          {allowServices && (
            <Button variant="outline" size="sm" onClick={addServiceRow} icon={Wrench}>
              Add Service Line
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <div className="space-y-3">
        {lineItems.map((line, idx) => {
          const isService = line.type === 'service';
          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border transition-all ${
                isService
                  ? 'bg-amber-50/50 border-amber-200'
                  : 'bg-white border-[#E0DBD3]'
              }`}
            >
              {isService ? (
                /* Service Row Layout */
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-800">
                      <Wrench className="w-3 h-3" /> Service
                    </span>
                  </div>
                  <div className="col-span-6">
                    <Input
                      placeholder="Service Description (e.g. Loading / Freight Service)"
                      value={line.serviceDescription}
                      onChange={(v) => handleLineChange(idx, 'serviceDescription', v)}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="Amount (PKR)"
                      value={line.amount}
                      onChange={(v) => handleLineChange(idx, 'amount', v)}
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Stock Item Row Layout */
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Item Selector */}
                    <div className="col-span-12 sm:col-span-5">
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Item Name</label>
                      <Select
                        value={line.itemId}
                        onChange={(v) => handleLineChange(idx, 'itemId', v)}
                        options={items.map((i) => ({ value: i.id, label: `${i.code} - ${i.name}` }))}
                        placeholder="Select item..."
                      />
                    </div>

                    {/* Quality Grade */}
                    <div className="col-span-6 sm:col-span-3">
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Quality Grade</label>
                      <Select
                        value={line.quality}
                        onChange={(v) => handleLineChange(idx, 'quality', v)}
                        options={qualities.map((q) => ({ value: q.name, label: q.name }))}
                      />
                    </div>

                    {/* Unit Selector (KG vs Nug) */}
                    <div className="col-span-6 sm:col-span-3">
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Unit Type</label>
                      <Select
                        value={line.unitType || 'KG'}
                        onChange={(v) => handleLineChange(idx, 'unitType', v)}
                        options={[
                          { value: 'KG', label: 'Kilograms (KG)' },
                          { value: 'Nug', label: `Nug (${line.nugFactor || 100} KG/nug)` },
                        ]}
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors mt-4"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quantity & Calculations Row */}
                  <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-gray-100">
                    {line.unitType === 'Nug' ? (
                      <>
                        <div className="col-span-4 sm:col-span-3">
                          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Nugs (Pieces)</label>
                          <Input
                            type="number"
                            placeholder="Nugs"
                            value={line.nugs || ''}
                            onChange={(v) => handleLineChange(idx, 'nugs', v)}
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-3">
                          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">KG Equivalent</label>
                          <Input
                            type="number"
                            value={line.qty}
                            readOnly
                            className="bg-gray-100 font-bold text-[#1E3A5F]"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="col-span-8 sm:col-span-6">
                        <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Quantity (KG)</label>
                        <Input
                          type="number"
                          placeholder="Qty in KG"
                          value={line.qty}
                          onChange={(v) => handleLineChange(idx, 'qty', v)}
                        />
                      </div>
                    )}

                    <div className="col-span-4 sm:col-span-3">
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Rate (PKR / KG)</label>
                      <Input
                        type="number"
                        placeholder="Rate"
                        value={line.rate}
                        onChange={(v) => handleLineChange(idx, 'rate', v)}
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-3 text-right">
                      <span className="block text-[10px] font-semibold text-gray-400">Line Amount</span>
                      <span className="text-sm font-extrabold text-[#1E3A5F]">
                        {fmt(line.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-3 border-t border-[#E0DBD3] flex flex-wrap items-center justify-between text-xs font-semibold text-[#1E3A5F]">
        <div>
          Total Physical Quantity:{' '}
          <span className="text-sm font-bold text-gray-900">{totalKg.toLocaleString()} KG</span>
        </div>
        <div>
          Calculated Total Amount:{' '}
          <span className="text-base font-extrabold text-[#1E3A5F]">{fmt(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
