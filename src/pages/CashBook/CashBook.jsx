import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import PrintHeader from '../../components/common/PrintHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import DatePicker from '../../components/ui/DatePicker.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import { useCashBook } from '../../hooks/useCashBook.js';
import { useParties } from '../../hooks/useParties.js';
import { useFinances } from '../../hooks/useFinances.js';
import { useApp } from '../../context/AppContext.jsx';
import { fmt, formatDate, getTodayStr } from '../../utils/formatters.js';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  UserCheck,
  Plus,
  Eye,
  Printer,
} from 'lucide-react';

export default function CashBook() {
  const {
    cashBookEntries,
    currentCashBalance,
    depositToBank,
    withdrawFromBank,
    giveCashToParty,
    receiveCashFromParty,
  } = useCashBook();

  const { parties } = useParties();
  const { accounts } = useFinances();
  const { showToast } = useApp();

  const bankAccounts = accounts.filter((a) => !a.name.toLowerCase().includes('cash'));

  // Filters state
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Active action modal
  const [activeModal, setActiveModal] = useState(null); // 'deposit' | 'withdraw' | 'give' | 'receive'
  const [viewingEntry, setViewingEntry] = useState(null);

  // Form states
  const [formDate, setFormDate] = useState(getTodayStr());
  const [bankId, setBankId] = useState('');
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // Filtered Cash Book entries
  const filteredEntries = cashBookEntries.filter((entry) => {
    const matchSearch =
      (entry.description && entry.description.toLowerCase().includes(search.toLowerCase())) ||
      (entry.partyName && entry.partyName.toLowerCase().includes(search.toLowerCase())) ||
      (entry.type && entry.type.toLowerCase().includes(search.toLowerCase())) ||
      (entry.bankAccountName && entry.bankAccountName.toLowerCase().includes(search.toLowerCase()));

    const matchFrom = !dateFrom || entry.date >= dateFrom;
    const matchTo = !dateTo || entry.date <= dateTo;

    return matchSearch && matchFrom && matchTo;
  });

  const totalCashIn = filteredEntries.reduce((sum, e) => sum + Number(e.credit || 0), 0);
  const totalCashOut = filteredEntries.reduce((sum, e) => sum + Number(e.debit || 0), 0);

  const resetForm = () => {
    setFormDate(getTodayStr());
    setBankId(bankAccounts[0]?.id || '');
    setPartyId(parties[0]?.id || '');
    setAmount('');
    setDescription('');
    setActiveModal(null);
  };

  const handleBankDeposit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    const selectedBank = bankAccounts.find((b) => b.id === bankId || b.name === bankId);
    await depositToBank({
      date: formDate,
      bankAccountId: selectedBank ? selectedBank.id : bankId,
      bankAccountName: selectedBank ? selectedBank.name : 'Bank Account',
      amount: Number(amount),
      description,
    });
    showToast(`Deposit of ${fmt(amount)} to Bank recorded!`);
    resetForm();
  };

  const handleBankWithdrawal = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    const selectedBank = bankAccounts.find((b) => b.id === bankId || b.name === bankId);
    await withdrawFromBank({
      date: formDate,
      bankAccountId: selectedBank ? selectedBank.id : bankId,
      bankAccountName: selectedBank ? selectedBank.name : 'Bank Account',
      amount: Number(amount),
      description,
    });
    showToast(`Withdrawal of ${fmt(amount)} from Bank recorded!`);
    resetForm();
  };

  const handleGiveCash = async (e) => {
    e.preventDefault();
    if (!partyId || !amount || Number(amount) <= 0) return;
    const selectedParty = parties.find((p) => p.id === partyId);
    await giveCashToParty({
      date: formDate,
      partyId,
      partyName: selectedParty ? selectedParty.name : 'Party',
      amount: Number(amount),
      description,
    });
    showToast(`Cash payment of ${fmt(amount)} to ${selectedParty?.name} recorded!`);
    resetForm();
  };

  const handleReceiveCash = async (e) => {
    e.preventDefault();
    if (!partyId || !amount || Number(amount) <= 0) return;
    const selectedParty = parties.find((p) => p.id === partyId);
    await receiveCashFromParty({
      date: formDate,
      partyId,
      partyName: selectedParty ? selectedParty.name : 'Party',
      amount: Number(amount),
      description,
    });
    showToast(`Cash receipt of ${fmt(amount)} from ${selectedParty?.name} recorded!`);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Physical Cash Book Ledger"
        subtitle="Central control for all physical cash movements, cash-to-bank transfers, and party settlements"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={() => window.print()}
            >
              Print Statement
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={ArrowUpRight}
              onClick={() => {
                setBankId(bankAccounts[0]?.id || '');
                setActiveModal('deposit');
              }}
            >
              Deposit to Bank
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={ArrowDownLeft}
              onClick={() => {
                setBankId(bankAccounts[0]?.id || '');
                setActiveModal('withdraw');
              }}
            >
              Withdraw from Bank
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={UserCheck}
              onClick={() => {
                setPartyId(parties[0]?.id || '');
                setActiveModal('give');
              }}
            >
              Give Cash to Party
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => {
                setPartyId(parties[0]?.id || '');
                setActiveModal('receive');
              }}
            >
              Receive Cash from Party
            </Button>
          </div>
        }
      />

      {/* Controls & Date Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E0DBD3] no-print">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by party, bank or description..."
          className="w-full sm:w-72"
        />

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-[#E0DBD3] rounded-lg outline-none focus:border-[#1E3A5F]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 border border-[#E0DBD3] rounded-lg outline-none focus:border-[#1E3A5F]"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="text-xs text-red-600 underline font-semibold hover:text-red-800"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      <div className="print-area space-y-6">
        <PrintHeader
          documentTitle="PHYSICAL CASH BOOK LEDGER STATEMENT"
          subtitle="Central audit register for physical cash movements, cash-to-bank transfers, and party settlements"
        />

        {/* Top Stat Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Physical Cash in Hand"
            value={fmt(currentCashBalance)}
            sub="Current Cash Book Running Balance"
            icon={Wallet}
            color="text-[#1E3A5F]"
          />
          <StatCard
            label="Filtered Total Cash In (Credit)"
            value={fmt(totalCashIn)}
            sub="Cash Received / Withdrawn"
            icon={ArrowDownLeft}
            color="text-emerald-600"
          />
          <StatCard
            label="Filtered Total Cash Out (Debit)"
            value={fmt(totalCashOut)}
            sub="Cash Paid / Deposited"
            icon={ArrowUpRight}
            color="text-red-600"
          />
        </div>

      {/* Cash Book Ledger Table */}
      <Table
        headers={[
          'Date',
          'Type / Reference',
          'Description',
          'Party (if any)',
          'Bank A/C (if any)',
          'Debit (Cash Out)',
          'Credit (Cash In)',
          'Running Cash Balance',
          'Action',
        ]}
        emptyText="No cash book entries recorded for this period."
      >
        {filteredEntries.map((entry) => (
          <TR
            key={entry.id}
            onClick={() => setViewingEntry(entry)}
            highlight={entry.type === 'Deposit' || entry.type === 'Withdrawal'}
          >
            <TD>{formatDate(entry.date)}</TD>
            <TD>
              <Badge
                variant={
                  entry.type === 'Receipt' || entry.type === 'CashReceived' || entry.type === 'Withdrawal'
                    ? 'green'
                    : entry.type === 'Payment' || entry.type === 'CashGiven' || entry.type === 'Deposit'
                    ? 'orange'
                    : 'purple'
                }
              >
                {entry.type}
              </Badge>
            </TD>
            <TD className="font-medium text-gray-900 max-w-xs truncate">{entry.description}</TD>
            <TD className="font-semibold text-[#1E3A5F]">{entry.partyName || '-'}</TD>
            <TD className="text-gray-600">{entry.bankAccountName || '-'}</TD>
            <TD mono right className="text-red-600 font-bold">
              {entry.debit > 0 ? fmt(entry.debit) : '-'}
            </TD>
            <TD mono right className="text-emerald-600 font-bold">
              {entry.credit > 0 ? fmt(entry.credit) : '-'}
            </TD>
            <TD mono right className="font-extrabold text-[#1E3A5F]">
              {fmt(entry.balance)}
            </TD>
            <TD>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewingEntry(entry);
                }}
                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-[#1E3A5F]"
                title="View Transaction Details"
              >
                <Eye className="w-4 h-4" />
              </button>
            </TD>
          </TR>
        ))}
      </Table>
      </div>

      {/* Deposit Modal */}
      <Modal
        isOpen={activeModal === 'deposit'}
        onClose={resetForm}
        title="Deposit Physical Cash to Bank Account"
      >
        <form onSubmit={handleBankDeposit} className="space-y-4">
          <DatePicker label="Deposit Date" value={formDate} onChange={setFormDate} required />
          <Select
            label="Target Bank Account"
            value={bankId}
            onChange={setBankId}
            options={bankAccounts.map((b) => ({ value: b.id, label: `${b.name} (${fmt(b.balance)})` }))}
            required
          />
          <Input
            label="Deposit Amount (PKR)"
            type="number"
            value={amount}
            onChange={setAmount}
            placeholder="e.g. 50000"
            required
          />
          <Input
            label="Description / Slip Note"
            value={description}
            onChange={setDescription}
            placeholder="e.g. Bank slip deposit #1042"
          />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm Bank Deposit
            </Button>
          </div>
        </form>
      </Modal>

      {/* Withdrawal Modal */}
      <Modal
        isOpen={activeModal === 'withdraw'}
        onClose={resetForm}
        title="Withdraw Cash from Bank Account"
      >
        <form onSubmit={handleBankWithdrawal} className="space-y-4">
          <DatePicker label="Withdrawal Date" value={formDate} onChange={setFormDate} required />
          <Select
            label="Source Bank Account"
            value={bankId}
            onChange={setBankId}
            options={bankAccounts.map((b) => ({ value: b.id, label: `${b.name} (${fmt(b.balance)})` }))}
            required
          />
          <Input
            label="Withdrawal Amount (PKR)"
            type="number"
            value={amount}
            onChange={setAmount}
            placeholder="e.g. 25000"
            required
          />
          <Input
            label="Description / Cheque #"
            value={description}
            onChange={setDescription}
            placeholder="e.g. Cheque withdrawal #99482"
          />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm Bank Withdrawal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Give Cash Modal */}
      <Modal
        isOpen={activeModal === 'give'}
        onClose={resetForm}
        title="Give Cash to Party (Payment / Advance)"
      >
        <form onSubmit={handleGiveCash} className="space-y-4">
          <DatePicker label="Date" value={formDate} onChange={setFormDate} required />
          <Select
            label="Select Party / Business"
            value={partyId}
            onChange={setPartyId}
            options={parties.map((p) => ({ value: p.id, label: `${p.name} (${p.type} - ${p.city})` }))}
            required
          />
          <Input
            label="Cash Amount (PKR)"
            type="number"
            value={amount}
            onChange={setAmount}
            placeholder="e.g. 15000"
            required
          />
          <Input
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="e.g. Cash advance for cotton waste shipment"
          />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Record Cash Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Receive Cash Modal */}
      <Modal
        isOpen={activeModal === 'receive'}
        onClose={resetForm}
        title="Receive Cash from Party (Receipt / Refund)"
      >
        <form onSubmit={handleReceiveCash} className="space-y-4">
          <DatePicker label="Date" value={formDate} onChange={setFormDate} required />
          <Select
            label="Select Party / Business"
            value={partyId}
            onChange={setPartyId}
            options={parties.map((p) => ({ value: p.id, label: `${p.name} (${p.type} - ${p.city})` }))}
            required
          />
          <Input
            label="Cash Amount (PKR)"
            type="number"
            value={amount}
            onChange={setAmount}
            placeholder="e.g. 20000"
            required
          />
          <Input
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="e.g. Cash payment received against invoice"
          />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Record Cash Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Entry Details Modal */}
      <Modal
        isOpen={!!viewingEntry}
        onClose={() => setViewingEntry(null)}
        title="Cash Book Transaction Details"
      >
        {viewingEntry && (
          <div
            id="cashbook-print-area"
            className="print-area w-full bg-white text-black space-y-4"
            style={{ margin: '0 auto', boxSizing: 'border-box' }}
          >
            <div className="flex justify-between items-center pb-2 border-b border-[#E0DBD3] no-print">
              <h3 className="text-sm font-bold text-[#1E3A5F]">Transaction Details</h3>
              <Button variant="primary" size="sm" icon={Printer} onClick={() => window.print()}>
                Print Receipt
              </Button>
            </div>

            <PrintHeader
              documentTitle="CASH TRANSACTION RECEIPT"
              documentNo={viewingEntry.id}
              dateStr={formatDate(viewingEntry.date)}
            />

            <div className="bg-[#FAF9F7] p-4 rounded-xl border border-[#D1D5DB] space-y-3 text-xs">
              <div className="flex justify-between border-b border-[#E0DBD3] pb-2">
                <span className="text-gray-500 font-semibold">Transaction Type:</span>
                <Badge variant="blue">{viewingEntry.type}</Badge>
              </div>
              {viewingEntry.partyName && (
                <div className="flex justify-between border-b border-[#E0DBD3] pb-2">
                  <span className="text-gray-500">Party Account:</span>
                  <span className="font-bold text-[#1E3A5F]">{viewingEntry.partyName}</span>
                </div>
              )}
              {viewingEntry.bankAccountName && (
                <div className="flex justify-between border-b border-[#E0DBD3] pb-2">
                  <span className="text-gray-500">Bank Account:</span>
                  <span className="font-bold">{viewingEntry.bankAccountName}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-[#E0DBD3] pb-2">
                <span className="text-gray-500">Cash Out (Debit):</span>
                <span className="font-bold text-red-600">{fmt(viewingEntry.debit)}</span>
              </div>
              <div className="flex justify-between border-b border-[#E0DBD3] pb-2">
                <span className="text-gray-500">Cash In (Credit):</span>
                <span className="font-bold text-emerald-600">{fmt(viewingEntry.credit)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-500 font-medium">Running Cash Balance:</span>
                <span className="font-extrabold text-base text-[#1E3A5F]">
                  {fmt(viewingEntry.balance)}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-600">
              <span className="font-semibold text-gray-700">Description:</span>{' '}
              {viewingEntry.description || 'No notes provided'}
            </div>
            <div className="flex justify-end pt-3 no-print">
              <Button variant="secondary" onClick={() => setViewingEntry(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
