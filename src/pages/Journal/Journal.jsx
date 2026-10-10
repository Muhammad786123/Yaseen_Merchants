import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
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
import { journalService } from '../../services/journalService.js';
import { safePrint } from '../../utils/printUtils.js';
import { fmt, formatDate, getTodayStr } from '../../utils/formatters.js';
import {
  Save,
  Plus,
  Trash2,
  Eye,
  Pencil,
  Printer,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  X,
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
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [deletingVoucher, setDeletingVoucher] = useState(null);

  // Bank accounts
  const bankAccounts = accounts.filter((a) => !a.name.toLowerCase().includes('cash'));

  // Load vouchers from db
  const reloadVouchers = async () => {
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
  };

  useEffect(() => {
    reloadVouchers();
  }, []);

  // Format voucher reference as JV-0001, JV-0002...
  const jvRef = editingVoucher
    ? editingVoucher.no
    : `JV-${String(voucherNo).padStart(4, '0')}`;

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
    setEditingVoucher(null);
    setDate(getTodayStr());
    setNarration('');
    setLines([createEmptyLine(0), createEmptyLine(1)]);
    reloadVouchers();
  };

  const handleStartEdit = (v) => {
    setEditingVoucher(v);
    setDate(v.date || getTodayStr());
    setNarration(v.narration || '');
    if (v.lines && v.lines.length >= 2) {
      setLines(
        v.lines.map((l, i) => ({
          id: `jv_line_${i}_${Date.now()}`,
          accountType: l.accountType || 'party',
          accountId: l.accountId || '',
          accountName: l.accountName || '',
          detail: l.detail || '',
          debit: l.debit || '',
          credit: l.credit || '',
        }))
      );
    } else {
      setLines([createEmptyLine(0), createEmptyLine(1)]);
    }
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Live totals
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && difference === 0;

  // Save / Update Journal Voucher
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

    try {
      if (editingVoucher) {
        await journalService.update(editingVoucher.id, {
          date,
          narration: narration.trim() || 'Journal Transaction',
          lines: validLines,
        });
        showToast(`Journal Voucher ${editingVoucher.no} updated successfully!`);
      } else {
        await journalService.add({
          no: jvRef,
          date,
          narration: narration.trim() || 'Journal Transaction',
          lines: validLines,
        });
        showToast(`Journal Voucher ${jvRef} posted successfully!`);
      }

      handleReset();
    } catch (err) {
      console.error('Error saving JV:', err);
      alert('Failed to save journal voucher: ' + (err.message || 'Unknown error'));
    }
  };

  // Delete Journal Voucher
  const handleConfirmDelete = async () => {
    if (!deletingVoucher) return;
    try {
      await journalService.delete(deletingVoucher.id);
      showToast(`Journal Voucher ${deletingVoucher.no} deleted and all effects reversed!`);
      setDeletingVoucher(null);
      if (editingVoucher?.id === deletingVoucher.id) {
        handleReset();
      } else {
        await reloadVouchers();
      }
    } catch (err) {
      console.error('Failed to delete JV:', err);
      alert('Failed to delete journal voucher: ' + (err.message || 'Unknown error'));
      setDeletingVoucher(null);
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
              onClick={safePrint}
            >
              Print
            </Button>
          </div>
        }
      />

      {/* ── Main Journal Voucher Entry Box ── */}
      <div className={`border-2 ${editingVoucher ? 'border-amber-600 ring-2 ring-amber-300' : 'border-black'} bg-white rounded-none p-4 shadow-none transition-all`}>
        {/* Editing Banner */}
        {editingVoucher && (
          <div className="mb-3 p-2.5 bg-amber-50 border-2 border-amber-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-700" />
              <div>
                <span className="font-bold text-amber-900 text-sm">
                  Editing Voucher: <span className="font-mono font-black">{editingVoucher.no}</span>
                </span>
                <span className="text-xs text-amber-800 ml-2">
                  (Changes will reverse previous postings and re-apply updated amounts automatically)
                </span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={X}
              onClick={handleReset}
            >
              Cancel Edit
            </Button>
          </div>
        )}

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
              className={`w-full bg-white border ${editingVoucher ? 'border-amber-600 bg-amber-50 text-amber-900 font-black' : 'border-black text-black'} px-2.5 py-1.5 font-mono font-bold text-xs outline-none`}
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

        {/* Multi-row Transaction Grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-base bg-white">
            <thead>
              <tr className="bg-[#DFDFDF] border-b-2 border-black text-black font-bold text-center">
                <th className="border border-black px-2.5 py-2.5 w-10 text-base font-bold">#</th>
                <th className="border border-black px-3.5 py-2.5 w-72 text-start text-base font-bold">Account (کھاتہ)</th>
                <th className="border border-black px-3.5 py-2.5 text-start text-base font-bold">Particulars / Detail (تفصیل)</th>
                <th className="border border-black px-3.5 py-2.5 w-40 text-left text-base font-bold" dir="ltr">Debit / بنام (Rs.)</th>
                <th className="border border-black px-3.5 py-2.5 w-40 text-left text-base font-bold" dir="ltr">Credit / جمع (Rs.)</th>
                <th className="border border-black px-2.5 py-2.5 w-12 text-center text-base font-bold">Del</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id} className="border-b border-black hover:bg-gray-50">
                  <td className="border border-black px-2 py-2 text-center font-bold text-gray-700 text-sm">
                    {idx + 1}
                  </td>

                  {/* Account Selector */}
                  <td className="border border-black p-1">
                    <select
                      value={line.accountId ? `${line.accountType}:${line.accountId}` : ''}
                      onChange={(e) => handleAccountSelect(idx, e.target.value)}
                      className="w-full border border-black p-1.5 text-xs bg-white font-semibold text-start outline-none"
                    >
                      <option value="">-- Choose Account (کھاتہ) --</option>

                      <optgroup label="Core System Accounts">
                        <option value="cash:cash">Cash in Hand (Physical Cash)</option>
                        <option value="mall:mall">Mall A/C (Goods / Inventory)</option>
                        <option value="capital:capital">Capital Account (سرمایہ)</option>
                      </optgroup>

                      <optgroup label="Bank Accounts">
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={`bank:${b.id}`}>
                            {b.name} ({b.code || 'Bank'})
                          </option>
                        ))}
                      </optgroup>

                      <optgroup label="Parties (کھاتہ دار / Customers & Suppliers)">
                        {parties.map((p) => (
                          <option key={p.id} value={`party:${p.id}`}>
                            {p.code ? `[${p.code}] ` : ''}{p.name} ({p.type})
                          </option>
                        ))}
                      </optgroup>

                      <optgroup label="Operating Expenses (اخراجات)">
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <option key={cat} value={`expense:${cat}`}>
                            Expense — {cat}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </td>

                  {/* Detail */}
                  <td className="border border-black p-1">
                    <input
                      type="text"
                      value={line.detail}
                      onChange={(e) => handleFieldChange(idx, 'detail', e.target.value)}
                      placeholder="Line narration / bill reference..."
                      className="w-full border border-gray-400 p-1.5 text-xs outline-none focus:border-black"
                    />
                  </td>

                  {/* Debit */}
                  <td className="border border-black p-1" dir="ltr">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={line.debit}
                      onChange={(e) => handleFieldChange(idx, 'debit', e.target.value)}
                      placeholder="0"
                      className="w-full border border-gray-400 p-1.5 text-xs font-mono font-bold text-left text-red-700 outline-none focus:border-black tabular-nums"
                    />
                  </td>

                  {/* Credit */}
                  <td className="border border-black p-1" dir="ltr">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={line.credit}
                      onChange={(e) => handleFieldChange(idx, 'credit', e.target.value)}
                      placeholder="0"
                      className="w-full border border-gray-400 p-1.5 text-xs font-mono font-bold text-left text-[#1a6b2e] outline-none focus:border-black tabular-nums"
                    />
                  </td>

                  {/* Delete Row Button */}
                  <td className="border border-black p-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      disabled={lines.length <= 2}
                      className="text-red-600 hover:text-red-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#DFDFDF] border-t-2 border-black font-bold">
                <td colSpan={3} className="border border-black px-3.5 py-2.5 text-end font-bold text-base">
                  Voucher Total (میزان):
                </td>
                <td className="border border-black px-3.5 py-2.5 font-mono font-bold text-left text-red-700 text-base tabular-nums" dir="ltr">
                  {fmt(totalDebit)}
                </td>
                <td className="border border-black px-3.5 py-2.5 font-mono font-bold text-left text-[#1a6b2e] text-base tabular-nums" dir="ltr">
                  {fmt(totalCredit)}
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F5E9] text-[#1B5E20] border border-black text-sm font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#1B5E20]" />
                <span>✓ Balanced: {fmt(totalDebit)}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFEB3B] text-black border border-black text-sm font-bold">
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
              {editingVoucher ? 'Update Voucher' : 'Post Journal Voucher'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Saved Journal Vouchers History Table ── */}
      <div className="border-2 border-black bg-white rounded-none p-4 shadow-none">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 mb-3 border-b-2 border-black">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by JV #, narration, or account..."
            className="w-full sm:w-96"
          />
          <div className="text-sm font-bold text-black">
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
                <div className="flex items-center gap-1.5">
                  <span>{v.no}</span>
                  {v.editCount > 0 && (
                    <span
                      className="px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-400 text-[10px] font-bold rounded-sm"
                      title={`Edited ${v.editCount} time(s). Last edited: ${v.updatedAt ? formatDate(v.updatedAt) : 'Recently'}`}
                    >
                      Edited
                    </span>
                  )}
                </div>
              </TD>
              <TD>
                <div>
                  <span>{formatDate(v.date)}</span>
                  {v.updatedAt && (
                    <div className="text-[10px] text-gray-500">
                      Rev: {formatDate(v.updatedAt)}
                    </div>
                  )}
                </div>
              </TD>
              <TD className="font-bold text-black">{v.narration}</TD>
              <TD className="text-sm text-gray-800">
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
                    className="p-1 border border-black bg-white hover:bg-gray-100 text-gray-800 cursor-pointer"
                    title="View Voucher Slip"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(v)}
                    className="p-1 border border-black bg-white hover:bg-amber-50 text-amber-700 cursor-pointer"
                    title="Edit Voucher"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewingVoucher(v);
                      setTimeout(() => safePrint(), 100);
                    }}
                    className="p-1 border border-black bg-white hover:bg-blue-50 text-blue-700 cursor-pointer"
                    title="Print Slip"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingVoucher(v)}
                    className="p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                    title="Delete Voucher"
                  >
                    <Trash2 className="w-4 h-4" />
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
        maxWidth="max-w-[96vw]"
        isPrintPreview={true}
      >
        {viewingVoucher && (
          <div className="space-y-4">
            <div className="report-rtl print-area bg-white p-4 border border-black space-y-4 text-base font-sans" dir="rtl">
              <div className="flex justify-between items-center border-b-2 border-black pb-2 bg-[#EBE9ED] p-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-black">واؤچر نمبر: </span>
                  <span className="font-mono font-black text-black" dir="ltr">{viewingVoucher.no}</span>
                  {viewingVoucher.editCount > 0 && (
                    <span className="ms-2 text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-400 font-bold">
                      Edited ({viewingVoucher.editCount})
                    </span>
                  )}
                  <span className="font-bold text-black ms-4">تاریخ: </span>
                  <span className="font-bold text-black" dir="ltr">{formatDate(viewingVoucher.date)}</span>
                </div>
                <div>
                  <span className="font-bold text-black">رقم کل: </span>
                  <span className="font-mono font-black text-[#1a6b2e]" dir="ltr">{fmt(viewingVoucher.totalAmount)}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-black">تفصیل / Narration: </span>
                <span className="font-semibold text-gray-900">{viewingVoucher.narration || '-'}</span>
              </div>

              <table className="w-full border-collapse border border-black text-base" dir="rtl" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-[#DFDFDF] border-b-2 border-black text-black font-bold text-center">
                    <th className="border border-black px-3 py-2.5 text-start text-base font-bold">کھاتہ (Account)</th>
                    <th className="border border-black px-3 py-2.5 text-start text-base font-bold">تفصیل (Particulars)</th>
                    <th className="border border-black px-3 py-2.5 text-left w-36 text-base font-bold" dir="ltr">Debit (بنام)</th>
                    <th className="border border-black px-3 py-2.5 text-left w-36 text-base font-bold" dir="ltr">Credit (جمع)</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingVoucher.lines?.map((l, i) => (
                    <tr key={i} className="border-b border-black">
                      <td className="border border-black px-3 py-2.5 font-bold text-black text-start">{l.accountName}</td>
                      <td className="border border-black px-3 py-2.5 text-gray-800 text-start">{l.detail || '-'}</td>
                      <td className="border border-black px-3 py-2.5 font-mono font-bold text-left text-red-700 tabular-nums" dir="ltr">
                        {l.debit ? fmt(l.debit) : '-'}
                      </td>
                      <td className="border border-black px-3 py-2.5 font-mono font-bold text-left text-[#1a6b2e] tabular-nums" dir="ltr">
                        {l.credit ? fmt(l.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#DFDFDF] font-bold">
                    <td colSpan={2} className="border border-black px-3 py-2.5 text-end font-black text-base">ٹوٹل (Total)</td>
                    <td className="border border-black px-3 py-2.5 font-mono font-black text-left text-red-700 text-[17px] tabular-nums" dir="ltr">
                      {fmt(viewingVoucher.totalAmount)}
                    </td>
                    <td className="border border-black px-3 py-2.5 font-mono font-black text-left text-[#1a6b2e] text-[17px] tabular-nums" dir="ltr">
                      {fmt(viewingVoucher.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-black no-print" dir="ltr">
              <Button variant="primary" icon={Printer} onClick={safePrint}>
                Print Voucher Slip
              </Button>
              <Button variant="secondary" onClick={() => setViewingVoucher(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingVoucher}
        title="Delete Journal Voucher"
        message="This will reverse all its effects on parties, cash, bank and stock."
        confirmLabel="Delete Voucher"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingVoucher(null)}
      />
    </div>
  );
}
