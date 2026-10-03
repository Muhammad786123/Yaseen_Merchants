import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import PrintDocument from '../../components/common/PrintDocument.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Button from '../../components/ui/Button.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import ProductionForm from '../../components/forms/ProductionForm.jsx';
import { useProductions } from '../../hooks/useProductions.js';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../utils/formatters.js';
import { Plus, Trash2, Eye } from 'lucide-react';

export default function Production() {
  const { productions, addProduction, deleteProduction } = useProductions();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingProduction, setViewingProduction] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const filtered = productions.filter(
    (p) =>
      p.no.toLowerCase().includes(search.toLowerCase()) ||
      p.product.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Entries"
        subtitle="Monitor manufacturing input, finished product yield percentage, and waste loss"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
            Record Production
          </Button>
        }
      />

      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#E0DBD3]">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by PRD # or product..."
          className="w-full sm:w-80"
        />
      </div>

      <Table
        headers={[
          'Production #',
          'Date',
          'Output Product',
          'Input Waste (KG)',
          'Output Finished (KG)',
          'Waste Loss (KG)',
          'Yield %',
          'Actions',
        ]}
        emptyText="No production entries recorded."
      >
        {filtered.map((prd) => (
          <TR key={prd.id}>
            <TD mono className="font-bold text-[#1E3A5F]">{prd.no}</TD>
            <TD>{formatDate(prd.date)}</TD>
            <TD className="font-semibold text-gray-900">{prd.product}</TD>
            <TD mono right>{prd.totalInput}</TD>
            <TD mono right className="text-emerald-600 font-bold">{prd.outputQty}</TD>
            <TD mono right className="text-red-500">{prd.wasteQty}</TD>
            <TD mono right>
              <Badge variant={prd.yieldPct >= 88 ? 'green' : 'amber'}>
                {prd.yieldPct}%
              </Badge>
            </TD>
            <TD>
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => setViewingProduction(prd)}
                  className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                  title="View & Print Production Slip"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(prd.id)}
                  className="p-1.5 hover:bg-red-50 rounded text-red-500"
                  title="Delete Entry"
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
        isOpen={!!viewingProduction}
        onClose={() => setViewingProduction(null)}
        title={`Production Run Slip - ${viewingProduction?.no}`}
        maxWidth="max-w-3xl"
      >
        {viewingProduction && (
          <PrintDocument
            id="production-print-area"
            title="PRODUCTION RUN SLIP"
            documentNo={viewingProduction.no}
            date={formatDate(viewingProduction.date)}
            actionTitle={`Production Run Slip — ${viewingProduction.no}`}
            printButtonText="Print Production Slip"
            metadata={[
              { label: 'Output Product', value: viewingProduction.product },
              { label: 'Yield Percentage', value: `${viewingProduction.yieldPct}% (Efficiency)` },
            ]}
            signatures={[
              { label: 'Production Incharge', sub: 'Machine Floor' },
              { label: 'Verified By', sub: 'QC Department' },
              { label: 'Authorized By', sub: 'Plant Supervisor' },
            ]}
          >
            <div className="mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Manufacturing Metrics</h4>
              <table
                className="invoice-table print-table w-full text-xs text-left border-collapse border border-gray-400"
                style={{ width: '100%', borderCollapse: 'collapse' }}
              >
                <thead>
                  <tr className="bg-[#F0EDE8] border-b border-gray-400 text-[#1E3A5F]">
                    <th className="p-2 font-bold border border-gray-400">Parameter / Metric</th>
                    <th className="p-2 font-bold border border-gray-400 text-right">Quantity (KG)</th>
                    <th className="p-2 font-bold border border-gray-400 text-right">Share (%)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="p-2 border border-gray-400 font-semibold text-gray-900">Total Raw Material Input</td>
                    <td className="p-2 border border-gray-400 text-right font-mono font-bold">{viewingProduction.totalInput} KG</td>
                    <td className="p-2 border border-gray-400 text-right font-mono text-gray-500">100%</td>
                  </tr>
                  <tr className="bg-emerald-50/40">
                    <td className="p-2 border border-gray-400 font-semibold text-emerald-800">Finished Product Output</td>
                    <td className="p-2 border border-gray-400 text-right font-mono font-bold text-emerald-700">{viewingProduction.outputQty} KG</td>
                    <td className="p-2 border border-gray-400 text-right font-mono text-emerald-700 font-semibold">{viewingProduction.yieldPct}%</td>
                  </tr>
                  <tr className="bg-red-50/40">
                    <td className="p-2 border border-gray-400 font-semibold text-red-800">Waste / Scrap Generated</td>
                    <td className="p-2 border border-gray-400 text-right font-mono font-bold text-red-600">{viewingProduction.wasteQty} KG</td>
                    <td className="p-2 border border-gray-400 text-right font-mono text-red-600 font-semibold">
                      {(100 - viewingProduction.yieldPct).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </PrintDocument>
        )}
      </Modal>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Production Output"
      >
        <ProductionForm
          onSubmit={async (data) => {
            await addProduction(data);
            showToast('Production entry saved successfully!');
            setIsAddModalOpen(false);
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Production Record"
        message="Are you sure you want to delete this production record?"
        onConfirm={async () => {
          await deleteProduction(deletingId);
          showToast('Production entry deleted!');
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
