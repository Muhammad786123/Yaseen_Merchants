import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
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
import { Plus, Trash2 } from 'lucide-react';

export default function Production() {
  const { productions, addProduction, deleteProduction } = useProductions();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
              <div className="flex items-center justify-end">
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
