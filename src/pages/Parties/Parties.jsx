import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Button from '../../components/ui/Button.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import PartyForm from '../../components/forms/PartyForm.jsx';
import PartyDetails from './PartyDetails.jsx';
import { useParties } from '../../hooks/useParties.js';
import { useApp } from '../../context/AppContext.jsx';
import { fmt } from '../../utils/formatters.js';
import { balanceSide } from '../../utils/partySide.js';
import { Plus, Edit, Trash2, Eye, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Parties() {
  const navigate = useNavigate();
  const { parties, addParty, updateParty, deleteParty } = useParties();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [viewingParty, setViewingParty] = useState(null);

  const filteredParties = parties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search);

    const matchesType =
      filterType === 'All' ||
      p.type === filterType ||
      (filterType === 'Supplier' && p.type === 'Both') ||
      (filterType === 'Customer' && p.type === 'Both');

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parties Management"
        subtitle="Manage suppliers, buyers, and cotton waste dealers"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
            Add New Party
          </Button>
        }
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#EBE9ED] p-2.5 border-2 border-black">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by party name, city or phone..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-1 border border-black bg-white p-0.5">
          {['All', 'Supplier', 'Customer'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                filterType === t
                  ? 'bg-[#1a6b2e] text-white'
                  : 'text-gray-800 hover:bg-gray-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Parties Table */}
      <Table
        headers={['Code', 'Party Name', 'Type', 'City', 'Phone', 'Opening Balance', 'Current Balance', 'Actions']}
        emptyText="No parties found matching your criteria."
      >
        {filteredParties.map((p) => {
          const side = balanceSide(p.balance);
          const isZero = side.amount === 0;
          return (
            <TR key={p.id}>
              <TD mono className="font-bold text-gray-700">
                {p.code || '-'}
              </TD>
              <TD className="font-bold text-black">
                <button
                  onClick={() => setViewingParty(p)}
                  className="hover:underline text-left cursor-pointer font-bold"
                >
                  {p.name}
                </button>
              </TD>
              <TD>
                <Badge
                  variant={
                    p.type === 'Supplier'
                      ? 'orange'
                      : p.type === 'Customer'
                      ? 'blue'
                      : 'purple'
                  }
                >
                  {p.type}
                </Badge>
              </TD>
              <TD>{p.city || '-'}</TD>
              <TD mono>{p.phone || '-'}</TD>
              <TD mono right>{fmt(p.openingBalance || 0)}</TD>
              <TD mono right>
                <span
                  className="font-black"
                  style={{ color: side.color || '#1f2937' }}
                >
                  {isZero ? '0' : `${fmt(side.amount)} ${side.ur} (${side.en})`}
                </span>
              </TD>
            <TD className="no-print">
              <div className="flex items-center justify-end gap-1.5 no-print">
                <button
                  onClick={() => navigate(`/party-ledger?party=${p.id}`)}
                  className="h-9 min-h-[36px] px-2.5 py-1 border border-black bg-white hover:bg-emerald-50 text-emerald-800 flex items-center gap-1 font-bold text-xs cursor-pointer"
                  title="View A/C Ledger (PERBALACC Statement)"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Ledger</span>
                </button>
                <button
                  onClick={() => setViewingParty(p)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-gray-100 text-gray-800 cursor-pointer"
                  title="Quick View Statement"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingParty(p)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-amber-50 text-amber-700 cursor-pointer"
                  title="Edit Party"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(p.id)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                  title="Delete Party"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </TD>
          </TR>
        );
      })}
      </Table>

      {/* Add Party Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Party"
      >
        <PartyForm
          onSubmit={async (data) => {
            await addParty(data);
            showToast('Party created successfully!');
            setIsAddModalOpen(false);
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* Edit Party Modal */}
      <Modal
        isOpen={!!editingParty}
        onClose={() => setEditingParty(null)}
        title={editingParty ? `Editing Party — ${editingParty.name}` : "Edit Party"}
      >
        <PartyForm
          initialData={editingParty}
          onSubmit={async (data) => {
            await updateParty(editingParty.id, data);
            showToast('Party updated successfully!');
            setEditingParty(null);
          }}
          onCancel={() => setEditingParty(null)}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Party"
        message="Are you sure you want to delete this party? This action will permanently remove their records."
        onConfirm={async () => {
          try {
            await deleteParty(deletingId);
            showToast('Party deleted successfully!');
            setDeletingId(null);
          } catch (err) {
            alert(err.message || 'Cannot delete party');
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
      />

      {/* View Details Drawer/Modal */}
      <Modal
        isOpen={!!viewingParty}
        onClose={() => setViewingParty(null)}
        title={`Party Details - ${viewingParty?.name}`}
        maxWidth="max-w-[96vw]"
        isPrintPreview={true}
      >
        {viewingParty && (
          <PartyDetails party={viewingParty} onClose={() => setViewingParty(null)} />
        )}
      </Modal>
    </div>
  );
}
