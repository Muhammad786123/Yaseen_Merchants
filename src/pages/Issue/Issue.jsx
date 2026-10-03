import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import PrintDocument from '../../components/common/PrintDocument.jsx';
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
import { Plus, Trash2, Eye } from 'lucide-react';

export default function Issue() {
  const { issues, addIssue, deleteIssue } = useIssues();
  const { warehouses } = useWarehouses();
  const { items } = useItems();
  const { stockEntries } = useStock();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingIssue, setViewingIssue] = useState(null);
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
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => setViewingIssue(iss)}
                  className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                  title="View & Print Issue Slip"
                >
                  <Eye className="w-4 h-4" />
                </button>
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

      {/* View Details / Print Slip Modal */}
      <Modal
        isOpen={!!viewingIssue}
        onClose={() => setViewingIssue(null)}
        title={`Material Issue Slip - ${viewingIssue?.no}`}
        maxWidth="max-w-3xl"
      >
        {viewingIssue && (
          <PrintDocument
            id="issue-print-area"
            title="MATERIAL ISSUE SLIP"
            documentNo={viewingIssue.no}
            date={formatDate(viewingIssue.date)}
            actionTitle={`Material Issue Slip — ${viewingIssue.no}`}
            printButtonText="Print Issue Slip"
            metadata={[
              { label: 'From Warehouse / Store', value: viewingIssue.fromWarehouse || 'Warehouse 1' },
              { label: 'To Department / Floor Area', value: viewingIssue.toArea || 'Production Floor' },
            ]}
            summary={
              viewingIssue.totalValue > 0 ? (
                <div className="flex justify-end pt-1">
                  <div className="w-72 space-y-1.5 text-xs">
                    <div className="flex justify-between p-2 rounded-lg border border-gray-300 bg-gray-50">
                      <span className="text-gray-600 font-medium">Estimated Value:</span>
                      <span className="font-mono font-bold text-gray-900">{fmt(viewingIssue.totalValue)}</span>
                    </div>
                  </div>
                </div>
              ) : null
            }
            signatures={[
              { label: 'Store Incharge', sub: 'Warehouse / Store' },
              { label: 'Verified By', sub: 'Production Floor' },
              { label: 'Authorized By', sub: 'Plant Supervisor' },
            ]}
          >
            <div className="mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Issued Items</h4>
              <table
                className="invoice-table print-table w-full text-xs text-left border-collapse border border-gray-400"
                style={{ width: '100%', borderCollapse: 'collapse' }}
              >
                <thead>
                  <tr className="bg-[#F0EDE8] border-b border-gray-400 text-[#1E3A5F]">
                    <th className="p-2 font-bold border border-gray-400 w-12 text-center">#</th>
                    <th className="p-2 font-bold border border-gray-400">Item Name</th>
                    <th className="p-2 font-bold border border-gray-400">Quality</th>
                    <th className="p-2 font-bold border border-gray-400 text-right">Quantity (KG)</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingIssue.items?.map((it, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                      <td className="p-2 border border-gray-400 text-center font-mono text-gray-500">{idx + 1}</td>
                      <td className="p-2 border border-gray-400 font-semibold text-gray-900">{it.itemName}</td>
                      <td className="p-2 border border-gray-400 text-gray-700">{it.quality}</td>
                      <td className="p-2 border border-gray-400 text-right font-mono font-bold text-[#1E3A5F]">{it.issueQty} KG</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PrintDocument>
        )}
      </Modal>

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
