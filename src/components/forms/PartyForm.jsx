import React, { useState, useEffect } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import { isRequired } from '../../utils/validators.js';

export default function PartyForm({ initialData = null, onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Supplier');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setType(initialData.type || 'Supplier');
      setPhone(initialData.phone || '');
      setCity(initialData.city || '');
      setOpeningBalance(initialData.openingBalance || 0);
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!isRequired(name)) errs.name = 'Party Name is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    onSubmit({
      name,
      type,
      phone,
      city,
      openingBalance: Number(openingBalance),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Party / Business Name"
        value={name}
        onChange={setName}
        placeholder="e.g. Al-Hamd Textile Traders"
        required
        error={errors.name}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Party Type"
          value={type}
          onChange={setType}
          options={[
            { value: 'Supplier', label: 'Supplier' },
            { value: 'Customer', label: 'Customer' },
            { value: 'Both', label: 'Both (Supplier & Customer)' },
          ]}
          required
        />

        <Input
          label="Phone Number"
          value={phone}
          onChange={setPhone}
          placeholder="0300-1234567"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="City / Location"
          value={city}
          onChange={setCity}
          placeholder="e.g. Faisalabad"
        />

        <Input
          label="Opening Balance (PKR)"
          type="number"
          value={openingBalance}
          onChange={setOpeningBalance}
          placeholder="0"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initialData ? 'Update Party' : 'Save Party'}
        </Button>
      </div>
    </form>
  );
}
