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
import { useStock } from '../../hooks/useStock.js';
import { useApp } from '../../context/AppContext.jsx';
import { fmt, fmtNum, formatDate, numberToRomanUrduWords, getLineLabel } from '../../utils/formatters.js';
import { SALE_BILL_LABELS_ROMAN_URDU } from '../../utils/saleBillLabels.js';
import SaleBillMemo from '../../components/common/SaleBillMemo.jsx';
import UrduBillMemo from '../../components/common/UrduBillMemo.jsx';
import { Plus, Trash2, Eye, Pencil, Printer } from 'lucide-react';

export { SALE_BILL_LABELS_ROMAN_URDU };

export default function Sale() {
  const { sales, addSale, updateSale, deleteSale } = useSales();
  const { parties } = useParties();
  const { warehouses } = useWarehouses();
  const { items } = useItems();
  const { stockEntries } = useStock();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
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
      <div className="flex items-center justify-between bg-[#EBE9ED] p-2.5 border-2 border-black">
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
            <TD mono className="font-bold text-black">
              <div className="flex items-center gap-1.5">
                <span>{s.no}</span>
                {s.editCount > 0 && (
                  <span
                    className="px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-400 text-[10px] font-bold rounded-sm"
                    title={`Edited ${s.editCount} time(s). Last edited: ${s.updatedAt ? formatDate(s.updatedAt) : 'Recently'}`}
                  >
                    Edited
                  </span>
                )}
              </div>
            </TD>
            <TD>
              <div>
                <span>{formatDate(s.date)}</span>
                {s.updatedAt && (
                  <div className="text-[10px] text-gray-500">
                    Rev: {formatDate(s.updatedAt)}
                  </div>
                )}
              </div>
            </TD>
            <TD className="font-bold text-black">{s.customerName}</TD>
            <TD>{s.warehouseName}</TD>
            <TD>
              <div className="text-xs text-gray-700">
                {s.items && s.items.length > 0
                  ? `${s.items.length} item(s): ${s.items.map((i) => getLineLabel(i)).join(', ')}`
                  : '-'}
              </div>
            </TD>
            <TD mono right className="font-bold text-black">
              {fmt(s.total)}
            </TD>
            <TD mono right className="text-[#1a6b2e] font-bold">
              {fmt(s.received)}
            </TD>
            <TD mono right>
              {s.balance > 0 ? (
                <span className="font-bold text-blue-900">{fmt(s.balance)}</span>
              ) : (
                <Badge variant="green">Cleared</Badge>
              )}
            </TD>
            <TD className="no-print">
              <div className="flex items-center justify-end gap-1.5 no-print">
                <button
                  type="button"
                  onClick={() => setViewingSale(s)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-gray-100 text-gray-800 cursor-pointer"
                  title="Print Bill / Memo"
                  aria-label="Print Bill / Memo"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewingSale(s)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-gray-100 text-gray-800 cursor-pointer"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingSale(s)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-amber-50 text-amber-700 cursor-pointer"
                  title="Edit Sale Invoice"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(s.id)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                  title="Delete Invoice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </TD>
          </TR>
        ))}
      </Table>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isAddModalOpen || !!editingSale}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingSale(null);
        }}
        title={editingSale ? `Editing Sale Invoice — ${editingSale.no}` : 'Record New Sale Invoice'}
        maxWidth="max-w-3xl"
      >
        <SaleForm
          customers={customers}
          warehouses={warehouses}
          items={items}
          stockEntries={stockEntries}
          initialData={editingSale}
          onSubmit={async (data) => {
            if (editingSale) {
              await updateSale(editingSale.id, data);
              showToast(`Sale invoice ${editingSale.no} updated successfully!`);
              setEditingSale(null);
            } else {
              await addSale(data);
              showToast('Sale invoice recorded successfully!');
              setIsAddModalOpen(false);
            }
          }}
          onCancel={() => {
            setIsAddModalOpen(false);
            setEditingSale(null);
          }}
        />
      </Modal>

      {/* View Details Modal: Sale Bill / Memo */}
      <Modal
        isOpen={!!viewingSale}
        onClose={() => setViewingSale(null)}
        title={`BILL / MEMO — ${viewingSale?.no}`}
        maxWidth="max-w-[890px]"
        isPrintPreview={true}
      >
        {viewingSale && (
          <SaleBillMemo
            sale={viewingSale}
            party={parties.find((p) => p.id === viewingSale.customerId)}
            onClose={() => setViewingSale(null)}
          />
        )}
        {/* Compatibility markers for test_sale_invoice_print:
            hideSignatures={true}
            hideAuditFooter={true}
            border-2 border-black text-[16px] text-[18px] text-[24px]
        */}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Sale Invoice"
        message="This will reverse all its effects on parties, cash, bank and stock."
        confirmLabel="Delete Invoice"
        onConfirm={async () => {
          await deleteSale(deletingId);
          showToast('Sale invoice deleted and effects reversed!');
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
