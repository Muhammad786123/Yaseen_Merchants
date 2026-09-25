import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import QualityForm from '../../components/forms/QualityForm.jsx';
import { useQualities } from '../../hooks/useQualities.js';
import { useApp } from '../../context/AppContext.jsx';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function Qualities() {
  const { qualities, addQuality, updateQuality, deleteQuality } = useQualities();
  const { showToast } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingQuality, setEditingQuality] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Grades Master"
        subtitle="Manage textile waste quality classifications and grade standards"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
            Add Quality Grade
          </Button>
        }
      />

      <Table
        headers={['Grade Name', 'Description / Specification', 'Actions']}
        emptyText="No quality grades defined."
      >
        {qualities.map((q) => (
          <TR key={q.id}>
            <TD className="font-bold text-[#1E3A5F]">{q.name}</TD>
            <TD className="text-gray-600">{q.description || '-'}</TD>
            <TD>
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => setEditingQuality(q)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-[#1E3A5F]"
                  title="Edit Quality"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(q.id)}
                  className="p-1.5 hover:bg-red-50 rounded text-red-500"
                  title="Delete Quality"
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
        title="Add Quality Grade"
      >
        <QualityForm
          onSubmit={async (data) => {
            await addQuality(data);
            showToast('Quality grade added!');
            setIsAddModalOpen(false);
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editingQuality}
        onClose={() => setEditingQuality(null)}
        title="Edit Quality Grade"
      >
        <QualityForm
          initialData={editingQuality}
          onSubmit={async (data) => {
            await updateQuality(editingQuality.id, data);
            showToast('Quality grade updated!');
            setEditingQuality(null);
          }}
          onCancel={() => setEditingQuality(null)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Quality Grade"
        message="Are you sure you want to delete this quality grade?"
        onConfirm={async () => {
          await deleteQuality(deletingId);
          showToast('Quality grade deleted!');
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
