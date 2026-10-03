import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import PrintDocument from '../../components/common/PrintDocument.jsx';
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
        maxWidth="max-w-3xl"
      >
        {viewingSale && (
          <PrintDocument
            id="sale-invoice-print-area"
            title="SALE INVOICE"
            documentNo={viewingSale.no}
            date={formatDate(viewingSale.date)}
            actionTitle={`Sale Invoice — ${viewingSale.no}`}
            printButtonText="Print Invoice"
            metadata={[
              { label: 'Customer', value: viewingSale.customerName },
              { label: 'Source Warehouse', value: viewingSale.warehouseName || 'Warehouse 1' },
            ]}
            summary={
              <div className="flex justify-end pt-1">
                <div className="w-72 space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 px-2 border-b border-gray-300">
                    <span className="text-gray-600 font-medium">Total Bill:</span>
                    <span className="font-mono font-bold text-gray-900">{fmt(viewingSale.total)}</span>
                  </div>
                  <div className="flex justify-between py-1 px-2 border-b border-gray-300">
                    <span className="text-gray-600 font-medium">Received Amount:</span>
                    <span className="font-mono font-bold text-emerald-700">{fmt(viewingSale.received)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg border-2 border-emerald-500 bg-emerald-50/60 text-emerald-800 mt-2">
                    <span className="font-black text-sm uppercase tracking-wide">Balance Receivable:</span>
                    <span className="font-mono font-black text-base">{fmt(viewingSale.balance)}</span>
                  </div>
                </div>
              </div>
            }
            signatures={[
              { label: 'Prepared By', sub: 'Billing Desk / Accountant' },
              { label: 'Verified By', sub: 'Sales / Dispatch Manager' },
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
                  {viewingSale.items?.map((it, idx) => (
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
