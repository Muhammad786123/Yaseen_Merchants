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
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Warehouses() {
  const navigate = useNavigate();
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
            <TD className="font-bold text-black">
              <button
                onClick={() => navigate(`/warehouse-ledger?warehouse=${w.id}`)}
                className="hover:underline text-left cursor-pointer font-bold text-[#1E3A5F]"
                title="Open Warehouse Stock Ledger"
              >
                {w.name}
              </button>
            </TD>
            <TD>
              <Badge
                variant={
                  w.type === 'Raw Material'
                    ? 'orange'
                    : w.type === 'Finished Goods'
                    ? 'green'
                    : 'blue'
                }
              >
                {w.type}
              </Badge>
            </TD>
            <TD>{w.location || '-'}</TD>
            <TD className="no-print">
              <div className="flex items-center justify-end gap-1.5 no-print">
                <button
                  onClick={() => navigate(`/warehouse-ledger?warehouse=${w.id}`)}
                  className="h-9 min-h-[36px] px-2.5 py-1 border border-black bg-white hover:bg-emerald-50 text-emerald-800 flex items-center gap-1 font-bold text-xs cursor-pointer"
                  title="View Warehouse Movement Ledger (PERBALACC Statement)"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Ledger</span>
                </button>
                <button
                  onClick={() => setEditingWarehouse(w)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-amber-50 text-amber-700 cursor-pointer"
                  title="Edit Warehouse"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(w.id)}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
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
        title={editingWarehouse ? `Editing Warehouse — ${editingWarehouse.name}` : "Edit Warehouse"}
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
          try {
            await deleteWarehouse(deletingId);
            showToast('Warehouse deleted!');
            setDeletingId(null);
          } catch (err) {
            alert(err.message || 'Cannot delete warehouse');
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
