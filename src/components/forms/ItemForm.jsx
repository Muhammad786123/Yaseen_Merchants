import React, { useState, useEffect } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import { isRequired } from '../../utils/validators.js';

export default function ItemForm({ initialData = null, qualities = [], onSubmit, onCancel }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Raw Material');
  const [quality, setQuality] = useState('');
  const [unit, setUnit] = useState('KG');
  const [defaultRate, setDefaultRate] = useState(0);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setCode(initialData.code || '');
      setName(initialData.name || '');
      setCategory(initialData.category || 'Raw Material');
      setQuality(initialData.quality || '');
      setUnit(initialData.unit || 'KG');
      setDefaultRate(initialData.defaultRate || 0);
    } else if (qualities.length > 0 && !quality) {
      setQuality(qualities[0].name);
    }
  }, [initialData, qualities]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!isRequired(name)) errs.name = 'Item Name is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    onSubmit({
      code: code || `RM-${Math.floor(100 + Math.random() * 900)}`,
      name,
      category,
      quality: quality || (qualities[0]?.name || 'Cotton A'),
      unit,
      defaultRate: Number(defaultRate),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Item Code"
          value={code}
          onChange={setCode}
          placeholder="e.g. RM-001"
        />
        <Input
          label="Item Name"
          value={name}
          onChange={setName}
          placeholder="e.g. Cotton Waste"
          required
          error={errors.name}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Category"
          value={category}
          onChange={setCategory}
          options={[
            { value: 'Raw Material', label: 'Raw Material' },
            { value: 'Finished Product', label: 'Finished Product' },
          ]}
          required
        />
        <Select
          label="Quality Grade"
          value={quality}
          onChange={setQuality}
          options={qualities.map((q) => ({ value: q.name, label: q.name }))}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Unit of Measure"
          value={unit}
          onChange={setUnit}
          options={[
            { value: 'KG', label: 'Kilogram (KG)' },
            { value: 'Maund', label: 'Maund (40 KG)' },
            { value: 'Bale', label: 'Bale' },
            { value: 'Ton', label: 'Metric Ton' },
          ]}
        />
        <Input
          label="Default Rate (PKR)"
          type="number"
          value={defaultRate}
          onChange={setDefaultRate}
          placeholder="0"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initialData ? 'Update Item' : 'Save Item'}
        </Button>
      </div>
    </form>
  );
}
