import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Button from '../../components/ui/Button.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import SaleForm from '../../components/forms/SaleForm.jsx';
import { useSales } from '../../hooks/useSales.js';
import { useParties } from '../../hooks/useParties.js';
import { useWarehouses } from '../../hooks/useWarehouses.js';
import { useItems } from '../../hooks/useItems.js';
import { useApp } from '../../context/AppContext.jsx';
import { fmt, formatDate } from '../../utils/formatters.js';
import { Plus, Trash2, Eye } from 'lucide-react';

export default function Sale() {
  const { sales, addSale, deleteSale } = useSales();
  const { parties } = useParties();
  const { warehouses } = useWarehouses();
  const { items } = useItems();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const customers = parties.filter((p) => p.type === 'Customer' || p.type === 'Both');

  const filteredSales = sales.filter(
    (s) =>
      s.no.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      s.warehouseName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sale Invoices"
        subtitle="Record finished goods & processed cotton sales to buyers"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
            New Sale Invoice
          </Button>
        }
      />

      {/* Search Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#E0DBD3]">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by SAL #, customer or warehouse..."
          className="w-full sm:w-80"
        />
      </div>

      {/* Table */}
      <Table
        headers={[
          'Invoice #',
          'Date',
          'Customer',
          'Warehouse',
          'Items Summary',
          'Total Amount',
          'Received',
          'Balance',
          'Actions',
        ]}
        emptyText="No sale invoices found."
      >
        {filteredSales.map((s) => (
          <TR key={s.id}>
            <TD mono className="font-bold text-[#1E3A5F]">
              {s.no}
            </TD>
            <TD>{formatDate(s.date)}</TD>
            <TD className="font-medium text-gray-900">{s.customerName}</TD>
            <TD>{s.warehouseName}</TD>
            <TD>
              <div className="text-xs text-gray-600">
                {s.items && s.items.length > 0
                  ? `${s.items.length} item(s): ${s.items.map((i) => i.itemName).join(', ')}`
                  : '-'}
              </div>
            </TD>
            <TD mono right className="font-bold text-[#1E3A5F]">
              {fmt(s.total)}
            </TD>
            <TD mono right className="text-emerald-600">
              {fmt(s.received)}
            </TD>
            <TD mono right>
              {s.balance > 0 ? (
                <span className="font-bold text-emerald-600">{fmt(s.balance)}</span>
              ) : (
                <Badge variant="green">Cleared</Badge>
              )}
            </TD>
            <TD>
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => setViewingSale(s)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-[#1E3A5F]"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(s.id)}
                  className="p-1.5 hover:bg-red-50 rounded text-red-500"
                  title="Delete Invoice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </TD>
          </TR>
        ))}
      </Table>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record New Sale Invoice"
        maxWidth="max-w-3xl"
      >
        <SaleForm
          customers={customers}
          warehouses={warehouses}
          items={items}
          onSubmit={async (data) => {
            await addSale(data);
            showToast('Sale invoice recorded successfully!');
            setIsAddModalOpen(false);
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingSale}
        onClose={() => setViewingSale(null)}
        title={`Sale Invoice - ${viewingSale?.no}`}
        maxWidth="max-w-2xl"
      >
        {viewingSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs bg-[#FAF9F7] p-3 rounded-lg border border-[#E0DBD3]">
              <div>
                <span className="text-gray-500">Customer:</span>
                <div className="font-bold text-[#1E3A5F]">{viewingSale.customerName}</div>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <div className="font-bold">{formatDate(viewingSale.date)}</div>
              </div>
              <div>
                <span className="text-gray-500">Source Warehouse:</span>
                <div className="font-bold">{viewingSale.warehouseName}</div>
              </div>
            </div>

            <h4 className="text-xs font-bold uppercase text-gray-500">Line Items</h4>
            <div className="border border-[#E0DBD3] rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F5F4F0] border-b border-[#E0DBD3]">
                  <tr>
                    <th className="p-2 font-semibold">Item</th>
                    <th className="p-2 font-semibold">Quality</th>
                    <th className="p-2 font-semibold text-right">Qty</th>
                    <th className="p-2 font-semibold text-right">Rate</th>
                    <th className="p-2 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDE8]">
                  {viewingSale.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium">{it.itemName}</td>
                      <td className="p-2">{it.quality}</td>
                      <td className="p-2 text-right">{it.qty}</td>
                      <td className="p-2 text-right">{fmt(it.rate)}</td>
                      <td className="p-2 text-right font-bold text-[#1E3A5F]">{fmt(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 font-semibold text-gray-700">
              <div>Total Bill: {fmt(viewingSale.total)}</div>
              <div>Received: {fmt(viewingSale.received)}</div>
              <div className="text-emerald-600 font-bold">Balance Receivable: {fmt(viewingSale.balance)}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Sale Invoice"
        message="Are you sure you want to delete this sale invoice?"
        onConfirm={async () => {
          await deleteSale(deletingId);
          showToast('Sale invoice deleted!');
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
