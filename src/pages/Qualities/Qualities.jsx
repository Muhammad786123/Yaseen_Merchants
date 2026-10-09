import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import QualityForm from '../../components/forms/QualityForm.jsx';
import { useQualities } from '../../hooks/useQualities.js';
import { useApp } from '../../context/AppContext.jsx';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Qualities() {
  const navigate = useNavigate();
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
            <TD className="font-bold text-black">
              <button
                onClick={() => navigate(`/quality-ledger?quality=${q.id}`)}
                className="hover:underline text-left cursor-pointer font-bold text-[#1E3A5F]"
                title="Open Quality Movement Ledger"
              >
                {q.name}
              </button>
            </TD>
            <TD className="text-gray-800">{q.description || '-'}</TD>
            <TD>
              <div className="flex items-center justify-end gap-1.5">
                <button
                  onClick={() => navigate(`/quality-ledger?quality=${q.id}`)}
                  className="px-2 py-1 border border-black bg-white hover:bg-emerald-50 text-emerald-800 flex items-center gap-1 font-bold text-xs cursor-pointer"
                  title="View Quality Movement Ledger (PERBALACC Statement)"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Ledger</span>
                </button>
                <button
                  onClick={() => setEditingQuality(q)}
                  className="p-1 border border-black bg-white hover:bg-gray-100 text-gray-800 cursor-pointer"
                  title="Edit Quality"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeletingId(q.id)}
                  className="p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                  title="Delete Quality"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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
