import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Button from '../../components/ui/Button.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import PurchaseForm from '../../components/forms/PurchaseForm.jsx';
import { usePurchases } from '../../hooks/usePurchases.js';
import { useParties } from '../../hooks/useParties.js';
import { useWarehouses } from '../../hooks/useWarehouses.js';
import { useItems } from '../../hooks/useItems.js';
import { useApp } from '../../context/AppContext.jsx';
import { fmt, formatDate } from '../../utils/formatters.js';
import { Plus, Trash2, Eye } from 'lucide-react';

export default function Purchase() {
  const { purchases, addPurchase, deletePurchase } = usePurchases();
  const { parties } = useParties();
  const { warehouses } = useWarehouses();
  const { items } = useItems();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const suppliers = parties.filter((p) => p.type === 'Supplier' || p.type === 'Both');

  const filteredPurchases = purchases.filter(
    (p) =>
      p.no.toLowerCase().includes(search.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      p.warehouseName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Invoices"
        subtitle="Record raw cotton waste purchases from suppliers into warehouses"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
            New Purchase Invoice
          </Button>
        }
      />

      {/* Search Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#E0DBD3]">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by PUR #, supplier or warehouse..."
          className="w-full sm:w-80"
        />
      </div>

      {/* Table */}
      <Table
        headers={[
          'Invoice #',
          'Date',
          'Supplier',
          'Warehouse',
          'Items Summary',
          'Total Amount',
          'Paid',
          'Balance',
          'Actions',
        ]}
        emptyText="No purchase invoices found."
      >
        {filteredPurchases.map((p) => (
          <TR key={p.id}>
            <TD mono className="font-bold text-[#1E3A5F]">
              {p.no}
            </TD>
            <TD>{formatDate(p.date)}</TD>
            <TD className="font-medium text-gray-900">{p.supplierName}</TD>
            <TD>{p.warehouseName}</TD>
            <TD>
              <div className="text-xs text-gray-600">
                {p.items && p.items.length > 0
                  ? `${p.items.length} item(s): ${p.items.map((i) => i.itemName).join(', ')}`
                  : '-'}
              </div>
            </TD>
            <TD mono right className="font-bold text-[#1E3A5F]">
              {fmt(p.total)}
            </TD>
            <TD mono right className="text-emerald-600">
              {fmt(p.paid)}
            </TD>
            <TD mono right>
              {p.balance > 0 ? (
                <span className="font-bold text-red-600">{fmt(p.balance)}</span>
              ) : (
                <Badge variant="green">Paid</Badge>
              )}
            </TD>
            <TD>
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => setViewingPurchase(p)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-[#1E3A5F]"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(p.id)}
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
        title="Record New Purchase Invoice"
        maxWidth="max-w-3xl"
      >
        <PurchaseForm
          suppliers={suppliers}
          warehouses={warehouses}
          items={items}
          onSubmit={async (data) => {
            await addPurchase(data);
            showToast('Purchase invoice recorded successfully!');
            setIsAddModalOpen(false);
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewingPurchase}
        onClose={() => setViewingPurchase(null)}
        title={`Purchase Invoice - ${viewingPurchase?.no}`}
        maxWidth="max-w-2xl"
      >
        {viewingPurchase && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs bg-[#FAF9F7] p-3 rounded-lg border border-[#E0DBD3]">
              <div>
                <span className="text-gray-500">Supplier:</span>
                <div className="font-bold text-[#1E3A5F]">{viewingPurchase.supplierName}</div>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <div className="font-bold">{formatDate(viewingPurchase.date)}</div>
              </div>
              <div>
                <span className="text-gray-500">Destination Warehouse:</span>
                <div className="font-bold">{viewingPurchase.warehouseName}</div>
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
                  {viewingPurchase.items?.map((it, idx) => (
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
              <div>Total: {fmt(viewingPurchase.total)}</div>
              <div>Paid: {fmt(viewingPurchase.paid)}</div>
              <div className="text-red-600 font-bold">Balance: {fmt(viewingPurchase.balance)}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Purchase Invoice"
        message="Are you sure you want to delete this purchase invoice?"
        onConfirm={async () => {
          await deletePurchase(deletingId);
          showToast('Purchase invoice deleted!');
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
