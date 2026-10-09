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
import { Plus, Trash2, Eye } from 'lucide-react';

export default function Receipt() {
  const { receipts, accounts, addReceipt, deleteReceipt } = useFinances();
  const { parties } = useParties();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(null);
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
            <TD mono className="font-bold text-[#1E3A5F]">{r.no}</TD>
            <TD>{formatDate(r.date)}</TD>
            <TD className="font-semibold text-gray-900">{r.partyName}</TD>
            <TD>
              <Badge variant="blue">{r.account}</Badge>
            </TD>
            <TD className="text-gray-500 text-xs">{r.description || '-'}</TD>
            <TD mono right className="font-bold text-emerald-600">{fmt(r.amount)}</TD>
            <TD>
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => setViewingReceipt(r)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-[#1E3A5F]"
                  title="View Voucher"
                >
                  <Eye className="w-4 h-4" />
                </button>
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

      {/* View Voucher Modal */}
      <Modal
        isOpen={!!viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        title={`Receipt Voucher - ${viewingReceipt?.no}`}
        maxWidth="max-w-3xl"
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
            {/* Amount Received as a Large Emphasized Standalone Block */}
            <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/50 mb-4 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-800 block">Amount Received (Credit)</span>
                <span className="text-xs text-gray-600">Deposited into account against customer balance</span>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-700">
                {fmt(viewingReceipt.amount)}
              </div>
            </div>

            {/* Note / Particulars */}
            {viewingReceipt.description && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-300 text-sm text-gray-700 mb-2">
                <span className="font-bold uppercase tracking-wider text-gray-500 text-xs block mb-1">Particulars / Note</span>
                <div className="font-medium">{viewingReceipt.description}</div>
              </div>
            )}
          </PrintDocument>
        )}
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
