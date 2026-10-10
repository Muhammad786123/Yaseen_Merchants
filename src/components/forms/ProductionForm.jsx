import React, { useState } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import DatePicker from '../ui/DatePicker.jsx';
import { getTodayStr } from '../../utils/formatters.js';

export default function ProductionForm({ initialData = null, onSubmit, onCancel }) {
  const [date, setDate] = useState(initialData?.date || getTodayStr());
  const [product, setProduct] = useState(initialData?.product || 'Processed Cotton');
  const [totalInput, setTotalInput] = useState(initialData?.totalInput !== undefined ? initialData.totalInput : 300);
  const [outputQty, setOutputQty] = useState(initialData?.outputQty !== undefined ? initialData.outputQty : 265);
  const [wasteQty, setWasteQty] = useState(initialData?.wasteQty !== undefined ? initialData.wasteQty : 35);

  const yieldPct =
    totalInput > 0 ? ((Number(outputQty) / Number(totalInput)) * 100).toFixed(1) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      date,
      product,
      inputs: [{ itemName: 'Cotton Waste A', quality: 'Cotton A', qty: Number(totalInput) }],
      totalInput: Number(totalInput),
      outputQty: Number(outputQty),
      wasteQty: Number(wasteQty),
      yieldPct: Number(yieldPct),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DatePicker label="Production Date" value={date} onChange={setDate} required />
        <Select
          label="Output Product"
          value={product}
          onChange={setProduct}
          options={[
            { value: 'Processed Cotton', label: 'Processed Cotton' },
            { value: 'Processed Polyester', label: 'Processed Polyester' },
            { value: 'Mixed Fabric Product', label: 'Mixed Fabric Product' },
            { value: 'Recycled Textile Product', label: 'Recycled Textile Product' },
          ]}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Total Input Waste (KG)"
          type="number"
          value={totalInput}
          onChange={(v) => {
            setTotalInput(v);
            setWasteQty(Math.max(0, Number(v) - Number(outputQty)));
          }}
          required
        />
        <Input
          label="Finished Output (KG)"
          type="number"
          value={outputQty}
          onChange={(v) => {
            setOutputQty(v);
            setWasteQty(Math.max(0, Number(totalInput) - Number(v)));
          }}
          required
        />
        <Input
          label="Waste / Loss (KG)"
          type="number"
          value={wasteQty}
          onChange={setWasteQty}
          required
        />
      </div>

      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex justify-between items-center text-xs text-emerald-800">
        <span className="font-medium">Calculated Production Yield:</span>
        <span className="text-sm font-bold">{yieldPct}%</span>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initialData ? 'Update Production Entry' : 'Record Production Entry'}
        </Button>
      </div>
    </form>
  );
}
