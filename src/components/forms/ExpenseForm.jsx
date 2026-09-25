import React, { useState } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import DatePicker from '../ui/DatePicker.jsx';
import { getTodayStr } from '../../utils/formatters.js';

export default function ExpenseForm({ accounts = [], onSubmit, onCancel }) {
  const [date, setDate] = useState(getTodayStr());
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Labour');
  const [amount, setAmount] = useState(5000);
  const [account, setAccount] = useState('Cash');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      date,
      description,
      category,
      amount: Number(amount),
      account,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DatePicker label="Expense Date" value={date} onChange={setDate} required />
        <Select
          label="Expense Category"
          value={category}
          onChange={setCategory}
          options={[
            { value: 'Jati Kharcha', label: 'Jati Kharcha (Running / Operating Expenses)' },
            { value: 'Labour', label: 'Labour / Wages' },
            { value: 'Electricity Bill', label: 'Electricity Bill' },
            { value: 'Godown Rent', label: 'Godown Rent' },
            { value: 'Factory Rent', label: 'Factory Rent' },
            { value: 'Safar', label: 'Safar (Travelling Expenses)' },
            { value: 'Machinery Repair', label: 'Machinery Repair / Maintenance' },
            { value: 'Transport', label: 'Transport / Freight' },
            { value: 'Admin', label: 'Admin & Office' },
            { value: 'Other', label: 'Other Expense' },
          ]}
          required
        />
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Expense Amount (PKR)"
          type="number"
          value={amount}
          onChange={setAmount}
          required
        />
        <Select
          label="Payment Source Account"
          value={account}
          onChange={setAccount}
          options={accounts.map((a) => ({ value: a.name, label: a.name }))}
          required
        />
      </div>

      <Input
        label="Expense Details"
        value={description}
        onChange={setDescription}
        placeholder="e.g. Daily wages for sorting department"
        required
      />

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Record Expense
        </Button>
      </div>
    </form>
  );
}
