import React, { useState, useEffect } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import { isRequired } from '../../utils/validators.js';

export default function ItemForm({ initialData = null, qualities = [], onSubmit, onCancel }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Raw Material');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setCode(initialData.code || '');
      setName(initialData.name || '');
      setCategory(initialData.category || 'Raw Material');
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!isRequired(name)) errs.name = 'Item Name is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    onSubmit({
      code: code.trim() || `RM-${Math.floor(100 + Math.random() * 900)}`,
      name: name.trim(),
      category,
      unit: 'KG',
      // Maintain backwards compatibility for legacy fields
      quality: initialData?.quality || '',
      defaultRate: initialData?.defaultRate ? Number(initialData.defaultRate) : 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Item Code (Optional)"
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

      <div>
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
