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
import { Plus, Edit, Trash2, Eye } from 'lucide-react';

export default function Parties() {
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E0DBD3]">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by party name, city or phone..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-1 bg-[#F5F4F0] p-1 rounded-lg">
          {['All', 'Supplier', 'Customer'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filterType === t
                  ? 'bg-white text-[#1E3A5F] shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Parties Table */}
      <Table
        headers={['Party Name', 'Type', 'City', 'Phone', 'Opening Balance', 'Current Balance', 'Actions']}
        emptyText="No parties found matching your criteria."
      >
        {filteredParties.map((p) => (
          <TR key={p.id}>
            <TD className="font-semibold text-[#1E3A5F]">
              <button
                onClick={() => setViewingParty(p)}
                className="hover:underline text-left cursor-pointer"
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
            <TD mono>{fmt(p.openingBalance || 0)}</TD>
            <TD mono right>
              <span
                className={`font-bold ${
                  p.balance > 0
                    ? 'text-red-600'
                    : p.balance < 0
                    ? 'text-emerald-600'
                    : 'text-gray-600'
                }`}
              >
                {fmt(p.balance)}
              </span>
            </TD>
            <TD>
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => setViewingParty(p)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-[#1E3A5F]"
                  title="View Ledger / Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingParty(p)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-[#1E3A5F]"
                  title="Edit Party"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(p.id)}
                  className="p-1.5 hover:bg-red-50 rounded text-red-500"
                  title="Delete Party"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </TD>
          </TR>
        ))}
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
        title="Edit Party"
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
          await deleteParty(deletingId);
          showToast('Party deleted successfully!');
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />

      {/* View Details Drawer/Modal */}
      <Modal
        isOpen={!!viewingParty}
        onClose={() => setViewingParty(null)}
        title={`Party Details - ${viewingParty?.name}`}
        maxWidth="max-w-2xl"
      >
        {viewingParty && (
          <PartyDetails party={viewingParty} onClose={() => setViewingParty(null)} />
        )}
      </Modal>
    </div>
  );
}
