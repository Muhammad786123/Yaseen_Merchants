import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import PrintDocument from '../../components/common/PrintDocument.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Button from '../../components/ui/Button.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import PaymentForm from '../../components/forms/PaymentForm.jsx';
import { useFinances } from '../../hooks/useFinances.js';
import { useParties } from '../../hooks/useParties.js';
import { useApp } from '../../context/AppContext.jsx';
import { fmt, formatDate } from '../../utils/formatters.js';
import { Plus, Trash2, Eye, Pencil } from 'lucide-react';

export default function Payment() {
  const { payments, accounts, addPayment, updatePayment, deletePayment } = useFinances();
  const { parties } = useParties();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingPayment, setViewingPayment] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const suppliers = parties.filter((p) => p.type === 'Supplier' || p.type === 'Both');

  const filtered = payments.filter(
    (p) =>
      p.no.toLowerCase().includes(search.toLowerCase()) ||
      p.partyName.toLowerCase().includes(search.toLowerCase()) ||
      p.account.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Payments"
        subtitle="Manage settlements, advances, and outgoing payments to suppliers"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
            Record Payment
          </Button>
        }
      />

      <div className="flex items-center justify-between bg-[#FAF9F7] p-4 rounded-xl border border-[#E0DBD3] no-print">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by PAY #, supplier or account..."
          className="w-full sm:w-80"
        />
      </div>

      <Table
        headers={['Payment #', 'Date', 'Supplier / Party', 'Paid Account', 'Description', 'Amount', 'Actions']}
        emptyText="No payments found."
      >
        {filtered.map((p) => (
          <TR key={p.id}>
            <TD mono className="font-bold text-[#1E3A5F]">
              <div className="flex items-center gap-1.5">
                <span>{p.no}</span>
                {p.editCount > 0 && (
                  <span
                    className="px-1 py-0.2 bg-amber-100 text-amber-800 border border-amber-400 text-[9px] font-bold rounded-sm"
                    title={`Edited ${p.editCount} time(s). Last edited: ${p.updatedAt ? formatDate(p.updatedAt) : 'Recently'}`}
                  >
                    Edited
                  </span>
                )}
              </div>
            </TD>
            <TD>{formatDate(p.date)}</TD>
            <TD className="font-semibold text-gray-900">{p.partyName}</TD>
            <TD>
              <Badge variant="orange">{p.account}</Badge>
            </TD>
            <TD className="text-gray-500 text-xs">{p.description || '-'}</TD>
            <TD mono right className="font-bold text-red-600">{fmt(p.amount)}</TD>
            <TD>
              <div className="flex items-center justify-end gap-1.5 no-print">
                <button
                  type="button"
                  onClick={() => setViewingPayment(p)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-gray-100 text-gray-700 cursor-pointer"
                  title="View Payment Slip"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPayment(p)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-amber-50 text-amber-700 cursor-pointer"
                  title="Edit Payment"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingId(p.id)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                  title="Delete Payment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </TD>
          </TR>
        ))}
      </Table>

      {/* Add / Edit Payment Modal */}
      <Modal
        isOpen={isAddModalOpen || !!editingPayment}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingPayment(null);
        }}
        title={editingPayment ? `Editing Payment Voucher — ${editingPayment.no}` : 'Record New Supplier Payment'}
      >
        <PaymentForm
          parties={suppliers}
          accounts={accounts}
          initialData={editingPayment}
          onSubmit={async (data) => {
            if (editingPayment) {
              await updatePayment(editingPayment.id, data);
              showToast(`Payment ${editingPayment.no} updated successfully!`);
              setEditingPayment(null);
            } else {
              await addPayment(data);
              showToast('Payment recorded successfully!');
              setIsAddModalOpen(false);
            }
          }}
          onCancel={() => {
            setIsAddModalOpen(false);
            setEditingPayment(null);
          }}
        />
      </Modal>

      {/* View Voucher Modal */}
      <Modal
        isOpen={!!viewingPayment}
        onClose={() => setViewingPayment(null)}
        title={`Payment Voucher - ${viewingPayment?.no}`}
        maxWidth="max-w-[96vw]"
        isPrintPreview={true}
      >
        {viewingPayment && (
          <PrintDocument
            id="payment-print-area"
            title="PAYMENT VOUCHER"
            documentNo={viewingPayment.no}
            date={formatDate(viewingPayment.date)}
            actionTitle={`Payment Voucher — ${viewingPayment.no}`}
            printButtonText="Print Voucher"
            metadata={[
              { label: 'Paid To (Supplier / Beneficiary)', value: viewingPayment.partyName },
              { label: 'Paid From Account', value: viewingPayment.account || 'Cash Account' },
            ]}
            signatures={[
              { label: 'Paid By', sub: 'Cashier / Accounts' },
              { label: 'Verified By', sub: 'Senior Accountant' },
              { label: 'Authorized By', sub: 'Proprietor / Shahid Yaseen' },
            ]}
          >
            <div className="p-4 rounded-xl border-2 border-red-500 bg-red-50/50 mb-4 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-red-800 block">Amount Paid (Debit)</span>
                <span className="text-xs text-gray-600">Disbursed from account against supplier balance</span>
              </div>
              <span className="text-3xl font-black font-mono text-red-800">{fmt(viewingPayment.amount)}</span>
            </div>
            {viewingPayment.description && (
              <div className="mb-4 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <span className="font-bold text-gray-900 block mb-0.5">Remarks / Details:</span>
                {viewingPayment.description}
              </div>
            )}
          </PrintDocument>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Payment Record"
        message="Are you sure you want to delete this payment? This will reverse all effects on supplier balance, cash and bank."
        confirmLabel="Delete Payment"
        onConfirm={async () => {
          await deletePayment(deletingId);
          showToast('Payment deleted and effects reversed!');
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
