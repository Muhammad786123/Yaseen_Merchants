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
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function Items() {
  const { items, addItem, updateItem, deleteItem } = useItems();
  const { qualities } = useQualities();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.quality.toLowerCase().includes(search.toLowerCase());

    const matchesCat = filterCategory === 'All' || item.category === filterCategory;

    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Items Catalog"
        subtitle="Raw cotton waste materials and finished recycled products"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
            Add New Item
          </Button>
        }
      />

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E0DBD3]">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by code, name or quality grade..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-1 bg-[#F5F4F0] p-1 rounded-lg">
          {['All', 'Raw Material', 'Finished Product'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filterCategory === cat
                  ? 'bg-white text-[#1E3A5F] shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <Table
        headers={['Item Code', 'Item Name', 'Category', 'Quality Grade', 'Unit', 'Default Rate', 'Actions']}
        emptyText="No items found in catalog."
      >
        {filteredItems.map((item) => (
          <TR key={item.id}>
            <TD mono className="font-semibold text-[#1E3A5F]">
              {item.code}
            </TD>
            <TD className="font-medium text-gray-900">{item.name}</TD>
            <TD>
              <Badge variant={item.category === 'Raw Material' ? 'orange' : 'green'}>
                {item.category}
              </Badge>
            </TD>
            <TD>
              <Badge variant="gray">{item.quality}</Badge>
            </TD>
            <TD>{item.unit}</TD>
            <TD mono right className="font-bold text-[#1E3A5F]">
              {fmt(item.defaultRate)}
            </TD>
            <TD>
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => setEditingItem(item)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-[#1E3A5F]"
                  title="Edit Item"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(item.id)}
                  className="p-1.5 hover:bg-red-50 rounded text-red-500"
                  title="Delete Item"
                >
                  <Trash2 className="w-4 h-4" />
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
