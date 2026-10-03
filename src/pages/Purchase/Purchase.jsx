import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import PrintDocument from '../../components/common/PrintDocument.jsx';
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
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#E0DBD3] no-print">
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
        maxWidth="max-w-3xl"
      >
        {viewingPurchase && (
          <PrintDocument
            id="invoice-print-area"
            title="PURCHASE INVOICE"
            documentNo={viewingPurchase.no}
            date={formatDate(viewingPurchase.date)}
            actionTitle={`Purchase Invoice — ${viewingPurchase.no}`}
            printButtonText="Print Invoice"
            metadata={[
              { label: 'Supplier', value: viewingPurchase.supplierName },
              { label: 'Destination Warehouse', value: viewingPurchase.warehouseName || 'Warehouse 1' },
            ]}
            summary={
              <div className="flex justify-end pt-1">
                <div className="w-72 space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 px-2 border-b border-gray-300">
                    <span className="text-gray-600 font-medium">Total Amount:</span>
                    <span className="font-mono font-bold text-gray-900">{fmt(viewingPurchase.total)}</span>
                  </div>
                  <div className="flex justify-between py-1 px-2 border-b border-gray-300">
                    <span className="text-gray-600 font-medium">Paid Amount:</span>
                    <span className="font-mono font-bold text-emerald-700">{fmt(viewingPurchase.paid)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg border-2 border-red-500 bg-red-50/60 text-red-700 mt-2">
                    <span className="font-black text-sm uppercase tracking-wide">Balance Due:</span>
                    <span className="font-mono font-black text-base">{fmt(viewingPurchase.balance)}</span>
                  </div>
                </div>
              </div>
            }
            signatures={[
              { label: 'Prepared By', sub: 'Accountant / Data Entry' },
              { label: 'Verified By', sub: 'Warehouse / Store Incharge' },
              { label: 'Authorized By', sub: 'Proprietor / Shahid Yaseen' },
            ]}
          >
            <div className="mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Line Items</h4>
              <table
                className="invoice-table print-table w-full text-xs text-left border-collapse border border-gray-400"
                style={{ width: '100%', borderCollapse: 'collapse' }}
              >
                <thead>
                  <tr className="bg-[#F0EDE8] border-b border-gray-400 text-[#1E3A5F]">
                    <th className="p-2 font-bold border border-gray-400 w-12 text-center">#</th>
                    <th className="p-2 font-bold border border-gray-400">Item Name</th>
                    <th className="p-2 font-bold border border-gray-400">Quality</th>
                    <th className="p-2 font-bold border border-gray-400 text-right">Qty (KG)</th>
                    <th className="p-2 font-bold border border-gray-400 text-right">Rate (Rs)</th>
                    <th className="p-2 font-bold border border-gray-400 text-right">Amount (Rs)</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingPurchase.items?.map((it, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                      <td className="p-2 border border-gray-400 text-center font-mono text-gray-500">{idx + 1}</td>
                      <td className="p-2 border border-gray-400 font-semibold text-gray-900">{it.itemName}</td>
                      <td className="p-2 border border-gray-400 text-gray-700">{it.quality}</td>
                      <td className="p-2 border border-gray-400 text-right font-mono font-medium">{it.qty}</td>
                      <td className="p-2 border border-gray-400 text-right font-mono">{fmt(it.rate)}</td>
                      <td className="p-2 border border-gray-400 text-right font-mono font-bold text-[#1E3A5F]">
                        {fmt(it.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PrintDocument>
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
