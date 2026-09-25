import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import WarehouseForm from '../../components/forms/WarehouseForm.jsx';
import { useWarehouses } from '../../hooks/useWarehouses.js';
import { useApp } from '../../context/AppContext.jsx';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function Warehouses() {
  const { warehouses, addWarehouse, updateWarehouse, deleteWarehouse } = useWarehouses();
  const { showToast } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse & Stores Master"
        subtitle="Manage storage locations, raw material godowns, and production areas"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
            Add Warehouse
          </Button>
        }
      />

      <Table
        headers={['Warehouse Name', 'Type / Purpose', 'Location Details', 'Actions']}
        emptyText="No warehouses added."
      >
        {warehouses.map((w) => (
          <TR key={w.id}>
            <TD className="font-bold text-[#1E3A5F]">{w.name}</TD>
            <TD>
              <Badge
                variant={
                  w.type === 'Raw Material'
                    ? 'orange'
                    : w.type === 'Production'
                    ? 'purple'
                    : 'green'
                }
              >
                {w.type}
              </Badge>
            </TD>
            <TD>{w.location || '-'}</TD>
            <TD>
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => setEditingWarehouse(w)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-[#1E3A5F]"
                  title="Edit Warehouse"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(w.id)}
                  className="p-1.5 hover:bg-red-50 rounded text-red-500"
                  title="Delete Warehouse"
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
        title="Add New Warehouse"
      >
        <WarehouseForm
          onSubmit={async (data) => {
            await addWarehouse(data);
            showToast('Warehouse created!');
            setIsAddModalOpen(false);
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editingWarehouse}
        onClose={() => setEditingWarehouse(null)}
        title="Edit Warehouse"
      >
        <WarehouseForm
          initialData={editingWarehouse}
          onSubmit={async (data) => {
            await updateWarehouse(editingWarehouse.id, data);
            showToast('Warehouse updated!');
            setEditingWarehouse(null);
          }}
          onCancel={() => setEditingWarehouse(null)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Warehouse"
        message="Are you sure you want to delete this warehouse?"
        onConfirm={async () => {
          await deleteWarehouse(deletingId);
          showToast('Warehouse deleted!');
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
