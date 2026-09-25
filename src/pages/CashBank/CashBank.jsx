import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useFinances } from '../../hooks/useFinances.js';
import { useCashBook } from '../../hooks/useCashBook.js';
import { useApp } from '../../context/AppContext.jsx';
import { fmt, formatDate } from '../../utils/formatters.js';
import { Wallet, Landmark, Plus, Eye } from 'lucide-react';

export default function CashBank() {
  const { accounts, receipts, payments, expenses, addAccount } = useFinances();
  const { bankTransfers, cashBookEntries } = useCashBook();
  const { showToast } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState(0);

  const totalLiquidity = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name) return;
    await addAccount({ name, balance: Number(balance) });
    showToast('New bank account added successfully!');
    setName('');
    setBalance(0);
    setIsAddModalOpen(false);
  };

  // Helper to generate chronological Bank ledger for a selected bank account
  const getBankLedgerRows = (accName) => {
    if (!accName) return [];
    const rows = [];

    // Bank Receipts (Received)
    receipts.forEach((r) => {
      if (r.account === accName) {
        rows.push({
          date: r.date,
          refNo: r.no,
          type: 'Customer Receipt',
          description: r.description || `Payment from ${r.partyName}`,
          received: Number(r.amount || 0),
          paid: 0,
        });
      }
    });

    // Bank Payments (Paid)
    payments.forEach((p) => {
      if (p.account === accName) {
        rows.push({
          date: p.date,
          refNo: p.no,
          type: 'Supplier Payment',
          description: p.description || `Payment to ${p.partyName}`,
          received: 0,
          paid: Number(p.amount || 0),
        });
      }
    });

    // Bank Expenses
    expenses.forEach((e) => {
      if (e.account === accName) {
        rows.push({
          date: e.date,
          refNo: 'EXP',
          type: 'Expense',
          description: `${e.category}: ${e.description}`,
          received: 0,
          paid: Number(e.amount || 0),
        });
      }
    });

    // Cash Book Bank Deposits & Withdrawals
    cashBookEntries.forEach((cb) => {
      if (cb.bankAccountName === accName || cb.bankAccountId === selectedAccount?.id) {
        if (cb.type === 'Deposit') {
          rows.push({
            date: cb.date,
            refNo: 'CB-DEP',
            type: 'Cash Deposit',
            description: cb.description || 'Cash deposited from Cash Book',
            received: Number(cb.debit || 0),
            paid: 0,
          });
        } else if (cb.type === 'Withdrawal') {
          rows.push({
            date: cb.date,
            refNo: 'CB-WTH',
            type: 'Cash Withdrawal',
            description: cb.description || 'Cash withdrawn to Cash Book',
            received: 0,
            paid: Number(cb.credit || 0),
          });
        }
      }
    });

    rows.sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = 0;
    return rows.map((r) => {
      running = running + r.received - r.paid;
      return { ...r, balance: running };
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash & Bank Accounts"
        subtitle="Manage liquidity, cash-in-hand, and commercial bank balances with full bank ledgers"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
            Add Account / Bank
          </Button>
        }
      />

      <div className="bg-[#1E3A5F] text-white p-6 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Total Net Liquid Cash & Bank Position
          </div>
          <div className="text-3xl font-bold mt-1 text-white">{fmt(totalLiquidity)}</div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-[#C97B2E] flex items-center justify-center text-white shrink-0">
          <Landmark className="w-6 h-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map((acc) => {
          const isCash = acc.name.toLowerCase().includes('cash');
          return (
            <Card
              key={acc.id}
              className="relative overflow-hidden cursor-pointer hover:border-[#1E3A5F]"
              onClick={() => setSelectedAccount(acc)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {isCash ? 'Physical Cash' : 'Bank Account'}
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#F5F4F0] flex items-center justify-center text-[#1E3A5F]">
                  {isCash ? <Wallet className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                </div>
              </div>
              <h3 className="text-base font-bold text-[#1E3A5F] mb-1">{acc.name}</h3>
              <div className="text-xl font-extrabold text-emerald-600 mb-2">{fmt(acc.balance)}</div>
              <div className="text-[10px] text-gray-400 flex items-center gap-1 font-semibold">
                <Eye className="w-3 h-3" /> Click to view account ledger
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Account Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Cash or Bank Account"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Account / Bank Name"
            value={name}
            onChange={setName}
            placeholder="e.g. Allied Bank Ltd"
            required
          />
          <Input
            label="Initial Opening Balance (PKR)"
            type="number"
            value={balance}
            onChange={setBalance}
            required
          />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bank / Cash Account Ledger Modal */}
      <Modal
        isOpen={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        title={`Account Ledger - ${selectedAccount?.name}`}
        maxWidth="max-w-3xl"
      >
        {selectedAccount && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#FAF9F7] p-3 rounded-lg border border-[#E0DBD3] text-xs">
              <div>
                <span className="text-gray-500">Account Name:</span>{' '}
                <span className="font-bold text-[#1E3A5F]">{selectedAccount.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Current Balance:</span>{' '}
                <span className="font-extrabold text-sm text-emerald-600">
                  {fmt(selectedAccount.balance)}
                </span>
              </div>
            </div>

            <Table
              headers={['Date', 'Ref #', 'Type', 'Description / Details', 'Received (In)', 'Paid (Out)', 'Running Balance']}
              emptyText="No transactions recorded for this account."
            >
              {getBankLedgerRows(selectedAccount.name).map((r, idx) => (
                <TR key={idx}>
                  <TD>{formatDate(r.date)}</TD>
                  <TD mono className="font-bold text-[#1E3A5F]">{r.refNo}</TD>
                  <TD>
                    <Badge variant={r.received > 0 ? 'green' : 'orange'}>{r.type}</Badge>
                  </TD>
                  <TD className="text-xs text-gray-700">{r.description}</TD>
                  <TD mono right className="text-emerald-600 font-bold">
                    {r.received > 0 ? fmt(r.received) : '-'}
                  </TD>
                  <TD mono right className="text-red-600 font-bold">
                    {r.paid > 0 ? fmt(r.paid) : '-'}
                  </TD>
                  <TD mono right className="font-bold text-[#1E3A5F]">
                    {fmt(r.balance)}
                  </TD>
                </TR>
              ))}
            </Table>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedAccount(null)}>
                Close Ledger
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
