import React, { useState, useEffect } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import DatePicker from '../ui/DatePicker.jsx';
import TransactionItemsTable from './TransactionItemsTable.jsx';
import { fmt, getTodayStr } from '../../utils/formatters.js';

export default function PurchaseForm({
  suppliers = [],
  warehouses = [],
  items = [],
  qualities = [],
  accounts = [],
  onSubmit,
  onCancel,
}) {
  const [date, setDate] = useState(getTodayStr());
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('Cash');
  const [lineItems, setLineItems] = useState([
    {
      type: 'stock',
      itemId: items[0]?.id || '',
      itemName: items[0]?.name || '',
      quality: items[0]?.quality || 'Cotton A',
      unitType: 'KG',
      nugs: 0,
      nugFactor: items[0]?.piecesToKg || items[0]?.nugFactor || 100,
      qty: 100,
      rate: '',
      amount: 0,
      serviceDescription: '',
    },
  ]);
  const [paid, setPaid] = useState(0);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (suppliers.length > 0 && !supplierId) setSupplierId(suppliers[0].id);
    if (warehouses.length > 0 && !warehouseId) setWarehouseId(warehouses[0].id);
  }, [suppliers, warehouses]);

  const total = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const balance = total - Number(paid || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!supplierId) errs.supplierId = 'Supplier is required';
    if (!warehouseId) errs.warehouseId = 'Warehouse is required';

    const validItems = lineItems.filter(
      (it) => (it.type === 'service' && Number(it.amount) > 0) || (it.itemId && Number(it.qty) > 0)
    );
    if (validItems.length === 0) {
      errs.items = 'Please add at least one line item with valid quantity/amount';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const supplierObj = suppliers.find((s) => s.id === supplierId);
    const warehouseObj = warehouses.find((w) => w.id === warehouseId);

    onSubmit({
      date,
      supplierId,
      supplierName: supplierObj ? supplierObj.name : '',
      warehouseId,
      warehouseName: warehouseObj ? warehouseObj.name : '',
      paymentAccount,
      items: validItems,
      total,
      paid: Number(paid),
      balance,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DatePicker label="Purchase Date" value={date} onChange={setDate} required />
        <Select
          label="Supplier Account"
          value={supplierId}
          onChange={setSupplierId}
          options={suppliers.map((s) => ({ value: s.id, label: `${s.name} (${s.city})` }))}
          required
          error={errors.supplierId}
        />
        <Select
          label="Destination Warehouse"
          value={warehouseId}
          onChange={setWarehouseId}
          options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
          required
          error={errors.warehouseId}
        />
      </div>

      {/* Shared Line Items Component */}
      <TransactionItemsTable
        lineItems={lineItems}
        items={items}
        qualities={qualities}
        onChange={setLineItems}
        allowServices={false}
        error={errors.items}
      />

      {/* Calculation & Payment Settlement Footer */}
      <div className="p-4 bg-white rounded-xl border border-[#E0DBD3] grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-500 text-xs">Total Purchase Amount:</span>
          <div className="text-lg font-extrabold text-[#1E3A5F]">{fmt(total)}</div>
        </div>

        <div>
          <Input
            label="Amount Paid at Purchase (PKR)"
            type="number"
            value={paid}
            onChange={setPaid}
            placeholder="0"
          />
        </div>

        <div>
          <Select
            label="Paid From Account"
            value={paymentAccount}
            onChange={setPaymentAccount}
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
          <span className="text-gray-500 text-xs">Remaining Balance Owed:</span>
          <div className="text-lg font-bold text-red-600">{fmt(balance)}</div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save Purchase Invoice
        </Button>
      </div>
    </form>
  );
}
