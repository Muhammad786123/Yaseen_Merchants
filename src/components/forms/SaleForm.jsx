import React, { useState, useEffect } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import DatePicker from '../ui/DatePicker.jsx';
import TransactionItemsTable from './TransactionItemsTable.jsx';
import { fmt, getTodayStr } from '../../utils/formatters.js';

export default function SaleForm({
  customers = [],
  warehouses = [],
  items = [],
  qualities = [],
  accounts = [],
  stockEntries = [],
  initialData = null,
  onSubmit,
  onCancel,
}) {
  const [date, setDate] = useState(initialData?.date || getTodayStr());
  const [customerId, setCustomerId] = useState(initialData?.customerId || '');
  const [warehouseId, setWarehouseId] = useState(initialData?.warehouseId || '');
  const [receivedAccount, setReceivedAccount] = useState(initialData?.receivedAccount || 'Cash');
  const [lineItems, setLineItems] = useState(() => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items.map((it) => ({
        ...it,
        type: it.type || 'stock',
        unitType: 'KG',
        count: it.count !== undefined && it.count !== null && it.count !== '' ? Number(it.count) : '',
        qty: it.qty !== undefined ? it.qty : '',
      }));
    }
    return [
      {
        type: 'stock',
        itemId: items[0]?.id || '',
        itemName: items[0]?.name || '',
        quality: items[0]?.quality || '',
        unitType: 'KG',
        count: '',
        qty: '',
        rate: '',
        amount: 0,
        serviceDescription: '',
      },
    ];
  });
  const [received, setReceived] = useState(initialData?.received !== undefined ? initialData.received : 0);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!initialData) {
      if (customers.length > 0 && !customerId) setCustomerId(customers[0].id);
    }
  }, [customers, initialData]);

  const total = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const balance = total - Number(received || 0);

  const doSubmit = () => {
    const customerObj = customers.find((c) => c.id === customerId);
    const validItems = lineItems
      .filter((it) => (it.type === 'service' && Number(it.amount) > 0) || (it.itemId && Number(it.qty) > 0))
      .map((it) => {
        if (it.type === 'service') return it;
        return {
          ...it,
          count: it.count !== '' && it.count !== undefined && it.count !== null && !isNaN(Number(it.count))
            ? Number(it.count)
            : '',
        };
      });

    const accObj = accounts.find((a) => a.name === receivedAccount || a.id === receivedAccount);
    onSubmit({
      date,
      customerId,
      customerName: customerObj ? customerObj.name : '',
      warehouseId: initialData?.warehouseId || '',
      warehouseName: initialData?.warehouseName || '',
      receivedAccountId: accObj ? accObj.id : null,
      receivedAccount: accObj ? accObj.name : receivedAccount,
      items: validItems,
      total,
      received: Number(received),
      balance,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!customerId) errs.customerId = 'Customer is required';

    const validItems = lineItems.filter(
      (it) => (it.type === 'service' && Number(it.amount) > 0) || (it.itemId && Number(it.qty) > 0)
    );
    if (validItems.length === 0) {
      errs.items = 'Please add at least one line item or service with valid quantity/amount';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    doSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DatePicker label="Sale Date" value={date} onChange={setDate} required />
        <Select
          label="Customer Account"
          value={customerId}
          onChange={setCustomerId}
          options={customers.map((c) => ({ value: c.id, label: `${c.name} (${c.city})` }))}
          required
          error={errors.customerId}
        />
      </div>

      {/* Shared Line Items Component with Service Support */}
      <TransactionItemsTable
        lineItems={lineItems}
        items={items}
        qualities={qualities}
        stockEntries={stockEntries}
        showStockAvailability={false}
        onChange={setLineItems}
        allowServices={true}
        error={errors.items}
      />

      {/* Calculation & Receipt Settlement Footer */}
      <div className="p-4 bg-white rounded-xl border border-[#E0DBD3] grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-500 text-xs">Total Sale Invoice:</span>
          <div className="text-lg font-extrabold text-[#1E3A5F]">{fmt(total)}</div>
        </div>

        <div>
          <Input
            label="Amount Received at Sale (PKR)"
            type="number"
            value={received}
            onChange={setReceived}
            placeholder="0"
          />
        </div>

        <div>
          <Select
            label="Received Into Account"
            value={receivedAccount}
            onChange={setReceivedAccount}
            options={[
              { value: 'Cash', label: 'Cash Book' },
              ...(accounts.filter((a) => !a.name.toLowerCase().includes('cash')).map((a) => ({
                value: a.name,
                label: a.name,
              }))),
            ]}
          />
        </div>

        <div>
          <span className="text-gray-500 text-xs">Balance Receivable:</span>
          <div className="text-lg font-bold text-emerald-600">{fmt(balance)}</div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initialData ? 'Update Sale Invoice' : 'Save Sale Invoice'}
        </Button>
      </div>
    </form>
  );
}
