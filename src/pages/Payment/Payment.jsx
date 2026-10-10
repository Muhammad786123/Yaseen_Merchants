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
import { Plus, Trash2, Eye } from 'lucide-react';

export default function Payment() {
  const { payments, accounts, addPayment, deletePayment } = useFinances();
  const { parties } = useParties();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingPayment, setViewingPayment] = useState(null);
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
        subtitle="Record payments made to raw material suppliers and vendors"
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
        headers={['Payment #', 'Date', 'Supplier / Party', 'Payment Source', 'Description', 'Amount', 'Actions']}
        emptyText="No payments found."
      >
        {filtered.map((p) => (
          <TR key={p.id}>
            <TD mono className="font-bold text-[#1E3A5F]">{p.no}</TD>
            <TD>{formatDate(p.date)}</TD>
            <TD className="font-semibold text-gray-900">{p.partyName}</TD>
            <TD>
              <Badge variant="orange">{p.account}</Badge>
            </TD>
            <TD className="text-gray-500 text-xs">{p.description || '-'}</TD>
            <TD mono right className="font-bold text-red-600">{fmt(p.amount)}</TD>
            <TD>
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => setViewingPayment(p)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-[#1E3A5F]"
                  title="View Voucher"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(p.id)}
                  className="p-1.5 hover:bg-red-50 rounded text-red-500"
                  title="Delete Payment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </TD>
          </TR>
        ))}
      </Table>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Supplier Payment"
      >
        <PaymentForm
          parties={suppliers}
          accounts={accounts}
          onSubmit={async (data) => {
            await addPayment(data);
            showToast('Supplier payment saved successfully!');
            setIsAddModalOpen(false);
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* View Voucher Modal */}
      <Modal
        isOpen={!!viewingPayment}
        onClose={() => setViewingPayment(null)}
        title={`Payment Voucher - ${viewingPayment?.no}`}
        maxWidth="max-w-4xl"
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
              { label: 'Payment Source Account', value: viewingPayment.account || 'Cash Account' },
            ]}
            signatures={[
              { label: 'Paid By', sub: 'Cashier / Accounts' },
              { label: 'Verified By', sub: 'Senior Accountant' },
              { label: 'Authorized By', sub: 'Proprietor / Shahid Yaseen' },
            ]}
          >
            {/* Amount Paid as a Large Emphasized Standalone Block */}
            <div className="p-4 rounded-xl border-2 border-red-500 bg-red-50/50 mb-4 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-red-800 block">Amount Paid (Debit)</span>
                <span className="text-xs text-gray-600">Disbursed from account against supplier balance</span>
              </div>
              <div className="text-2xl font-black font-mono text-red-700">
                {fmt(viewingPayment.amount)}
              </div>
            </div>

            {/* Note / Particulars */}
            {viewingPayment.description && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-300 text-sm text-gray-700 mb-2">
                <span className="font-bold uppercase tracking-wider text-gray-500 text-xs block mb-1">Particulars / Note</span>
                <div className="font-medium">{viewingPayment.description}</div>
              </div>
            )}
          </PrintDocument>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Payment Entry"
        message="Are you sure you want to delete this payment record?"
        onConfirm={async () => {
          await deletePayment(deletingId);
          showToast('Payment entry deleted!');
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
