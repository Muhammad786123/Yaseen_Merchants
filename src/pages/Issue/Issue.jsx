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
import { useQualities } from '../../hooks/useQualities.js';
import { useStock } from '../../hooks/useStock.js';
import { useApp } from '../../context/AppContext.jsx';
import { fmt, formatDate } from '../../utils/formatters.js';
import { Plus, Trash2, Eye, Pencil } from 'lucide-react';

export default function Issue() {
  const { issues, addIssue, updateIssue, deleteIssue } = useIssues();
  const { warehouses } = useWarehouses();
  const { items } = useItems();
  const { qualities } = useQualities();
  const { stockEntries } = useStock();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [viewingIssue, setViewingIssue] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const filteredIssues = issues.filter(
    (i) =>
      (i.no || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.fromWarehouse || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.items && i.items.some((it) => (it.itemName || '').toLowerCase().includes(search.toLowerCase()) || (it.quality || '').toLowerCase().includes(search.toLowerCase())))
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

      <div className="flex items-center justify-between bg-[#EBE9ED] p-2.5 border-2 border-black">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by ISS #, warehouse or item..."
          className="w-full sm:w-80"
        />
      </div>

      <Table
        headers={['Issue #', 'Date', 'From Warehouse', 'Issued Items', 'Derived Value', 'Actions']}
        emptyText="No material issues recorded."
      >
        {filteredIssues.map((iss) => (
          <TR key={iss.id}>
            <TD mono className="font-bold text-black">
              <div className="flex items-center gap-1.5">
                <span>{iss.no}</span>
                {iss.editCount > 0 && (
                  <span
                    className="px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-400 text-[10px] font-bold rounded-sm"
                    title={`Edited ${iss.editCount} time(s). Last edited: ${iss.updatedAt ? formatDate(iss.updatedAt) : 'Recently'}`}
                  >
                    Edited
                  </span>
                )}
              </div>
            </TD>
            <TD>
              <div>
                <span>{formatDate(iss.date)}</span>
                {iss.updatedAt && (
                  <div className="text-[10px] text-gray-500">
                    Rev: {formatDate(iss.updatedAt)}
                  </div>
                )}
              </div>
            </TD>
            <TD className="font-bold text-black">{iss.fromWarehouse}</TD>
            <TD>
              <div className="text-base text-gray-800 space-y-1">
                {iss.items && iss.items.length > 0 ? (
                  iss.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-black">{it.itemName}</span>
                      {it.quality && (
                        <span className="text-black font-bold bg-[#FFEB3B] border border-black px-2 py-0.5 text-[22px]">
                          {it.quality}
                        </span>
                      )}
                      <span className="text-black font-mono font-bold">({it.issueQty} KG)</span>
                    </div>
                  ))
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
            </TD>
            <TD mono right className="font-bold text-black">{fmt(iss.totalValue)}</TD>
            <TD>
              <div className="flex items-center justify-end gap-1.5">
                <button
                  onClick={() => setViewingIssue(iss)}
                  className="p-1 border border-black bg-white hover:bg-blue-50 text-blue-700 cursor-pointer"
                  title="View & Print Issue Slip"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingIssue(iss)}
                  className="p-1 border border-black bg-white hover:bg-amber-50 text-amber-700 cursor-pointer"
                  title="Edit Material Issue"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeletingId(iss.id)}
                  className="p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                  title="Delete Issue"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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
        maxWidth="max-w-4xl"
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
              { label: 'Issued To', sub: 'Production Floor' },
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
                    <th className="p-2 font-bold border border-gray-400 text-center">Unit</th>
                    <th className="p-2 font-bold border border-gray-400 text-right">Quantity (KG)</th>
                    <th className="p-2 font-bold border border-gray-400 text-right">Est. Rate</th>
                    <th className="p-2 font-bold border border-gray-400 text-right">Est. Value</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingIssue.items?.map((it, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                      <td className="p-2 border border-gray-400 text-center font-mono text-gray-500">{idx + 1}</td>
                      <td className="p-2 border border-gray-400 font-semibold text-gray-900">{it.itemName}</td>
                      <td className="p-2 border border-gray-400 text-gray-700">{it.quality || '-'}</td>
                      <td className="p-2 border border-gray-400 text-center text-gray-600">{it.unit || 'KG'}</td>
                      <td className="p-2 border border-gray-400 text-right font-mono font-bold text-[#1E3A5F]">{it.issueQty} KG</td>
                      <td className="p-2 border border-gray-400 text-right font-mono text-gray-700">{it.rate ? fmt(it.rate) : '-'}</td>
                      <td className="p-2 border border-gray-400 text-right font-mono font-bold text-gray-900">{it.value ? fmt(it.value) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#FAF9F7] font-bold border-t-2 border-gray-400">
                    <td colSpan={4} className="p-2 text-right border border-gray-400">Total:</td>
                    <td className="p-2 text-right border border-gray-400 font-mono text-[#1E3A5F]">
                      {viewingIssue.items?.reduce((sum, it) => sum + Number(it.issueQty || 0), 0)} KG
                    </td>
                    <td className="p-2 border border-gray-400"></td>
                    <td className="p-2 text-right border border-gray-400 font-mono text-[#1E3A5F]">
                      {fmt(viewingIssue.totalValue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </PrintDocument>
        )}
      </Modal>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isAddModalOpen || !!editingIssue}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingIssue(null);
        }}
        title={editingIssue ? `Editing Material Issue — ${editingIssue.no}` : 'Record New Material Issue'}
        maxWidth="max-w-4xl"
      >
        <IssueForm
          warehouses={warehouses}
          items={items}
          qualities={qualities}
          stockEntries={stockEntries}
          initialData={editingIssue}
          onSubmit={async (data) => {
            if (editingIssue) {
              await updateIssue(editingIssue.id, data);
              showToast(`Material issue ${editingIssue.no} updated successfully!`);
              setEditingIssue(null);
            } else {
              await addIssue(data);
              showToast('Material issue recorded successfully!');
              setIsAddModalOpen(false);
            }
          }}
          onCancel={() => {
            setIsAddModalOpen(false);
            setEditingIssue(null);
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Material Issue"
        message="This will reverse all its effects on parties, cash, bank and stock."
        confirmLabel="Delete Issue"
        onConfirm={async () => {
          await deleteIssue(deletingId);
          showToast('Material issue deleted and stock reversed!');
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
