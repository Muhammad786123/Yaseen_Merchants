import React, { useState, useEffect } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import DatePicker from '../ui/DatePicker.jsx';
import { getTodayStr } from '../../utils/formatters.js';

export default function ReceiptForm({ parties = [], accounts = [], initialData = null, onSubmit, onCancel }) {
  const [date, setDate] = useState(() => initialData?.date || getTodayStr());
  const [partyId, setPartyId] = useState(() => initialData?.partyId || parties[0]?.id || '');
  const [amount, setAmount] = useState(() => (initialData ? initialData.amount : 10000));
  const [account, setAccount] = useState(() => initialData?.account || accounts[0]?.name || 'Cash');
  const [description, setDescription] = useState(() => initialData?.description || '');

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date || getTodayStr());
      setPartyId(initialData.partyId || '');
      setAmount(initialData.amount || 0);
      setAccount(initialData.account || 'Cash');
      setDescription(initialData.description || '');
    }
  }, [initialData]);

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
        <DatePicker label="Receipt Date" value={date} onChange={setDate} required />
        <Select
          label="Party / Customer"
          value={partyId}
          onChange={setPartyId}
          options={parties.map((p) => ({ value: p.id, label: `${p.name} (${p.city || 'City'})` }))}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Amount Received (PKR)"
          type="number"
          value={amount}
          onChange={setAmount}
          required
        />
        <Select
          label="Received Into Account"
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
        placeholder="e.g. Payment against invoice #SAL-0001"
      />

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initialData ? 'Update Receipt' : 'Save Cash Receipt'}
        </Button>
      </div>
    </form>
  );
}
