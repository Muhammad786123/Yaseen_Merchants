import React, { useState } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import DatePicker from '../ui/DatePicker.jsx';
import { getTodayStr } from '../../utils/formatters.js';

export default function PaymentForm({ parties = [], accounts = [], onSubmit, onCancel }) {
  const [date, setDate] = useState(getTodayStr());
  const [partyId, setPartyId] = useState(parties[0]?.id || '');
  const [amount, setAmount] = useState(15000);
  const [account, setAccount] = useState('Meezan Bank');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const partyObj = parties.find((p) => p.id === partyId);

    onSubmit({
      date,
      partyId,
      partyName: partyObj ? partyObj.name : '',
      amount: Number(amount),
      account,
      description,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DatePicker label="Payment Date" value={date} onChange={setDate} required />
        <Select
          label="Party / Supplier"
          value={partyId}
          onChange={setPartyId}
          options={parties.map((p) => ({ value: p.id, label: `${p.name} (${p.city})` }))}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Payment Amount (PKR)"
          type="number"
          value={amount}
          onChange={setAmount}
          required
        />
        <Select
          label="Paid From Account"
          value={account}
          onChange={setAccount}
          options={accounts.map((a) => ({ value: a.name, label: a.name }))}
          required
        />
      </div>

      <Input
        label="Description / Note"
        value={description}
        onChange={setDescription}
        placeholder="e.g. Payment against purchase PUR-0001"
      />

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save Payment Entry
        </Button>
      </div>
    </form>
  );
}
