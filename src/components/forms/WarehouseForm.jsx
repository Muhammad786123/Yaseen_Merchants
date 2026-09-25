import React, { useState, useEffect } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import { isRequired } from '../../utils/validators.js';

export default function WarehouseForm({ initialData = null, onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Raw Material');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setType(initialData.type || 'Raw Material');
      setLocation(initialData.location || '');
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!isRequired(name)) errs.name = 'Warehouse Name is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    onSubmit({ name, type, location });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Warehouse Name"
        value={name}
        onChange={setName}
        placeholder="e.g. Raw Material Store"
        required
        error={errors.name}
      />
      <Select
        label="Warehouse Type"
        value={type}
        onChange={setType}
        options={[
          { value: 'Raw Material', label: 'Raw Material Store' },
          { value: 'Production', label: 'Production Area' },
          { value: 'Finished Product', label: 'Finished Goods Store' },
        ]}
        required
      />
      <Input
        label="Location / Block"
        value={location}
        onChange={setLocation}
        placeholder="e.g. Block A, Main Gate"
      />
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initialData ? 'Update Warehouse' : 'Save Warehouse'}
        </Button>
      </div>
    </form>
  );
}
