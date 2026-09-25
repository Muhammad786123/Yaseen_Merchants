import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Button from '../../components/ui/Button.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import IssueForm from '../../components/forms/IssueForm.jsx';
import { useIssues } from '../../hooks/useIssues.js';
import { useWarehouses } from '../../hooks/useWarehouses.js';
import { useItems } from '../../hooks/useItems.js';
import { useStock } from '../../hooks/useStock.js';
import { useApp } from '../../context/AppContext.jsx';
import { fmt, formatDate } from '../../utils/formatters.js';
import { Plus, Trash2 } from 'lucide-react';

export default function Issue() {
  const { issues, addIssue, deleteIssue } = useIssues();
  const { warehouses } = useWarehouses();
  const { items } = useItems();
  const { stockEntries } = useStock();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const filteredIssues = issues.filter(
    (i) =>
      i.no.toLowerCase().includes(search.toLowerCase()) ||
      i.fromWarehouse.toLowerCase().includes(search.toLowerCase()) ||
      i.toArea.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Issue Slips"
        subtitle="Track raw material issued from warehouses to production floor"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
            New Material Issue
          </Button>
        }
      />

      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#E0DBD3]">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by ISS #, warehouse or department..."
          className="w-full sm:w-80"
        />
      </div>

      <Table
        headers={['Issue #', 'Date', 'From Store', 'To Department', 'Issued Items', 'Derived Value', 'Actions']}
        emptyText="No material issues recorded."
      >
        {filteredIssues.map((iss) => (
          <TR key={iss.id}>
            <TD mono className="font-bold text-[#1E3A5F]">{iss.no}</TD>
            <TD>{formatDate(iss.date)}</TD>
            <TD className="font-medium">{iss.fromWarehouse}</TD>
            <TD>{iss.toArea}</TD>
            <TD>
              <div className="text-xs text-gray-600">
                {iss.items && iss.items.length > 0
                  ? iss.items.map((it) => `${it.itemName} (${it.issueQty} KG)`).join(', ')
                  : '-'}
              </div>
            </TD>
            <TD mono right className="font-bold text-gray-700">{fmt(iss.totalValue)}</TD>
            <TD>
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setDeletingId(iss.id)}
                  className="p-1.5 hover:bg-red-50 rounded text-red-500"
                  title="Delete Issue"
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
        title="Record New Material Issue"
        maxWidth="max-w-2xl"
      >
        <IssueForm
          warehouses={warehouses}
          items={items}
          stockEntries={stockEntries}
          onSubmit={async (data) => {
            await addIssue(data);
            showToast('Material issue recorded successfully!');
            setIsAddModalOpen(false);
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Material Issue"
        message="Are you sure you want to delete this issue slip?"
        onConfirm={async () => {
          await deleteIssue(deletingId);
          showToast('Material issue deleted!');
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
