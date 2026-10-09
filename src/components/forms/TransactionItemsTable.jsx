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
        currentLine.rate = '';
        currentLine.amount = currentLine.amount || 500;
      } else {
        currentLine.serviceDescription = '';
        if (items.length > 0) {
          const defaultItem = items[0];
          currentLine.itemId = defaultItem.id;
          currentLine.itemName = defaultItem.name;
          currentLine.quality = defaultItem.quality || (qualities[0]?.name || 'Cotton A');
          currentLine.unitType = 'KG';
          currentLine.nugFactor = defaultItem.piecesToKg || defaultItem.nugFactor || 100;
          currentLine.qty = 100;
          currentLine.rate = ''; // Rate starts empty per Decision 7
          currentLine.amount = 0;
        }
      }
    }

    if (field === 'itemId') {
      const selectedItem = items.find((i) => i.id === value);
      if (selectedItem) {
        currentLine.itemName = selectedItem.name;
        currentLine.quality = selectedItem.quality || (qualities[0]?.name || 'Cotton A');
        currentLine.nugFactor = selectedItem.piecesToKg || selectedItem.nugFactor || 100;
        // Rate starts empty per Decision 7
        currentLine.rate = '';

        if (currentLine.unitType === 'Nug') {
          currentLine.qty = Number(currentLine.nugs || 1) * currentLine.nugFactor;
        }
        currentLine.amount = 0;
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
      currentLine.amount = Number(currentLine.qty || 0) * (parseFloat(currentLine.rate) || 0);
    }

    if (field === 'nugFactor') {
      const factor = Number(value || 100);
      currentLine.nugFactor = factor;
      if (currentLine.unitType === 'Nug') {
        currentLine.qty = Number(currentLine.nugs || 1) * factor;
      }
      currentLine.amount = Number(currentLine.qty || 0) * (parseFloat(currentLine.rate) || 0);
    }

    if (field === 'nugs') {
      const nugsVal = Number(value || 0);
      const factor = currentLine.nugFactor || 100;
      currentLine.qty = nugsVal * factor;
      currentLine.amount = currentLine.qty * (parseFloat(currentLine.rate) || 0);
    }

    if (field === 'qty') {
      const q = Number(value || 0);
      currentLine.qty = q;
      currentLine.amount = q * (parseFloat(currentLine.rate) || 0);
    }

    if (field === 'rate') {
      currentLine.rate = value;
      const r = parseFloat(value) || 0;
      currentLine.amount = Number(currentLine.qty || 0) * r;
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
      nugFactor: defaultItem ? (defaultItem.piecesToKg || defaultItem.nugFactor || 100) : 100,
      qty: 100,
      rate: '', // Rate always starts blank per Decision 7
      amount: 0,
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
      rate: '',
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
    <div className="border-2 border-black p-3 bg-[#EBE9ED]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1 border-b border-black">
        <h4 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-black" />
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

      {error && <p className="text-xs text-red-600 font-bold mb-2">{error}</p>}

      <div className="space-y-2">
        {lineItems.map((line, idx) => {
          const isService = line.type === 'service';
          return (
            <div
              key={idx}
              className={`p-2 border border-black bg-white transition-colors ${
                isService ? 'bg-amber-50/50' : 'bg-white'
              }`}
            >
              {isService ? (
                /* Service Row Layout */
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-black text-xs font-bold bg-[#FFEB3B] text-black">
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
                      placeholder="Amount (Rs.)"
                      value={line.amount}
                      onChange={(v) => handleLineChange(idx, 'amount', v)}
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      disabled={lineItems.length <= 1}
                      className="p-1 text-red-600 hover:text-red-900 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Stock Item Row Layout */
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Item Selector */}
                    <div className="col-span-12 sm:col-span-5">
                      <label className="block text-xs font-bold text-gray-800 mb-0.5">Item Name</label>
                      <Select
                        value={line.itemId}
                        onChange={(v) => handleLineChange(idx, 'itemId', v)}
                        options={items.map((i) => ({ value: i.id, label: `${i.code || i.id} - ${i.name}` }))}
                        placeholder="Select item..."
                      />
                    </div>

                    {/* Quality Grade */}
                    <div className="col-span-6 sm:col-span-3">
                      <label className="block text-xs font-bold text-gray-800 mb-0.5">Quality Grade</label>
                      <Select
                        value={line.quality}
                        onChange={(v) => handleLineChange(idx, 'quality', v)}
                        options={qualities.map((q) => ({ value: q.name, label: q.name }))}
                      />
                    </div>

                    {/* Unit Selector (KG vs Nug) */}
                    <div className="col-span-6 sm:col-span-3">
                      <label className="block text-xs font-bold text-gray-800 mb-0.5">Unit Type</label>
                      <Select
                        value={line.unitType || 'KG'}
                        onChange={(v) => handleLineChange(idx, 'unitType', v)}
                        options={[
                          { value: 'KG', label: 'Kilograms (KG)' },
                          { value: 'Nug', label: `Nug (${line.nugFactor || 100} KG/nug)` },
                        ]}
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-1 text-end">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        disabled={lineItems.length <= 1}
                        className="p-1 text-red-600 hover:text-red-900 disabled:opacity-30 cursor-pointer mt-4"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>

                  {/* Quantity & Calculations Row */}
                  <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-gray-200">
                    {line.unitType === 'Nug' ? (
                      <>
                        <div className="col-span-4 sm:col-span-3">
                          <label className="block text-xs font-bold text-gray-800 mb-0.5">Nugs (Pieces)</label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Nugs"
                            value={line.nugs || ''}
                            onChange={(v) => handleLineChange(idx, 'nugs', v)}
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-3">
                          <label className="block text-xs font-bold text-gray-800 mb-0.5">KG Equivalent</label>
                          <Input
                            type="number"
                            value={line.qty}
                            readOnly
                            className="bg-gray-100 font-mono font-bold text-black"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="col-span-8 sm:col-span-6">
                        <label className="block text-xs font-bold text-gray-800 mb-0.5">Quantity (KG)</label>
                        <Input
                          type="number"
                          placeholder="Qty in KG"
                          value={line.qty}
                          onChange={(v) => handleLineChange(idx, 'qty', v)}
                        />
                      </div>
                    )}

                    <div className="col-span-4 sm:col-span-3">
                      <label className="block text-xs font-bold text-gray-800 mb-0.5">
                        Rate (Rs. / KG) <span className="text-red-600">*</span>
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter Rate"
                        value={line.rate}
                        onChange={(v) => handleLineChange(idx, 'rate', v)}
                        className="font-mono font-bold"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-3 text-end">
                      <span className="block text-xs font-bold text-gray-600">Line Amount</span>
                      <span className="text-base font-mono font-black text-black" dir="ltr">
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
      <div className="mt-3 pt-2 border-t-2 border-black flex flex-wrap items-center justify-between text-xs font-bold text-black">
        <div>
          Total Physical Quantity:{' '}
          <span className="font-mono font-black text-sm" dir="ltr">{totalKg.toLocaleString()} KG</span>
        </div>
        <div>
          Calculated Total Amount:{' '}
          <span className="font-mono font-black text-sm text-[#1a6b2e]" dir="ltr">{fmt(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
