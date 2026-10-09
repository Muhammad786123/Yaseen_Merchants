import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Button from '../../components/ui/Button.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import ItemForm from '../../components/forms/ItemForm.jsx';
import { useItems } from '../../hooks/useItems.js';
import { useQualities } from '../../hooks/useQualities.js';
import { useApp } from '../../context/AppContext.jsx';
import { fmt } from '../../utils/formatters.js';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Items() {
  const navigate = useNavigate();
  const { items, addItem, updateItem, deleteItem } = useItems();
  const { qualities } = useQualities();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const filteredItems = items.filter((item) => {
    const qLower = search.toLowerCase();
    const matchesSearch =
      (item.name || '').toLowerCase().includes(qLower) ||
      (item.code || '').toLowerCase().includes(qLower) ||
      (item.quality ? item.quality.toLowerCase().includes(qLower) : false);

    const matchesCat = filterCategory === 'All' || item.category === filterCategory;

    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Items Catalog"
        subtitle="Raw cotton waste materials and finished recycled products"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/qualities')}>
              Quality Grades
            </Button>
            <Button variant="secondary" onClick={() => navigate('/stock-ledger')}>
              Stock Ledger
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
              Add New Item
            </Button>
          </div>
        }
      />

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#EBE9ED] p-2.5 border-2 border-black">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by code, name or category..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-1 border border-black bg-white p-0.5">
          {['All', 'Raw Material', 'Finished Product'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                filterCategory === cat
                  ? 'bg-[#1a6b2e] text-white'
                  : 'text-gray-800 hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <Table
        headers={['Item Code', 'Item Name', 'Category', 'Unit', 'Default Rate', 'Actions']}
        emptyText="No items found in catalog."
      >
        {filteredItems.map((item) => (
          <TR key={item.id}>
            <TD mono className="font-bold text-black">
              {item.code}
            </TD>
            <TD className="font-bold text-black">
              <button
                onClick={() => navigate(`/stock-ledger?item=${item.id}`)}
                className="hover:underline text-left cursor-pointer font-bold text-[#1E3A5F]"
                title="Open Item Stock Ledger"
              >
                {item.name}
              </button>
            </TD>
            <TD>
              <Badge variant={item.category === 'Raw Material' ? 'orange' : 'green'}>
                {item.category}
              </Badge>
            </TD>
            <TD>{item.unit || 'KG'}</TD>
            <TD mono right className="font-bold text-black">
              {item.defaultRate ? fmt(item.defaultRate) : <span className="text-gray-400 font-normal text-xs">—</span>}
            </TD>
            <TD>
              <div className="flex items-center justify-end gap-1.5">
                <button
                  onClick={() => navigate(`/stock-ledger?item=${item.id}`)}
                  className="px-2 py-1 border border-black bg-white hover:bg-emerald-50 text-emerald-800 flex items-center gap-1 font-bold text-xs cursor-pointer"
                  title="View Item Movement Ledger (PERBALACC Statement)"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Ledger</span>
                </button>
                <button
                  onClick={() => setEditingItem(item)}
                  className="p-1 border border-black bg-white hover:bg-gray-100 text-gray-800 cursor-pointer"
                  title="Edit Item"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeletingId(item.id)}
                  className="p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                  title="Delete Item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </TD>
          </TR>
        ))}
      </Table>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Catalog Item"
      >
        <ItemForm
          qualities={qualities}
          onSubmit={async (data) => {
            await addItem(data);
            showToast('Item added to catalog successfully!');
            setIsAddModalOpen(false);
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Edit Catalog Item"
      >
        <ItemForm
          initialData={editingItem}
          qualities={qualities}
          onSubmit={async (data) => {
            await updateItem(editingItem.id, data);
            showToast('Item updated successfully!');
            setEditingItem(null);
          }}
          onCancel={() => setEditingItem(null)}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Item"
        message="Are you sure you want to delete this item from catalog?"
        onConfirm={async () => {
          await deleteItem(deletingId);
          showToast('Item deleted successfully!');
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
