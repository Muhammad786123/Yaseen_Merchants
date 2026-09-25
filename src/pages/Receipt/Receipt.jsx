import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
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
import { Plus, Trash2 } from 'lucide-react';

export default function Receipt() {
  const { receipts, accounts, addReceipt, deleteReceipt } = useFinances();
  const { parties } = useParties();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#E0DBD3]">
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
            <TD mono className="font-bold text-[#1E3A5F]">{r.no}</TD>
            <TD>{formatDate(r.date)}</TD>
            <TD className="font-semibold text-gray-900">{r.partyName}</TD>
            <TD>
              <Badge variant="blue">{r.account}</Badge>
            </TD>
            <TD className="text-gray-500 text-xs">{r.description || '-'}</TD>
            <TD mono right className="font-bold text-emerald-600">{fmt(r.amount)}</TD>
            <TD>
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setDeletingId(r.id)}
                  className="p-1.5 hover:bg-red-50 rounded text-red-500"
                  title="Delete Receipt"
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
        title="Record New Cash Receipt"
      >
        <ReceiptForm
          parties={customers}
          accounts={accounts}
          onSubmit={async (data) => {
            await addReceipt(data);
            showToast('Receipt recorded successfully!');
            setIsAddModalOpen(false);
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Receipt"
        message="Are you sure you want to delete this cash receipt entry?"
        onConfirm={async () => {
          await deleteReceipt(deletingId);
          showToast('Receipt deleted!');
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
