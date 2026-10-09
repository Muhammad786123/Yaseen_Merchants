import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import Modal from '../../components/ui/Modal.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import DatePicker from '../../components/ui/DatePicker.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import { useParties } from '../../hooks/useParties.js';
import { useFinances } from '../../hooks/useFinances.js';
import { useApp } from '../../context/AppContext.jsx';
import { db } from '../../db/database.js';
import { cashBookService } from '../../services/cashBookService.js';
import { capitalService } from '../../services/capitalService.js';
import { fmt, formatDate, getTodayStr } from '../../utils/formatters.js';
import {
  Save,
  Plus,
  Trash2,
  Eye,
  Printer,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'Factory Rent',
  'Electricity & Utilities',
  'Freight & Carriage',
  'Salaries & Wages',
  'Repairs & Maintenance',
  'Office Stationery',
  'Entertainment & Tea',
  'Miscellaneous Expense',
];

const createEmptyLine = (idx) => ({
  id: `jv_line_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
  accountType: 'party', // 'party' | 'bank' | 'cash' | 'mall' | 'capital' | 'expense'
  accountId: '',
  accountName: '',
  detail: '',
  debit: '',
  credit: '',
});

export default function Journal() {
  const navigate = useNavigate();
  const { parties } = useParties();
  const { accounts } = useFinances();
  const { showToast } = useApp();

  const [voucherNo, setVoucherNo] = useState(1);
  const [date, setDate] = useState(getTodayStr());
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState(() => [
    createEmptyLine(0),
    createEmptyLine(1),
  ]);

  const [savedVouchers, setSavedVouchers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingVoucher, setViewingVoucher] = useState(null);

  // Bank accounts
  const bankAccounts = accounts.filter((a) => !a.name.toLowerCase().includes('cash'));

  // Load next voucher number from db
  useEffect(() => {
    async function loadVouchers() {
      try {
        if (!db.journalEntries) return;
        const all = await db.journalEntries.toArray();
        setSavedVouchers(all.reverse());
        const maxNo = all.reduce((max, v) => {
          const num = parseInt(String(v.no).replace(/\D/g, ''), 10);
          return !isNaN(num) && num > max ? num : max;
        }, 0);
        setVoucherNo(maxNo > 0 ? maxNo + 1 : 1);
      } catch (err) {
        console.error('Failed to load journal vouchers:', err);
      }
    }
    loadVouchers();
  }, []);

  // Format voucher reference as JV-0001, JV-0002...
  const jvRef = `JV-${String(voucherNo).padStart(4, '0')}`;

  // Account selection change
  const handleAccountSelect = (index, value) => {
    setLines((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };

      if (!value) {
        target.accountId = '';
        target.accountName = '';
        target.accountType = '';
        updated[index] = target;
        return updated;
      }

      const [type, id] = value.split(':');
      target.accountType = type;
      target.accountId = id;

      if (type === 'party') {
        const party = parties.find((p) => p.id === id);
        target.accountName = party ? `${party.code || party.id} - ${party.name}` : id;
      } else if (type === 'bank') {
        const bank = bankAccounts.find((b) => b.id === id);
        target.accountName = bank ? `${bank.name} (${bank.code || 'Bank'})` : id;
      } else if (type === 'cash') {
        target.accountName = 'Cash in Hand (Physical Cash)';
      } else if (type === 'mall') {
        target.accountName = 'Mall A/C (Goods / Raw Material Inventory)';
      } else if (type === 'capital') {
        target.accountName = 'Capital Account';
      } else if (type === 'expense') {
        target.accountName = `Expense — ${id}`;
      }

      updated[index] = target;
      return updated;
    });
  };

  const handleFieldChange = (index, field, val) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleAddLine = () => {
    setLines((prev) => [...prev, createEmptyLine(prev.length)]);
  };

  const handleRemoveLine = (idx) => {
    if (lines.length <= 2) {
      alert('A journal voucher requires at least two lines.');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleReset = () => {
    setDate(getTodayStr());
    setNarration('');
    setLines([createEmptyLine(0), createEmptyLine(1)]);
  };

  // Live totals
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && difference === 0;

  // Save Journal Voucher
  const handleSave = async () => {
    const validLines = lines.filter(
      (l) => l.accountName && (Number(l.debit) > 0 || Number(l.credit) > 0)
    );

    if (validLines.length < 2) {
      alert('Please enter at least two valid lines with an account and amount.');
      return;
    }

    if (!isBalanced) {
      alert(
        `Journal entry is out of balance!\nTotal Debit: ${fmt(totalDebit)}\nTotal Credit: ${fmt(totalCredit)}\nDifference: ${fmt(difference)}\nDebit must equal Credit before saving.`
      );
      return;
    }

    const newEntry = {
      id: 'jv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      no: jvRef,
      refNo: jvRef,
      date,
      narration: narration.trim() || 'Journal Transaction',
      totalAmount: totalDebit,
      lines: validLines.map((l) => ({
        accountType: l.accountType,
        accountId: l.accountId,
        accountName: l.accountName,
        detail: l.detail,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      })),
      createdAt: new Date().toISOString(),
    };

    try {
      await db.transaction(
        'rw',
        [db.journalEntries, db.parties, db.accounts, db.cashBookEntries, db.capitalEntries],
        async () => {
          await db.journalEntries.add(newEntry);

          // Post updates to accounts/parties
          for (const line of validLines) {
            const deb = Number(line.debit) || 0;
            const cred = Number(line.credit) || 0;

            if (line.accountType === 'party') {
              const party = await db.parties.get(line.accountId);
              if (party) {
                const currentBal = Number(party.balance || 0);
                // App convention: party.balance > 0 = payable (we owe), < 0 = receivable.
                // Credit increases what we owe; Debit reduces it or creates a receivable.
                await db.parties.update(party.id, { balance: currentBal - deb + cred });
              }
            } else if (line.accountType === 'capital') {
              // Capital: Credit -> capitalService.addEntry({ type: 'Add', amount: cred, date, description: 'JV ' + jvRef }); Debit -> type: 'Withdraw'
              if (cred > 0) {
                await capitalService.addEntry({
                  type: 'Add',
                  amount: cred,
                  date,
                  description: `JV ${jvRef}${line.detail ? ' - ' + line.detail : ''}`,
                });
              }
              if (deb > 0) {
                await capitalService.addEntry({
                  type: 'Withdraw',
                  amount: deb,
                  date,
                  description: `JV ${jvRef}${line.detail ? ' - ' + line.detail : ''}`,
                });
              }
            } else if (line.accountType === 'cash') {
              // Cash: a Debit to Cash means cash received, which is Cash Book Credit/Jamma;
              // a Credit to Cash is Cash Book Debit/Benaam.
              // Post through existing cashBookService.addEntry so it appears in the Cash Book
              // and the balance changes exactly once.
              await cashBookService.addEntry({
                date,
                type: 'Journal',
                debit: cred,
                credit: deb,
                description: `JV ${jvRef}${line.detail ? ' - ' + line.detail : (narration ? ' - ' + narration : '')}`,
                linkedTransactionId: newEntry.id,
              });
            } else if (line.accountType === 'bank') {
              // Bank: unchanged (Debit increases the bank balance)
              const bank = (await db.accounts.get(line.accountId)) || (await db.accounts.where({ name: line.accountName }).first());
              if (bank) {
                const currentBal = Number(bank.balance || 0);
                await db.accounts.update(bank.id, { balance: currentBal + deb - cred });
              }
            }
            // Mall A/C and Expense lines: stored in journalEntries; included in Mall A/C balance dynamically.
          }
        }
      );

      showToast(`Journal Voucher ${jvRef} posted successfully!`);
      setVoucherNo((prev) => prev + 1);
      setSavedVouchers((prev) => [newEntry, ...prev]);
      handleReset();
    } catch (err) {
      console.error('Error saving JV:', err);
      alert('Failed to save journal voucher. Please check console for details.');
    }
  };

  const filteredVouchers = savedVouchers.filter((v) => {
    if (!searchTerm) return true;
    const st = searchTerm.toLowerCase();
    return (
      v.no?.toLowerCase().includes(st) ||
      v.narration?.toLowerCase().includes(st) ||
      v.lines?.some((l) => l.accountName?.toLowerCase().includes(st))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal Voucher"
        subtitle="Unrestricted double-entry voucher across Party, Cash, Bank, Mall A/C, Capital & Expenses — posts directly to Statement of Account"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={RotateCcw}
              onClick={handleReset}
            >
              New Voucher
            </Button>
            <Button
              variant="outline"
              icon={Printer}
              onClick={() => window.print()}
            >
              Print
            </Button>
          </div>
        }
      />

      {/* ── Main Journal Voucher Entry Box (Classic PERBALACC Bordered Style) ── */}
      <div className="border-2 border-black bg-white rounded-none p-4 shadow-none">
        {/* Top Info Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pb-3 mb-3 border-b-2 border-black bg-[#EBE9ED] p-3">
          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-gray-900 mb-1">
              Voucher No (بل)
            </label>
            <input
              type="text"
              readOnly
              value={jvRef}
              className="w-full bg-white border border-black px-2.5 py-1.5 font-mono font-bold text-black text-xs outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <DatePicker
              label="Voucher Date (تاریخ)"
              value={date}
              onChange={setDate}
              required
            />
          </div>

          <div className="sm:col-span-6">
            <Input
              label="Overall Narration / Reference (تفصیل)"
              value={narration}
              onChange={setNarration}
              placeholder="e.g. Month-end party adjustment, capital injection, expense transfer..."
            />
          </div>
        </div>

        {/* Multi-row Transaction Grid (Exact Classic Bordered Table) */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-xs bg-white">
            <thead>
              <tr className="bg-[#DFDFDF] border-b-2 border-black text-black font-bold text-center">
                <th className="border border-black px-2 py-2 w-10">#</th>
                <th className="border border-black px-3 py-2 w-72 text-left">Account (کھاتہ)</th>
                <th className="border border-black px-3 py-2 text-left">Particulars / Detail (تفصیل)</th>
                <th className="border border-black px-3 py-2 w-36 text-right">Debit / بنام (Rs.)</th>
                <th className="border border-black px-3 py-2 w-36 text-right">Credit / جمع (Rs.)</th>
                <th className="border border-black px-2 py-2 w-12 text-center">Del</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id} className="hover:bg-gray-50 border-b border-black">
                  <td className="border border-black px-2 py-1 text-center font-mono font-bold text-gray-700">
                    {idx + 1}
                  </td>

                  {/* Account Selector */}
                  <td className="border border-black p-0">
                    <select
                      value={line.accountId ? `${line.accountType}:${line.accountId}` : ''}
                      onChange={(e) => handleAccountSelect(idx, e.target.value)}
                      className="w-full px-2 py-1.5 text-xs outline-none bg-transparent font-bold text-black"
                    >
                      <option value="">-- Select Account --</option>
                      <optgroup label="Parties (Suppliers / Customers)">
                        {parties.map((p) => (
                          <option key={`party:${p.id}`} value={`party:${p.id}`}>
                            {p.code || p.id} - {p.name} ({p.type})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Bank Accounts">
                        {bankAccounts.map((b) => (
                          <option key={`bank:${b.id}`} value={`bank:${b.id}`}>
                            {b.code || b.id} - {b.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Cash & Trading Accounts">
                        <option value="cash:cash">Cash in Hand (Physical Cash)</option>
                        <option value="mall:mall">Mall A/C (Goods / Inventory)</option>
                        <option value="capital:capital">Capital Account</option>
                      </optgroup>
                      <optgroup label="Expense Heads">
                        {EXPENSE_CATEGORIES.map((exp) => (
                          <option key={`expense:${exp}`} value={`expense:${exp}`}>
                            {exp}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </td>

                  {/* Particulars */}
                  <td className="border border-black p-0">
                    <input
                      type="text"
                      value={line.detail}
                      onChange={(e) => handleFieldChange(idx, 'detail', e.target.value)}
                      placeholder="Transaction details for this line..."
                      className="w-full px-2 py-1.5 text-xs outline-none bg-transparent text-gray-900"
                    />
                  </td>

                  {/* Debit */}
                  <td className="border border-black p-0">
                    <input
                      type="number"
                      min="0"
                      value={line.debit}
                      onChange={(e) => handleFieldChange(idx, 'debit', e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 text-xs font-mono font-bold text-right outline-none bg-transparent text-red-700"
                    />
                  </td>

                  {/* Credit */}
                  <td className="border border-black p-0">
                    <input
                      type="number"
                      min="0"
                      value={line.credit}
                      onChange={(e) => handleFieldChange(idx, 'credit', e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1.5 text-xs font-mono font-bold text-right outline-none bg-transparent text-[#1a6b2e]"
                    />
                  </td>

                  {/* Delete button */}
                  <td className="border border-black p-0 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      disabled={lines.length <= 2}
                      className="p-1 text-red-600 hover:text-red-900 disabled:opacity-30 cursor-pointer"
                      title="Delete line"
                    >
                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* Total Row */}
              <tr className="bg-[#DFDFDF] font-bold">
                <td colSpan={3} className="border border-black px-3 py-2 text-right uppercase text-black font-black">
                  Total (میزان)
                </td>
                <td className="border border-black px-3 py-2 text-right font-mono text-red-800 text-sm font-black">
                  {totalDebit ? totalDebit.toLocaleString('en-PK') : '0'}
                </td>
                <td className="border border-black px-3 py-2 text-right font-mono text-[#1a6b2e] text-sm font-black">
                  {totalCredit ? totalCredit.toLocaleString('en-PK') : '0'}
                </td>
                <td className="border border-black"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer Controls & Balance Verification */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black">
          <Button
            variant="secondary"
            size="sm"
            icon={Plus}
            onClick={handleAddLine}
          >
            Add Another Row
          </Button>

          {/* Balance Check Indicator */}
          <div className="flex items-center gap-3">
            {isBalanced ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F5E9] text-[#1B5E20] border border-black text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#1B5E20]" />
                <span>✓ Balanced: {fmt(totalDebit)}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFEB3B] text-black border border-black text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-red-700" />
                <span>
                  Difference: {fmt(difference)} (Debit must equal Credit)
                </span>
              </span>
            )}

            <Button
              variant="primary"
              icon={Save}
              onClick={handleSave}
              disabled={!isBalanced}
            >
              Post Journal Voucher
            </Button>
          </div>
        </div>
      </div>

      {/* ── Recorded Journal Vouchers History (PERBALACC Classic Table) ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#EBE9ED] p-2.5 border-2 border-black">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search journal vouchers by JV #, narration, or account..."
            className="w-full sm:w-96"
          />
          <div className="text-xs font-bold text-black">
            Total Recorded JVs: <span className="font-mono font-black">{savedVouchers.length}</span>
          </div>
        </div>

        <Table
          headers={['JV # (بل)', 'Date (تاریخ)', 'Narration (تفصیل)', 'Accounts Involved', 'Voucher Amount', 'Actions']}
          emptyText="No journal vouchers recorded yet. Use the form above to post entries."
        >
          {filteredVouchers.map((v) => (
            <TR key={v.id}>
              <TD mono className="font-bold text-black">
                {v.no}
              </TD>
              <TD>{formatDate(v.date)}</TD>
              <TD className="font-bold text-black">{v.narration}</TD>
              <TD className="text-xs text-gray-800">
                {v.lines?.map((l) => l.accountName).filter(Boolean).slice(0, 3).join(', ')}
                {v.lines?.length > 3 ? ` +${v.lines.length - 3} more` : ''}
              </TD>
              <TD mono right className="font-bold text-black">
                {fmt(v.totalAmount)}
              </TD>
              <TD>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewingVoucher(v)}
                    className="p-1 border border-black bg-white hover:bg-gray-100 text-gray-800"
                    title="View Voucher Slip"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </TD>
            </TR>
          ))}
        </Table>
      </div>

      {/* Voucher Detail & Print Slip Modal */}
      <Modal
        isOpen={!!viewingVoucher}
        onClose={() => setViewingVoucher(null)}
        title={`Journal Voucher — ${viewingVoucher?.no || ''}`}
        maxWidth="max-w-2xl"
      >
        {viewingVoucher && (
          <div className="space-y-4 text-xs font-sans">
            <div className="flex justify-between border-b-2 border-black pb-2 bg-[#EBE9ED] p-2">
              <div>
                <span className="font-bold text-black">Voucher No: </span>
                <span className="font-mono font-black text-black">{viewingVoucher.no}</span>
              </div>
              <div>
                <span className="font-bold text-black">Date: </span>
                <span className="font-bold text-black">{formatDate(viewingVoucher.date)}</span>
              </div>
              <div>
                <span className="font-bold text-black">Amount: </span>
                <span className="font-mono font-black text-[#1a6b2e]">{fmt(viewingVoucher.totalAmount)}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-black">Narration / Particulars: </span>
              <span className="font-semibold text-gray-900">{viewingVoucher.narration || '-'}</span>
            </div>

            <table className="w-full border-collapse border border-black">
              <thead>
                <tr className="bg-[#DFDFDF] border-b-2 border-black text-black font-bold text-center">
                  <th className="border border-black p-1.5 text-left">Account</th>
                  <th className="border border-black p-1.5 text-left">Particulars</th>
                  <th className="border border-black p-1.5 text-right w-28">Debit (بنام)</th>
                  <th className="border border-black p-1.5 text-right w-28">Credit (جمع)</th>
                </tr>
              </thead>
              <tbody>
                {viewingVoucher.lines?.map((l, i) => (
                  <tr key={i} className="border-b border-black">
                    <td className="border border-black p-1.5 font-bold text-black">{l.accountName}</td>
                    <td className="border border-black p-1.5 text-gray-800">{l.detail || '-'}</td>
                    <td className="border border-black p-1.5 font-mono font-bold text-right text-red-700">
                      {l.debit ? fmt(l.debit) : '-'}
                    </td>
                    <td className="border border-black p-1.5 font-mono font-bold text-right text-[#1a6b2e]">
                      {l.credit ? fmt(l.credit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#DFDFDF] font-bold">
                  <td colSpan={2} className="border border-black p-1.5 text-right font-black">Total</td>
                  <td className="border border-black p-1.5 font-mono font-black text-right text-red-700">
                    {fmt(viewingVoucher.totalAmount)}
                  </td>
                  <td className="border border-black p-1.5 font-mono font-black text-right text-[#1a6b2e]">
                    {fmt(viewingVoucher.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="flex justify-end gap-2 pt-2 border-t border-black">
              <Button variant="secondary" onClick={() => setViewingVoucher(null)}>
                Close
              </Button>
              <Button variant="primary" icon={Printer} onClick={() => window.print()}>
                Print Voucher Slip
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
