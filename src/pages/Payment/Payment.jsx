import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
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
import { Plus, Trash2 } from 'lucide-react';

export default function Payment() {
  const { payments, accounts, addPayment, deletePayment } = useFinances();
  const { parties } = useParties();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#E0DBD3]">
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
              <div className="flex items-center justify-end">
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
