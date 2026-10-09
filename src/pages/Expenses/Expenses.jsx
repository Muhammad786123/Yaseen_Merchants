import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Button from '../../components/ui/Button.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import ExpenseForm from '../../components/forms/ExpenseForm.jsx';
import { useFinances } from '../../hooks/useFinances.js';
import { useApp } from '../../context/AppContext.jsx';
import { fmt, formatDate } from '../../utils/formatters.js';
import { Plus, Trash2 } from 'lucide-react';

export default function Expenses() {
  const { expenses, accounts, addExpense, deleteExpense } = useFinances();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const filtered = expenses.filter(
    (e) =>
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factory & Admin Expenses"
        subtitle="Track operating expenses, wages, electricity bills, transport, and maintenance"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
            Record Expense
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#EBE9ED] p-2.5 border-2 border-black">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search expenses by category or description..."
          className="w-full sm:w-80"
        />
        <div className="text-xs font-bold text-black">
          Total Operating Expenses: <span className="font-mono font-black text-sm text-red-700">{fmt(totalExpense)}</span>
        </div>
      </div>

      <Table
        headers={['Date', 'Expense Details', 'Category', 'Paid From Account', 'Amount', 'Actions']}
        emptyText="No expenses recorded."
      >
        {filtered.map((e) => (
          <TR key={e.id}>
            <TD>{formatDate(e.date)}</TD>
            <TD className="font-bold text-black">{e.description}</TD>
            <TD>
              <Badge variant="purple">{e.category}</Badge>
            </TD>
            <TD>{e.account}</TD>
            <TD mono right className="font-bold text-red-700">{fmt(e.amount)}</TD>
            <TD>
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setDeletingId(e.id)}
                  className="p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                  title="Delete Expense"
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
        title="Record New Operating Expense"
      >
        <ExpenseForm
          accounts={accounts}
          onSubmit={async (data) => {
            await addExpense(data);
            showToast('Expense recorded!');
            setIsAddModalOpen(false);
          }}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Expense Record"
        message="Are you sure you want to delete this expense record?"
        onConfirm={async () => {
          await deleteExpense(deletingId);
          showToast('Expense deleted!');
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
