import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import PrintDocument from '../../components/common/PrintDocument.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Button from '../../components/ui/Button.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import ReceiptForm from '../../components/forms/ReceiptForm.jsx';
import { useFinances } from '../../hooks/useFinances.js';
import { useParties } from '../../hooks/useParties.js';
import { useApp } from '../../context/AppContext.jsx';
import { fmt, formatDate } from '../../utils/formatters.js';
import { Plus, Trash2, Eye, Pencil } from 'lucide-react';

export default function Receipt() {
  const { receipts, accounts, addReceipt, updateReceipt, deleteReceipt } = useFinances();
  const { parties } = useParties();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const customers = parties.filter((p) => p.type === 'Customer' || p.type === 'Both');

  const filtered = receipts.filter(
    (r) =>
      r.no.toLowerCase().includes(search.toLowerCase()) ||
      r.partyName.toLowerCase().includes(search.toLowerCase()) ||
      r.account.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash & Bank Receipts"
        subtitle="Record payments received from customers and buyers"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
            Record Receipt
          </Button>
        }
      />

      <div className="flex items-center justify-between bg-[#FAF9F7] p-4 rounded-xl border border-[#E0DBD3] no-print">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by RCT #, party or account..."
          className="w-full sm:w-80"
        />
      </div>

      <Table
        headers={['Receipt #', 'Date', 'Customer / Party', 'Account Received', 'Description', 'Amount', 'Actions']}
        emptyText="No receipts found."
      >
        {filtered.map((r) => (
          <TR key={r.id}>
            <TD mono className="font-bold text-[#1E3A5F]">
              <div className="flex items-center gap-1.5">
                <span>{r.no}</span>
                {r.editCount > 0 && (
                  <span
                    className="px-1 py-0.2 bg-amber-100 text-amber-800 border border-amber-400 text-[9px] font-bold rounded-sm"
                    title={`Edited ${r.editCount} time(s). Last edited: ${r.updatedAt ? formatDate(r.updatedAt) : 'Recently'}`}
                  >
                    Edited
                  </span>
                )}
              </div>
            </TD>
            <TD>{formatDate(r.date)}</TD>
            <TD className="font-semibold text-gray-900">{r.partyName}</TD>
            <TD>
              <Badge variant="blue">{r.account}</Badge>
            </TD>
            <TD className="text-gray-500 text-xs">{r.description || '-'}</TD>
            <TD mono right className="font-bold text-emerald-600">{fmt(r.amount)}</TD>
            <TD>
              <div className="flex items-center justify-end gap-1.5 no-print">
                <button
                  type="button"
                  onClick={() => setViewingReceipt(r)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-gray-100 text-gray-700 cursor-pointer"
                  title="View Receipt Slip"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingReceipt(r)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-amber-50 text-amber-700 cursor-pointer"
                  title="Edit Receipt"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingId(r.id)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                  title="Delete Receipt"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </TD>
          </TR>
        ))}
      </Table>

      {/* Add / Edit Receipt Modal */}
      <Modal
        isOpen={isAddModalOpen || !!editingReceipt}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingReceipt(null);
        }}
        title={editingReceipt ? `Editing Receipt Voucher — ${editingReceipt.no}` : 'Record New Cash Receipt'}
      >
        <ReceiptForm
          parties={customers}
          accounts={accounts}
          initialData={editingReceipt}
          onSubmit={async (data) => {
            if (editingReceipt) {
              await updateReceipt(editingReceipt.id, data);
              showToast(`Receipt ${editingReceipt.no} updated successfully!`);
              setEditingReceipt(null);
            } else {
              await addReceipt(data);
              showToast('Receipt recorded successfully!');
              setIsAddModalOpen(false);
            }
          }}
          onCancel={() => {
            setIsAddModalOpen(false);
            setEditingReceipt(null);
          }}
        />
      </Modal>

      {/* View Voucher Modal */}
      <Modal
        isOpen={!!viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        title={`Receipt Voucher - ${viewingReceipt?.no}`}
        maxWidth="max-w-[96vw]"
        isPrintPreview={true}
      >
        {viewingReceipt && (
          <PrintDocument
            id="receipt-print-area"
            title="RECEIPT VOUCHER"
            documentNo={viewingReceipt.no}
            date={formatDate(viewingReceipt.date)}
            actionTitle={`Receipt Voucher — ${viewingReceipt.no}`}
            printButtonText="Print Voucher"
            metadata={[
              { label: 'Received From (Customer / Payer)', value: viewingReceipt.partyName },
              { label: 'Deposit Account', value: viewingReceipt.account || 'Cash Account' },
            ]}
            signatures={[
              { label: 'Received By', sub: 'Cashier / Accounts' },
              { label: 'Verified By', sub: 'Senior Accountant' },
              { label: 'Authorized By', sub: 'Proprietor / Shahid Yaseen' },
            ]}
          >
            <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/50 mb-4 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-800 block">Amount Received (Credit)</span>
                <span className="text-xs text-gray-600">Deposited into account against customer balance</span>
              </div>
              <span className="text-3xl font-black font-mono text-emerald-800">{fmt(viewingReceipt.amount)}</span>
            </div>
            {viewingReceipt.description && (
              <div className="mb-4 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="font-bold text-gray-900 block mb-0.5">Remarks / Details:</span>
                {viewingReceipt.description}
              </div>
            )}
          </PrintDocument>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Receipt Record"
        message="Are you sure you want to delete this receipt? This will reverse all effects on customer balance, cash and bank."
        confirmLabel="Delete Receipt"
        onConfirm={async () => {
          await deleteReceipt(deletingId);
          showToast('Receipt deleted and effects reversed!');
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
