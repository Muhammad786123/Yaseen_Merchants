import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import Modal from '../../components/ui/Modal.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import { useCashBook } from '../../hooks/useCashBook.js';
import { useParties } from '../../hooks/useParties.js';
import { useFinances } from '../../hooks/useFinances.js';
import { useApp } from '../../context/AppContext.jsx';
import { db } from '../../db/database.js';
import { safePrint } from '../../utils/printUtils.js';
import { fmt, formatDate, getTodayStr } from '../../utils/formatters.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { cashBookService } from '../../services/cashBookService.js';
import {
  Save,
  PlusCircle,
  XCircle,
  Search,
  CheckCircle2,
  Power,
  Printer,
  Pencil,
  Trash2,
  Lock,
} from 'lucide-react';

const DENOMINATIONS = [5000, 1000, 500, 100, 50, 20, 10, 5];

const createEmptyRow = (idx) => ({
  id: `row_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
  accountType: 'party', // 'party' | 'bank' | 'general'
  accountNo: '',
  accountId: '',
  accountName: '',
  detail: '',
  credit: '',
  debit: '',
});

export default function CashBook() {
  const navigate = useNavigate();
  const { cashBookEntries, currentCashBalance } = useCashBook();
  const { parties } = useParties();
  const { accounts } = useFinances();
  const { showToast } = useApp();

  const bankAccounts = accounts.filter((a) => !a.name.toLowerCase().includes('cash'));

  // --- MANUAL CASH BOOK ENTRY SCREEN STATE ---
  const [cashBookNo, setCashBookNo] = useState(1);
  const [entryDate, setEntryDate] = useState(getTodayStr());
  const [topAccountNo, setTopAccountNo] = useState('');
  const [topAccountId, setTopAccountId] = useState('');
  const [topAccountName, setTopAccountName] = useState('');
  const [activePartyBalance, setActivePartyBalance] = useState(0);

  // 8 default rows matching the reference layout
  const [rows, setRows] = useState(() => Array.from({ length: 8 }, (_, i) => createEmptyRow(i)));

  // Cash Details denominations: count per denomination
  const [denominations, setDenominations] = useState(() =>
    DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: '' }), {})
  );

  // Search modal state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [voucherFilter, setVoucherFilter] = useState('');

  // Edit / Delete individual entry state
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingEntryId, setDeletingEntryId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editPartyId, setEditPartyId] = useState('');
  const [editBankId, setEditBankId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDebit, setEditDebit] = useState(0);
  const [editCredit, setEditCredit] = useState(0);

  // Auto-generate next Cash Book Number starting fresh from 0001
  useEffect(() => {
    async function determineNextCbNo() {
      try {
        const all = await db.cashBookEntries.toArray();
        const maxNo = all.reduce((max, e) => {
          const num = parseInt(e.cashBookNo, 10);
          return !isNaN(num) && num > max ? num : max;
        }, 0);
        setCashBookNo(maxNo > 0 ? maxNo + 1 : 1);
      } catch {
        setCashBookNo(1);
      }
    }
    determineNextCbNo();
  }, [cashBookEntries.length]);

  // Selected party / account from top bar
  const selectedTopParty = parties.find((p) => p.id === topAccountId || p.name === topAccountName);
  const previousBalance = selectedTopParty ? Number(selectedTopParty.balance || 0) : 0;

  // Format Date for DD/MM/YY and calculate Day of Week
  const { formattedDateDDMMYY, dayOfWeek } = useMemo(() => {
    try {
      const d = new Date(entryDate);
      if (isNaN(d.getTime())) return { formattedDateDDMMYY: '', dayOfWeek: '' };
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return {
        formattedDateDDMMYY: `${dd}/${mm}/${yy}`,
        dayOfWeek: days[d.getDay()],
      };
    } catch {
      return { formattedDateDDMMYY: '', dayOfWeek: '' };
    }
  }, [entryDate]);

  // Row update handlers
  const handleRowChange = (idx, field, value) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };

      if (field === 'accountId') {
        // Determine if selection is party or bank
        const party = parties.find((p) => p.id === value);
        if (party) {
          updated[idx].accountType = 'party';
          updated[idx].accountNo = party.code || party.id;
          updated[idx].accountName = party.name;
          setActivePartyBalance(Number(party.balance || 0));
        } else {
          const bank = bankAccounts.find((b) => b.id === value);
          if (bank) {
            updated[idx].accountType = 'bank';
            updated[idx].accountNo = bank.code || bank.id;
            updated[idx].accountName = bank.name;
            setActivePartyBalance(Number(bank.balance || 0));
          } else {
            const acc = accounts.find((a) => a.id === value);
            if (acc) {
              updated[idx].accountType = 'general';
              updated[idx].accountNo = acc.code || acc.id;
              updated[idx].accountName = acc.name;
              setActivePartyBalance(Number(acc.balance || 0));
            }
          }
        }
      }
      return updated;
    });
  };

  // Top account change handler
  const handleTopAccountSelect = (val) => {
    const party = parties.find((p) => p.id === val);
    if (party) {
      setTopAccountId(party.id);
      setTopAccountNo(party.code || party.id);
      setTopAccountName(party.name);
      setActivePartyBalance(Number(party.balance || 0));

      setRows((prev) => {
        const updated = [...prev];
        if (!updated[0].accountName) {
          updated[0].accountType = 'party';
          updated[0].accountId = party.id;
          updated[0].accountNo = party.code || party.id;
          updated[0].accountName = party.name;
        }
        return updated;
      });
    } else {
      const bank = bankAccounts.find((b) => b.id === val);
      if (bank) {
        setTopAccountId(bank.id);
        setTopAccountNo(bank.code || bank.id);
        setTopAccountName(bank.name);
        setActivePartyBalance(Number(bank.balance || 0));

        setRows((prev) => {
          const updated = [...prev];
          if (!updated[0].accountName) {
            updated[0].accountType = 'bank';
            updated[0].accountId = bank.id;
            updated[0].accountNo = bank.code || bank.id;
            updated[0].accountName = bank.name;
          }
          return updated;
        });
      }
    }
  };

  // Grid live calculations
  const totalCredit = rows.reduce((sum, r) => sum + (Number(r.credit) || 0), 0);
  const totalDebit = rows.reduce((sum, r) => sum + (Number(r.debit) || 0), 0);
  const netMovement = totalCredit - totalDebit;
  const currentRunningBalance = Number(currentCashBalance || 0) + netMovement;

  // Denominations live calculations
  const denominationValues = useMemo(() => {
    let countSum = 0;
    let valSum = 0;
    const detailList = DENOMINATIONS.map((d) => {
      const count = parseInt(denominations[d], 10) || 0;
      const val = count * d;
      countSum += count;
      valSum += val;
      return { denom: d, count, val };
    });
    return { detailList, countSum, valSum };
  }, [denominations]);

  // Difference between Physical Cash details and Grid Net Cash
  const cashDifference = denominationValues.valSum - totalCredit;

  // Handle Save / Post
  const handleSaveEntry = async () => {
    const validRows = rows.filter(
      (r) => (r.accountName || r.accountId) && (Number(r.credit) > 0 || Number(r.debit) > 0)
    );

    if (validRows.length === 0) {
      alert('Please fill in at least one row with an Account Name and Credit/Debit amount.');
      return;
    }

    try {
      for (const row of validRows) {
        const cred = Number(row.credit) || 0;
        const deb = Number(row.debit) || 0;
        const pId = row.accountId || (parties.find((p) => p.name === row.accountName)?.id) || null;
        const bId = row.accountId || (bankAccounts.find((b) => b.name === row.accountName)?.id) || null;

        const isBank = row.accountType === 'bank' || bankAccounts.some((b) => b.id === row.accountId || b.name === row.accountName);

        // Post Cash Book entry
        const entryId = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        await db.cashBookEntries.add({
          id: entryId,
          date: entryDate,
          cashBookNo: String(cashBookNo),
          partyId: isBank ? null : pId,
          partyName: isBank ? null : row.accountName,
          bankAccountId: isBank ? bId : null,
          bankAccountName: isBank ? row.accountName : null,
          debit: deb,
          credit: cred,
          description: row.detail || `Manual Cash Book No ${cashBookNo}`,
          type: isBank ? (deb > 0 ? 'Deposit' : 'Withdrawal') : (cred > 0 ? 'CashReceived' : 'CashGiven'),
          refNo: `CB-${String(cashBookNo).padStart(4, '0')}`,
        });

        if (isBank) {
          // Cash Book: Credit = cash from bank (withdrawal), bank decreases
          // Debit = cash to bank (deposit), bank increases
          const bank = await db.accounts.get(bId) || await db.accounts.where({ name: row.accountName }).first();
          if (bank) {
            const currentBankBal = Number(bank.balance || 0);
            const newBankBal = currentBankBal + deb - cred;
            await db.accounts.update(bank.id, { balance: newBankBal });
          }
        } else if (pId) {
          // Party: Cash given (debit) increases party balance, Cash received (credit) decreases party balance
          const party = await db.parties.get(pId);
          if (party) {
            const currentBal = Number(party.balance || 0);
            const newBal = currentBal + deb - cred;
            await db.parties.update(pId, { balance: newBal });
          }
        }
      }

      // Update physical Cash account in accounts table
      const cashAcc = await db.accounts.where({ name: 'Cash' }).first();
      if (cashAcc) {
        await db.accounts.update(cashAcc.id, {
          balance: Number(cashAcc.balance || 0) + totalCredit - totalDebit,
        });
      }

      showToast(`Cash Book #${cashBookNo} saved successfully! (${validRows.length} lines posted)`);
      handleNewEntry();
    } catch (err) {
      console.error('Failed to save Cash Book:', err);
      alert('Error saving Cash Book entry. Check console for details.');
    }
  };

  // Reset for New Entry
  const handleNewEntry = () => {
    setCashBookNo((prev) => prev + 1);
    setEntryDate(getTodayStr());
    setTopAccountNo('');
    setTopAccountId('');
    setTopAccountName('');
    setActivePartyBalance(0);
    setRows(Array.from({ length: 8 }, (_, i) => createEmptyRow(i)));
    setDenominations(DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: '' }), {}));
  };

  // Clear current rows
  const handleClearRows = () => {
    if (window.confirm('Clear all entered rows on this Cash Book screen?')) {
      setRows(Array.from({ length: 8 }, (_, i) => createEmptyRow(i)));
      setDenominations(DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: '' }), {}));
    }
  };

  // Confirm / Reconcile verification
  const handleConfirmVerify = () => {
    const validRows = rows.filter(
      (r) => (r.accountName || r.accountId) && (Number(r.credit) > 0 || Number(r.debit) > 0)
    );
    if (validRows.length === 0) {
      alert('No entries to verify. Please enter transaction rows.');
      return;
    }
    if (denominationValues.valSum > 0 && cashDifference !== 0) {
      alert(
        `Reconciliation Notice:\nPhysical Cash Count: ${fmt(denominationValues.valSum)}\nTotal Cash Received: ${fmt(totalCredit)}\nDifference: ${fmt(cashDifference)}\n\nPlease recount notes before saving.`
      );
    } else {
      alert(
        `✓ All ${validRows.length} entries verified!\nTotal Credit (Jamma): ${fmt(totalCredit)}\nTotal Debit (Benaam): ${fmt(totalDebit)}\nNet Movement: ${fmt(netMovement)}\nPhysical Cash Reconciliation: Matched.`
      );
    }
  };

  // Print Cash Book Voucher
  const handlePrint = () => {
    const printArea = document.getElementById('cashbook-print-area');
    if (!printArea) {
      alert('Error: Cash Book print area not found.');
      return;
    }
    safePrint();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cash Book"
        subtitle="Traditional Roznamcha Cash In/Out journal, physical denomination count & party reconciliation"
        actions={
          <div className="flex gap-2 no-print">
            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              className="bg-white hover:bg-gray-100 border border-black px-3 py-1.5 text-xs font-bold text-black flex items-center gap-1.5 cursor-pointer shadow-none no-print"
            >
              <Search className="w-3.5 h-3.5 text-blue-700" />
              <span>Find Cash Voucher</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="bg-white hover:bg-gray-100 border border-black px-3 py-1.5 text-xs font-bold text-black flex items-center gap-1.5 cursor-pointer shadow-none no-print"
            >
              <Printer className="w-3.5 h-3.5 text-gray-700" />
              <span>Print</span>
            </button>
          </div>
        }
      />

      {/* Classic Traditional Cash Book Container */}
      <div
        id="cashbook-print-area"
        className="print-area bg-[#EBE9ED] print:bg-white p-4 sm:p-6 print:p-2 font-sans text-gray-900 border-2 border-black shadow-none"
      >
        {/* Title Box */}
        <div className="text-center mb-3">
          <div className="text-xs font-bold text-gray-700 uppercase tracking-widest">
            Shahid Yaseen Cotton Waste Merchant
          </div>
          <div className="inline-block bg-white border-2 border-black px-12 py-1 mt-1">
            <h1 className="text-2xl sm:text-3xl font-black text-[#800000] tracking-wider uppercase font-serif">
              CASH BOOK
            </h1>
          </div>
        </div>

        {/* Top Info Bar (Bordered container) */}
        <div className="cashbook-info-bar max-w-2xl mx-auto mb-4 border-2 border-[#0000CC] bg-[#EBE9ED] print:bg-[#FAF9F7] p-3 space-y-2">
          {/* Row 1: Cash Book No & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-12 print:grid-cols-12 gap-2 items-center text-sm">
            <label className="sm:col-span-3 print:col-span-3 font-bold text-gray-900">Cash Book No</label>
            <div className="sm:col-span-3 print:col-span-3">
              <input
                type="text"
                readOnly
                value={String(cashBookNo).padStart(4, '0')}
                className="w-full bg-white border border-black px-2 py-1 font-mono font-bold text-gray-900 outline-none text-center text-sm"
              />
            </div>

            <label className="sm:col-span-2 print:col-span-2 font-bold text-gray-900 text-end pe-1">Date(DD/MM/YY)</label>
            <div className="sm:col-span-2 print:col-span-2">
              <span className="hidden print:block w-full bg-white border border-black px-1.5 py-1 text-sm font-mono font-bold text-center">
                {formattedDateDDMMYY || entryDate}
              </span>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="print:hidden w-full bg-white border border-black px-1.5 py-1 text-sm outline-none"
              />
            </div>
            <div className="sm:col-span-2 print:col-span-2">
              <div
                className="w-full bg-[#76FF03] border border-black font-bold font-mono text-xs text-black px-1 py-1 text-center truncate"
                title={dayOfWeek}
              >
                {dayOfWeek || 'Today'}
              </div>
            </div>
          </div>

          {/* Row 2: Account No & Account Name */}
          <div className="grid grid-cols-1 sm:grid-cols-12 print:grid-cols-12 gap-2 items-center text-sm">
            <label className="sm:col-span-3 print:col-span-3 font-bold text-gray-900">Account No</label>
            <div className="sm:col-span-3 print:col-span-3">
              <span className="hidden print:block w-full bg-white border border-black px-1.5 py-1 text-sm font-mono font-bold text-center">
                {topAccountNo || (selectedTopParty ? (selectedTopParty.code || selectedTopParty.id) : '-')}
              </span>
              <select
                value={topAccountId}
                onChange={(e) => handleTopAccountSelect(e.target.value)}
                className="print:hidden w-full bg-white border border-black px-1.5 py-1 text-sm outline-none font-mono"
              >
                <option value="">-- Select Account --</option>
                <optgroup label="Parties">
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code || p.id} - {p.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Bank Accounts">
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code || b.id} - {b.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <label className="sm:col-span-2 print:col-span-2 font-bold text-gray-900 text-end pe-1">Account Name</label>
            <div className="sm:col-span-4 print:col-span-4">
              <span className="hidden print:block w-full bg-white border border-black px-2 py-1 text-sm font-bold text-gray-900 truncate">
                {topAccountName || '-'}
              </span>
              <input
                type="text"
                readOnly
                value={topAccountName}
                placeholder="Account name..."
                dir="auto"
                className="print:hidden w-full bg-white border border-black px-2 py-1 text-sm font-bold text-gray-900 outline-none text-start"
              />
            </div>
          </div>

          {/* Row 3: Previous Balance */}
          <div className="grid grid-cols-1 sm:grid-cols-12 print:grid-cols-12 gap-2 items-center text-sm">
            <div className="sm:col-span-6 print:col-span-6"></div>
            <label className="sm:col-span-2 print:col-span-2 font-bold text-gray-900 text-end pe-1">Previous Balance</label>
            <div className="sm:col-span-4 print:col-span-4">
              <div className="w-full bg-[#76FF03] border border-black font-bold font-mono text-sm text-black px-2 py-1 text-left tabular-nums" dir="ltr">
                {previousBalance ? fmt(previousBalance) : '0.00'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid & Cash Details Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 print:grid-cols-12 gap-3 items-start">
          {/* Left Side: Multi-row Entry Grid */}
          <div className="lg:col-span-8 print:col-span-8 cashbook-grid-box border-2 border-[#0000CC] bg-[#EBE9ED] print:bg-[#FAF9F7] p-2 flex flex-col justify-between shadow-none min-h-[460px] print:min-h-0">
            <div>
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full border-collapse border border-black text-base bg-white">
                  <thead>
                    <tr className="bg-[#DFDFDF] border-b border-black text-gray-900 font-bold text-center">
                      <th className="border border-black px-3 py-2.5 w-24 text-base font-bold">Acc/ No</th>
                      <th className="border border-black px-3 py-2.5 w-48 text-start text-base font-bold">Account Name</th>
                      <th className="border border-black px-3 py-2.5 text-start text-base font-bold">Detail</th>
                      <th className="border border-black px-3 py-2.5 w-28 text-left text-base font-bold" dir="ltr">Credit/Jamma</th>
                      <th className="border border-black px-3 py-2.5 w-28 text-left text-base font-bold" dir="ltr">Debit/Benaam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-blue-50/40">
                        {/* Acc/ No Selector */}
                        <td className="border border-black p-0 text-center">
                          <span className="hidden print:block px-2 py-2 text-base font-mono tabular-nums">
                            {row.accountNo || '-'}
                          </span>
                          <select
                            value={row.accountId}
                            onChange={(e) => handleRowChange(idx, 'accountId', e.target.value)}
                            className="print:hidden w-full px-2 py-2 text-base font-mono outline-none bg-transparent"
                          >
                            <option value="">-</option>
                            <optgroup label="Parties">
                              {parties.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.code || p.id} - {p.name}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Bank Accounts">
                              {bankAccounts.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.code || b.id} - {b.name}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </td>

                        {/* Account Name */}
                        <td className="border border-black p-0">
                          <span className="hidden print:block px-3 py-2 text-base font-medium truncate text-start">
                            {row.accountName || ''}
                          </span>
                          <input
                            type="text"
                            value={row.accountName}
                            onChange={(e) => handleRowChange(idx, 'accountName', e.target.value)}
                            placeholder="Select or enter account..."
                            dir="auto"
                            className="print:hidden w-full px-3 py-2 text-base outline-none bg-transparent font-medium text-start"
                          />
                        </td>

                        {/* Detail Narration */}
                        <td className="border border-black p-0">
                          <span className="hidden print:block px-3 py-2 text-base text-gray-800 truncate text-start">
                            {row.detail || ''}
                          </span>
                          <input
                            type="text"
                            value={row.detail}
                            onChange={(e) => handleRowChange(idx, 'detail', e.target.value)}
                            placeholder="Manual description..."
                            dir="auto"
                            className="print:hidden w-full px-3 py-2 text-base outline-none bg-transparent text-start"
                          />
                        </td>

                        {/* Credit / Jamma (Cash In) */}
                        <td className="border border-black p-0" dir="ltr">
                          <span className="hidden print:block px-3 py-2 text-base font-mono font-bold text-left text-emerald-800 tabular-nums">
                            {row.credit ? Number(row.credit).toLocaleString('en-PK') : '-'}
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={row.credit}
                            onChange={(e) => handleRowChange(idx, 'credit', e.target.value)}
                            placeholder="0"
                            dir="ltr"
                            className="print:hidden w-full px-3 py-2 text-base font-mono font-bold text-left outline-none bg-transparent text-emerald-800 tabular-nums"
                          />
                        </td>

                        {/* Debit / Benaam (Cash Out) */}
                        <td className="border border-black p-0" dir="ltr">
                          <span className="hidden print:block px-3 py-2 text-base font-mono font-bold text-left text-red-800 tabular-nums">
                            {row.debit ? Number(row.debit).toLocaleString('en-PK') : '-'}
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={row.debit}
                            onChange={(e) => handleRowChange(idx, 'debit', e.target.value)}
                            placeholder="0"
                            dir="ltr"
                            className="print:hidden w-full px-3 py-2 text-base font-mono font-bold text-left outline-none bg-transparent text-red-800 tabular-nums"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Helper hint */}
              <div className="mt-1 flex items-center justify-between text-sm text-gray-700 px-1 font-medium no-print">
                <span>Credit/Jamma = Cash Received | Debit/Benaam = Cash Paid</span>
                <button
                  type="button"
                  onClick={() => setRows((prev) => [...prev, createEmptyRow(prev.length)])}
                  className="text-blue-900 font-bold hover:underline cursor-pointer"
                >
                  + Add Row
                </button>
              </div>
            </div>

            {/* Bottom Totals Bar */}
            <div className="mt-4 pt-2 border-t border-black space-y-2">
              <div className="flex items-center justify-end gap-2 text-base">
                <span className="font-bold text-gray-900">Total</span>
                <div className="w-28 bg-white border border-black px-2.5 py-1.5 text-left font-mono font-bold text-[17px] text-emerald-800 tabular-nums" dir="ltr">
                  {totalCredit ? totalCredit.toLocaleString('en-PK') : '0'}
                </div>
                <div className="w-28 bg-white border border-black px-2.5 py-1.5 text-left font-mono font-bold text-[17px] text-red-800 tabular-nums" dir="ltr">
                  {totalDebit ? totalDebit.toLocaleString('en-PK') : '0'}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-red-700">Party Balance</span>
                  <div className="bg-[#0000FF] border border-black px-4 py-1.5 text-white font-mono font-bold text-[17px] min-w-[130px] text-center tabular-nums" dir="ltr">
                    {activePartyBalance ? fmt(activePartyBalance) : (previousBalance ? fmt(previousBalance) : '0.00')}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">Current Cash Balance</span>
                  <div className="bg-[#76FF03] border border-black px-4 py-1.5 text-black font-mono font-bold text-[17px] min-w-[140px] text-left tabular-nums" dir="ltr">
                    {fmt(currentRunningBalance)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Cash Details Denomination Breakdown */}
          <div className="lg:col-span-4 print:col-span-4">
            <h3 className="text-center font-bold text-base text-[#800000] uppercase tracking-wider mb-1">
              CASH DETAILS
            </h3>

            <div className="cashbook-denom-box border-2 border-[#0000CC] bg-[#EBE9ED] print:bg-[#FAF9F7] p-2">
              <table className="w-full border-collapse border border-black text-base bg-white">
                <thead>
                  <tr className="bg-[#DFDFDF] border-b border-black text-gray-900 font-bold text-center">
                    <th className="border border-black px-2.5 py-2 w-16 text-start text-sm font-bold">Details</th>
                    <th className="border border-black px-2.5 py-2 w-16 text-sm font-bold">Count</th>
                    <th className="border border-black px-2.5 py-2 text-left text-sm font-bold" dir="ltr">Cash</th>
                  </tr>
                </thead>
                <tbody>
                  {denominationValues.detailList.map((item) => (
                    <tr key={item.denom} className="hover:bg-gray-50">
                      <td className="border border-black px-2.5 py-1.5 font-bold font-mono text-gray-900 tabular-nums text-start">
                        {item.denom}
                      </td>
                      <td className="border border-black p-0 text-center">
                        <span className="hidden print:block font-mono text-base text-center py-1 tabular-nums">
                          {denominations[item.denom] || '-'}
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={denominations[item.denom] || ''}
                          onChange={(e) =>
                            setDenominations((prev) => ({ ...prev, [item.denom]: e.target.value }))
                          }
                          placeholder="0"
                          dir="ltr"
                          className="print:hidden w-full px-2 py-1.5 text-base font-mono text-center outline-none bg-transparent tabular-nums"
                        />
                      </td>
                      <td className="border border-black px-2.5 py-1.5 text-left font-mono font-bold text-gray-900 tabular-nums" dir="ltr">
                        {item.val ? item.val.toLocaleString('en-PK') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#DFDFDF] font-bold">
                    <td className="border border-black px-2.5 py-2 text-gray-900 text-base font-bold text-start">Total</td>
                    <td className="border border-black px-2 py-2 text-center font-mono text-[17px] font-bold tabular-nums">
                      {denominationValues.countSum || 0}
                    </td>
                    <td className="border border-black px-2 py-2 text-left font-mono text-[17px] font-bold text-emerald-900 tabular-nums" dir="ltr">
                      {denominationValues.valSum.toLocaleString('en-PK')}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Difference Box */}
              <div className="mt-3 pt-2 border-t border-black flex items-center justify-between text-sm">
                <span className="font-bold text-[#A52A2A]">Difference</span>
                <div
                  className={`bg-[#76FF03] border border-black px-3 py-1 font-mono font-bold text-base min-w-[110px] text-left tabular-nums ${
                    cashDifference !== 0 ? 'text-red-900' : 'text-black'
                  }`}
                  dir="ltr"
                >
                  {cashDifference ? fmt(cashDifference) : '0.00'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Print-only Signatures & Audit Footer */}
        <div className="hidden print:block mt-6 pt-3 border-t border-black">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-6 print-note-text">
            <span>Printed on: <strong>{new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
            <span>Cash Book Voucher #<strong>{String(cashBookNo).padStart(4, '0')}</strong></span>
            <span>System: <strong>Yaseen Merchants Offline Accounting</strong></span>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center text-sm">
            <div className="flex flex-col items-center">
              <div className="w-40 border-b border-black mb-1 h-6" />
              <span className="font-bold text-sm uppercase print-note-text">Cashier / Prepared By</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-40 border-b border-black mb-1 h-6" />
              <span className="font-bold text-sm uppercase print-note-text">Checked / Verified By</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-40 border-b border-black mb-1 h-6" />
              <span className="font-bold text-sm uppercase print-note-text">Proprietor / Authorized</span>
            </div>
          </div>
        </div>

        {/* Bottom Action Toolbar */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-6 no-print">
          <div className="border-2 border-black bg-white p-1 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveEntry}
              className="w-10 h-10 flex items-center justify-center border border-black bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-all cursor-pointer"
              title="Save / Post Cash Book Entry"
            >
              <Save className="w-5 h-5 text-emerald-700" />
            </button>

            <button
              type="button"
              onClick={handleNewEntry}
              className="w-10 h-10 flex items-center justify-center border border-black bg-blue-50 hover:bg-blue-100 text-blue-800 transition-all cursor-pointer"
              title="New Cash Book Entry"
            >
              <PlusCircle className="w-5 h-5 text-blue-700" />
            </button>

            <button
              type="button"
              onClick={handleClearRows}
              className="w-10 h-10 flex items-center justify-center border border-black bg-red-50 hover:bg-red-100 text-red-800 transition-all cursor-pointer"
              title="Clear Current Rows"
            >
              <XCircle className="w-5 h-5 text-red-700" />
            </button>

            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              className="w-10 h-10 flex items-center justify-center border border-black bg-sky-50 hover:bg-sky-100 text-sky-800 transition-all cursor-pointer"
              title="Search Past Cash Book Vouchers"
            >
              <Search className="w-5 h-5 text-blue-700" />
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="w-10 h-10 flex items-center justify-center border border-black bg-purple-50 hover:bg-purple-100 text-purple-800 transition-all cursor-pointer"
              title="Print Cash Book Voucher"
            >
              <Printer className="w-5 h-5 text-purple-700" />
            </button>

            <button
              type="button"
              onClick={handleConfirmVerify}
              className="w-10 h-10 flex items-center justify-center border border-black bg-teal-50 hover:bg-teal-100 text-teal-800 transition-all cursor-pointer"
              title="Verify Reconciled Cash & Denominations"
            >
              <CheckCircle2 className="w-5 h-5 text-teal-700" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 flex items-center justify-center border border-black bg-gray-100 hover:bg-gray-200 text-gray-800 transition-all cursor-pointer"
              title="Exit to Dashboard"
            >
              <Power className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Search Past Cash Book Records Modal */}
        <Modal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          title="Search Cash Book Records"
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            <SearchInput
              value={voucherFilter}
              onChange={setVoucherFilter}
              placeholder="Search by Cash Book No, Party, or Description..."
            />

            <div className="max-h-96 overflow-y-auto">
              <Table
                headers={['CB #', 'Date', 'Party / Account', 'Description', 'Debit (Out)', 'Credit (In)', 'Actions']}
                emptyText="No matching cash book entries."
              >
                {cashBookEntries
                  .filter(
                    (e) =>
                      !voucherFilter ||
                      (e.cashBookNo && e.cashBookNo.includes(voucherFilter)) ||
                      (e.partyName && e.partyName.toLowerCase().includes(voucherFilter.toLowerCase())) ||
                      (e.bankAccountName && e.bankAccountName.toLowerCase().includes(voucherFilter.toLowerCase())) ||
                      (e.description && e.description.toLowerCase().includes(voucherFilter.toLowerCase()))
                  )
                  .slice(0, 50)
                  .map((e) => (
                    <TR key={e.id}>
                      <TD mono className="font-bold text-black">
                        <div className="flex items-center gap-1.5">
                          <span>{e.cashBookNo ? `#${e.cashBookNo}` : e.refNo || '-'}</span>
                          {e.editCount > 0 && (
                            <span
                              className="px-1 py-0.2 bg-amber-100 text-amber-800 border border-amber-400 text-[9px] font-bold rounded-sm"
                              title={`Edited ${e.editCount} time(s). Last edited: ${e.updatedAt ? formatDate(e.updatedAt) : 'Recently'}`}
                            >
                              Edited
                            </span>
                          )}
                        </div>
                      </TD>
                      <TD>{formatDate(e.date)}</TD>
                      <TD className="font-semibold">{e.partyName || e.bankAccountName || '-'}</TD>
                      <TD className="text-gray-700">{e.description || '-'}</TD>
                      <TD mono right className="text-red-700 font-bold">
                        {e.debit ? fmt(e.debit) : '-'}
                      </TD>
                      <TD mono right className="text-emerald-800 font-bold">
                        {e.credit ? fmt(e.credit) : '-'}
                      </TD>
                      <TD>
                        {e.linkedTransactionId ? (
                          <div className="flex items-center justify-end">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 border border-gray-300 text-xs rounded cursor-not-allowed"
                              title="Created by another voucher (Purchase, Sale, Journal, Expense, Issue). Edit from the original voucher."
                            >
                              <Lock className="w-3 h-3 text-gray-500" />
                              <span className="text-[10px] font-medium">Edit from original voucher</span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingEntry(e);
                                setEditDate(e.date || getTodayStr());
                                setEditPartyId(e.partyId || '');
                                setEditBankId(e.bankAccountId || '');
                                setEditDescription(e.description || '');
                                setEditDebit(e.debit || 0);
                                setEditCredit(e.credit || 0);
                              }}
                              className="p-1 border border-black bg-white hover:bg-amber-50 text-amber-700 cursor-pointer"
                              title="Edit Manual Cash Entry"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingEntryId(e.id)}
                              className="p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                              title="Delete Manual Cash Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </TD>
                    </TR>
                  ))}
              </Table>
            </div>
          </div>
        </Modal>

        {/* Edit Manual Cash Book Entry Modal */}
        <Modal
          isOpen={!!editingEntry}
          onClose={() => setEditingEntry(null)}
          title={`Edit Cash Book Entry — ${editingEntry?.cashBookNo ? '#' + editingEntry.cashBookNo : editingEntry?.refNo || ''}`}
          maxWidth="max-w-md"
        >
          {editingEntry && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const partyObj = parties.find((p) => p.id === editPartyId);
                  const bankObj = bankAccounts.find((b) => b.id === editBankId);
                  await cashBookService.update(editingEntry.id, {
                    date: editDate,
                    partyId: editPartyId || null,
                    partyName: partyObj ? partyObj.name : null,
                    bankAccountId: editBankId || null,
                    bankAccountName: bankObj ? bankObj.name : null,
                    description: editDescription,
                    debit: Number(editDebit || 0),
                    credit: Number(editCredit || 0),
                  });
                  showToast('Cash Book entry updated and balances recalculated successfully!');
                  setEditingEntry(null);
                } catch (err) {
                  alert(err.message || 'Failed to update Cash Book entry');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full border border-black p-2 text-sm bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1">Party (Optional)</label>
                <select
                  value={editPartyId}
                  onChange={(e) => {
                    setEditPartyId(e.target.value);
                    if (e.target.value) setEditBankId('');
                  }}
                  className="w-full border border-black p-2 text-sm bg-white"
                >
                  <option value="">-- No Party --</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1">Bank (Optional)</label>
                <select
                  value={editBankId}
                  onChange={(e) => {
                    setEditBankId(e.target.value);
                    if (e.target.value) setEditPartyId('');
                  }}
                  className="w-full border border-black p-2 text-sm bg-white"
                >
                  <option value="">-- No Bank Account --</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1">Description / Particulars</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full border border-black p-2 text-sm bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-red-700 mb-1">Debit / Cash Out (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editDebit}
                    onChange={(e) => setEditDebit(e.target.value)}
                    className="w-full border border-black p-2 text-sm font-mono font-bold text-red-700 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">Credit / Cash In (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editCredit}
                    onChange={(e) => setEditCredit(e.target.value)}
                    className="w-full border border-black p-2 text-sm font-mono font-bold text-emerald-800 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-black">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-3 py-1.5 border border-black bg-white hover:bg-gray-100 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 border border-black bg-[#1a6b2e] hover:bg-[#155724] text-white text-xs font-bold"
                >
                  Update Entry
                </button>
              </div>
            </form>
          )}
        </Modal>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!deletingEntryId}
          title="Delete Cash Book Entry"
          message="This will reverse all its effects on parties, cash, bank and stock."
          confirmLabel="Delete Entry"
          onConfirm={async () => {
            try {
              await cashBookService.delete(deletingEntryId);
              showToast('Cash Book entry deleted and effects reversed!');
              setDeletingEntryId(null);
            } catch (err) {
              alert(err.message || 'Failed to delete entry');
              setDeletingEntryId(null);
            }
          }}
          onCancel={() => setDeletingEntryId(null)}
        />
      </div>
    </div>
  );
}
