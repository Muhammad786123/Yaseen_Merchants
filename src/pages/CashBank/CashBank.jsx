import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import PrintDocument from '../../components/common/PrintDocument.jsx';
import { useFinances } from '../../hooks/useFinances.js';
import { useCashBook } from '../../hooks/useCashBook.js';
import { useApp } from '../../context/AppContext.jsx';
import { fmt, formatDate, getTodayStr } from '../../utils/formatters.js';
import { bankTransferService } from '../../services/bankTransferService.js';
import { capitalService } from '../../services/capitalService.js';
import { accountService } from '../../services/accountService.js';
import { getAccountUsageCount } from '../../utils/masterUsageChecker.js';
import {
  Wallet,
  Landmark,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Coins,
  Building2,
} from 'lucide-react';

export default function CashBank() {
  const { accounts, receipts, payments, expenses, updateAccount } = useFinances();
  const { bankTransfers, cashBookEntries } = useCashBook();
  const { showToast } = useApp();

  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' | 'transfers' | 'capital'

  // Accounts state
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deletingAccountId, setDeletingAccountId] = useState(null);
  const [accountName, setAccountName] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [accountOpeningBalance, setAccountOpeningBalance] = useState(0);
  const [selectedAccountForLedger, setSelectedAccountForLedger] = useState(null);

  // Transfers state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [viewingTransfer, setViewingTransfer] = useState(null);
  const [deletingTransferId, setDeletingTransferId] = useState(null);
  const [transferDate, setTransferDate] = useState(getTodayStr());
  const [transferType, setTransferType] = useState('Deposit'); // 'Deposit' | 'Withdrawal'
  const [transferBankId, setTransferBankId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [transferDescription, setTransferDescription] = useState('');

  // Capital state
  const [capitalEntries, setCapitalEntries] = useState([]);
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
  const [editingCapital, setEditingCapital] = useState(null);
  const [viewingCapital, setViewingCapital] = useState(null);
  const [deletingCapitalId, setDeletingCapitalId] = useState(null);
  const [capitalDate, setCapitalDate] = useState(getTodayStr());
  const [capitalType, setCapitalType] = useState('Add'); // 'Add' | 'Withdraw'
  const [capitalAmount, setCapitalAmount] = useState(0);
  const [capitalDescription, setCapitalDescription] = useState('');

  // Bank accounts list (excluding Cash)
  const bankAccounts = accounts.filter((a) => !a.name.toLowerCase().includes('cash'));
  const totalLiquidity = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  // Load capital entries
  const reloadCapital = async () => {
    try {
      const all = await capitalService.getAll();
      setCapitalEntries(all);
    } catch (err) {
      console.error('Failed to load capital entries:', err);
    }
  };

  React.useEffect(() => {
    reloadCapital();
  }, []);

  // ── Account Handlers ─────────────────────────
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!accountName) return;

    try {
      if (editingAccount) {
        await accountService.update(editingAccount.id, {
          name: accountName,
          code: accountCode,
          openingBalance: Number(accountOpeningBalance || 0),
        });
        showToast(`Account "${accountName}" updated and balance recalculated!`);
        setEditingAccount(null);
      } else {
        await accountService.add({
          name: accountName,
          code: accountCode,
          openingBalance: Number(accountOpeningBalance || 0),
        });
        showToast('New bank account created successfully!');
        setIsAddAccountModalOpen(false);
      }
      setAccountName('');
      setAccountCode('');
      setAccountOpeningBalance(0);
    } catch (err) {
      alert(err.message || 'Error saving account');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccountId) return;
    try {
      await accountService.delete(deletingAccountId);
      showToast('Account deleted successfully!');
      setDeletingAccountId(null);
    } catch (err) {
      alert(err.message || 'Cannot delete account');
      setDeletingAccountId(null);
    }
  };

  // ── Transfer Handlers ────────────────────────
  const handleSaveTransfer = async (e) => {
    e.preventDefault();
    if (!transferBankId || Number(transferAmount) <= 0) {
      alert('Please select a bank account and enter a valid transfer amount.');
      return;
    }
    const bankObj = accounts.find((a) => a.id === transferBankId);
    if (!bankObj) return;

    try {
      if (editingTransfer) {
        await bankTransferService.update(editingTransfer.id, {
          date: transferDate,
          type: transferType,
          bankAccountId: bankObj.id,
          bankAccountName: bankObj.name,
          amount: Number(transferAmount),
          description: transferDescription,
        });
        showToast(`Bank Transfer ${editingTransfer.no} updated successfully!`);
        setEditingTransfer(null);
      } else {
        await bankTransferService.add({
          date: transferDate,
          type: transferType,
          bankAccountId: bankObj.id,
          bankAccountName: bankObj.name,
          amount: Number(transferAmount),
          description: transferDescription,
        });
        showToast(`Bank Transfer (${transferType}) recorded successfully!`);
        setIsTransferModalOpen(false);
      }
      setTransferAmount(0);
      setTransferDescription('');
    } catch (err) {
      alert(err.message || 'Error recording bank transfer');
    }
  };

  const handleDeleteTransfer = async () => {
    if (!deletingTransferId) return;
    try {
      await bankTransferService.delete(deletingTransferId);
      showToast('Bank transfer deleted and balances reversed!');
      setDeletingTransferId(null);
    } catch (err) {
      alert(err.message || 'Error deleting transfer');
      setDeletingTransferId(null);
    }
  };

  // ── Capital Handlers ─────────────────────────
  const handleSaveCapital = async (e) => {
    e.preventDefault();
    if (Number(capitalAmount) <= 0) {
      alert('Please enter a valid capital amount.');
      return;
    }

    try {
      if (editingCapital) {
        await capitalService.update(editingCapital.id, {
          date: capitalDate,
          type: capitalType,
          amount: Number(capitalAmount),
          description: capitalDescription,
        });
        showToast('Capital entry updated successfully!');
        setEditingCapital(null);
      } else {
        await capitalService.addEntry({
          date: capitalDate,
          type: capitalType,
          amount: Number(capitalAmount),
          description: capitalDescription,
        });
        showToast('Capital entry recorded successfully!');
        setIsCapitalModalOpen(false);
      }
      setCapitalAmount(0);
      setCapitalDescription('');
      await reloadCapital();
    } catch (err) {
      alert(err.message || 'Error saving capital entry');
    }
  };

  const handleDeleteCapital = async () => {
    if (!deletingCapitalId) return;
    try {
      await capitalService.delete(deletingCapitalId);
      showToast('Capital entry deleted!');
      setDeletingCapitalId(null);
      await reloadCapital();
    } catch (err) {
      alert(err.message || 'Error deleting capital entry');
      setDeletingCapitalId(null);
    }
  };

  // Helper to generate chronological Bank ledger for a selected bank account
  const getBankLedgerRows = (accName) => {
    if (!accName) return [];
    const rows = [];

    // Bank Receipts
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

    // Bank Payments
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
      if (cb.bankAccountName === accName || cb.bankAccountId === selectedAccountForLedger?.id) {
        if (cb.type === 'Deposit') {
          rows.push({
            date: cb.date,
            refNo: cb.refNo || 'CB-DEP',
            type: 'Cash Deposit',
            description: cb.description || 'Cash deposited from Cash Book',
            received: Number(cb.debit || 0),
            paid: 0,
          });
        } else if (cb.type === 'Withdrawal') {
          rows.push({
            date: cb.date,
            refNo: cb.refNo || 'CB-WTH',
            type: 'Cash Withdrawal',
            description: cb.description || 'Cash withdrawn to Cash Book',
            received: 0,
            paid: Number(cb.credit || 0),
          });
        }
      }
    });

    rows.sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = Number(selectedAccountForLedger?.openingBalance || 0);
    return rows.map((r) => {
      running = running + r.received - r.paid;
      return { ...r, balance: running };
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash, Banking & Capital Management"
        subtitle="Manage commercial bank balances, cash liquidity, bank deposits/withdrawals, and equity capital entries"
        actions={
          <div className="flex flex-wrap items-center gap-2 no-print">
            {activeTab === 'accounts' && (
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setEditingAccount(null);
                  setAccountName('');
                  setAccountCode(String(99101 + bankAccounts.length));
                  setAccountOpeningBalance(0);
                  setIsAddAccountModalOpen(true);
                }}
              >
                + Add Bank Account
              </Button>
            )}
            {activeTab === 'transfers' && (
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setEditingTransfer(null);
                  setTransferDate(getTodayStr());
                  setTransferType('Deposit');
                  setTransferBankId(bankAccounts[0]?.id || '');
                  setTransferAmount(0);
                  setTransferDescription('');
                  setIsTransferModalOpen(true);
                }}
              >
                + New Transfer (Deposit / Withdraw)
              </Button>
            )}
            {activeTab === 'capital' && (
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setEditingCapital(null);
                  setCapitalDate(getTodayStr());
                  setCapitalType('Add');
                  setCapitalAmount(0);
                  setCapitalDescription('');
                  setIsCapitalModalOpen(true);
                }}
              >
                + Add Capital Entry
              </Button>
            )}
          </div>
        }
      />

      {/* Liquidity Banner */}
      <div className="bg-[#1E3A5F] text-white p-6 rounded-none border-2 border-black flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-white/70">
            Total Net Liquid Cash & Bank Position
          </div>
          <div className="text-3xl font-black font-mono mt-1 text-white">{fmt(totalLiquidity)}</div>
        </div>
        <div className="w-12 h-12 bg-[#C97B2E] border border-white flex items-center justify-center text-white shrink-0">
          <Landmark className="w-6 h-6" />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b-2 border-black no-print">
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`px-5 py-2.5 font-bold text-sm border-t-2 border-l-2 border-r-2 -mb-[2px] transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'accounts'
              ? 'border-black bg-white text-black font-black'
              : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-700" />
          <span>Accounts & Commercial Banks ({accounts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transfers')}
          className={`px-5 py-2.5 font-bold text-sm border-t-2 border-l-2 border-r-2 -mb-[2px] transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'transfers'
              ? 'border-black bg-white text-black font-black'
              : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 text-emerald-700" />
          <span>Bank Transfers (Deposits &amp; Withdrawals) ({bankTransfers.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('capital')}
          className={`px-5 py-2.5 font-bold text-sm border-t-2 border-l-2 border-r-2 -mb-[2px] transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'capital'
              ? 'border-black bg-white text-black font-black'
              : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Coins className="w-4 h-4 text-amber-700" />
          <span>Capital &amp; Equity Accounts ({capitalEntries.length})</span>
        </button>
      </div>

      {/* ── TAB 1: ACCOUNTS & MASTER BANKS ────────────────────── */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map((acc) => {
              const isCash = acc.name.toLowerCase().includes('cash');
              return (
                <Card key={acc.id} className="relative overflow-hidden border-2 border-black p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      {isCash ? 'Physical Cash' : `Bank (${acc.code || '99101'})`}
                    </span>
                    <div className="w-7 h-7 bg-gray-100 border border-black flex items-center justify-center text-[#1E3A5F]">
                      {isCash ? <Wallet className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-black mb-1">{acc.name}</h3>
                  <div className="text-xl font-black font-mono text-emerald-800 mb-1">{fmt(acc.balance)}</div>
                  <div className="text-xs text-gray-500 mb-3">
                    Opening: <span className="font-mono font-bold text-gray-800">{fmt(acc.openingBalance || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-300 no-print">
                    <button
                      type="button"
                      onClick={() => setSelectedAccountForLedger(acc)}
                      className="text-xs font-bold text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ledger
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAccount(acc);
                          setAccountName(acc.name);
                          setAccountCode(acc.code || '');
                          setAccountOpeningBalance(acc.openingBalance || 0);
                        }}
                        className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-amber-50 text-amber-700 cursor-pointer"
                        title="Edit Account / Opening Balance"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {!isCash && (
                        <button
                          type="button"
                          onClick={async () => {
                            const count = await getAccountUsageCount(acc.id, acc.name);
                            if (count > 0) {
                              alert(`This record is used in ${count} transactions. Delete or edit those first`);
                              return;
                            }
                            setDeletingAccountId(acc.id);
                          }}
                          className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                          title="Delete Bank Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Table
            headers={['Account Code', 'Account Name', 'Type', 'Opening Balance', 'Current Balance', 'Actions']}
            emptyText="No accounts registered."
          >
            {accounts.map((acc) => {
              const isCash = acc.name.toLowerCase().includes('cash');
              return (
                <TR key={acc.id}>
                  <TD mono className="font-bold text-black">{acc.code || '-'}</TD>
                  <TD className="font-bold text-black">{acc.name}</TD>
                  <TD>
                    <Badge variant={isCash ? 'green' : 'blue'}>{isCash ? 'Physical Cash' : 'Commercial Bank'}</Badge>
                  </TD>
                  <TD mono right>{fmt(acc.openingBalance || 0)}</TD>
                  <TD mono right className="font-bold text-emerald-800">{fmt(acc.balance)}</TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1.5 no-print">
                      <button
                        type="button"
                        onClick={() => setSelectedAccountForLedger(acc)}
                        className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-gray-100 text-gray-700 cursor-pointer"
                        title="View Account Ledger"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAccount(acc);
                          setAccountName(acc.name);
                          setAccountCode(acc.code || '');
                          setAccountOpeningBalance(acc.openingBalance || 0);
                        }}
                        className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-amber-50 text-amber-700 cursor-pointer"
                        title="Edit Account / Opening Balance"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {!isCash && (
                        <button
                          type="button"
                          onClick={async () => {
                            const count = await getAccountUsageCount(acc.id, acc.name);
                            if (count > 0) {
                              alert(`This record is used in ${count} transactions. Delete or edit those first`);
                              return;
                            }
                            setDeletingAccountId(acc.id);
                          }}
                          className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </TD>
                </TR>
              );
            })}
          </Table>
        </div>
      )}

      {/* ── TAB 2: BANK TRANSFERS (DEPOSITS & WITHDRAWALS) ──────── */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          <Table
            headers={['Transfer #', 'Date', 'Type', 'Commercial Bank', 'Narration / Description', 'Amount', 'Actions']}
            emptyText="No bank transfers recorded yet. Use '+ New Transfer' button above to deposit or withdraw cash."
          >
            {bankTransfers.map((t) => (
              <TR key={t.id}>
                <TD mono className="font-bold text-black">
                  <div className="flex items-center gap-1.5">
                    <span>{t.no}</span>
                    {t.editCount > 0 && (
                      <span className="px-1 py-0.2 bg-amber-100 text-amber-800 border border-amber-400 text-[9px] font-bold rounded-sm">
                        Edited
                      </span>
                    )}
                  </div>
                </TD>
                <TD>{formatDate(t.date)}</TD>
                <TD>
                  <Badge variant={t.type === 'Deposit' ? 'green' : 'orange'}>
                    {t.type === 'Deposit' ? 'Cash Deposit' : 'Cash Withdrawal'}
                  </Badge>
                </TD>
                <TD className="font-bold text-black">{t.bankAccountName}</TD>
                <TD className="text-gray-700">{t.description || '-'}</TD>
                <TD mono right className={`font-bold ${t.type === 'Deposit' ? 'text-emerald-800' : 'text-red-700'}`}>
                  {fmt(t.amount)}
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-1.5 no-print">
                    <button
                      type="button"
                      onClick={() => setViewingTransfer(t)}
                      className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-gray-100 text-gray-700 cursor-pointer"
                      title="View Slip"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTransfer(t);
                        setTransferDate(t.date || getTodayStr());
                        setTransferType(t.type || 'Deposit');
                        setTransferBankId(t.bankAccountId || '');
                        setTransferAmount(t.amount || 0);
                        setTransferDescription(t.description || '');
                      }}
                      className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-amber-50 text-amber-700 cursor-pointer"
                      title="Edit Bank Transfer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTransferId(t.id)}
                      className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                      title="Delete Bank Transfer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
        </div>
      )}

      {/* ── TAB 3: CAPITAL & EQUITY ENTRIES ─────────────────────── */}
      {activeTab === 'capital' && (
        <div className="space-y-4">
          <Table
            headers={['Entry #', 'Date', 'Type', 'Particulars / Description', 'Amount (PKR)', 'Actions']}
            emptyText="No capital entries found. Use '+ Add Capital Entry' button above to record owner capital investments."
          >
            {capitalEntries.map((c) => (
              <TR key={c.id}>
                <TD mono className="font-bold text-black">{c.no || c.id.slice(0, 8)}</TD>
                <TD>{formatDate(c.date)}</TD>
                <TD>
                  <Badge variant={c.type === 'Withdraw' ? 'orange' : 'green'}>
                    {c.type === 'Withdraw' ? 'Capital Withdrawal (Drawing)' : 'Capital Addition (Investment)'}
                  </Badge>
                </TD>
                <TD className="font-bold text-black">{c.description || 'Owner Capital Entry'}</TD>
                <TD mono right className="font-bold text-black">{fmt(c.amount)}</TD>
                <TD>
                  <div className="flex items-center justify-end gap-1.5 no-print">
                    <button
                      type="button"
                      onClick={() => setViewingCapital(c)}
                      className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-gray-100 text-gray-700 cursor-pointer"
                      title="View Capital Slip"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCapital(c);
                        setCapitalDate(c.date || getTodayStr());
                        setCapitalType(c.type || 'Add');
                        setCapitalAmount(c.amount || 0);
                        setCapitalDescription(c.description || '');
                      }}
                      className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-amber-50 text-amber-700 cursor-pointer"
                      title="Edit Capital Entry"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingCapitalId(c.id)}
                      className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                      title="Delete Capital Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
        </div>
      )}

      {/* ── MODALS ─────────────────────────────────────────────── */}

      {/* Add / Edit Bank Account Modal */}
      <Modal
        isOpen={isAddAccountModalOpen || !!editingAccount}
        onClose={() => {
          setIsAddAccountModalOpen(false);
          setEditingAccount(null);
        }}
        title={editingAccount ? `Editing Account — ${editingAccount.name}` : 'Add New Commercial Bank'}
      >
        <form onSubmit={handleSaveAccount} className="space-y-4">
          <Input
            label="Account / Bank Name"
            value={accountName}
            onChange={setAccountName}
            placeholder="e.g. Meezan Bank Ltd"
            required
          />
          <Input
            label="Account Code"
            value={accountCode}
            onChange={setAccountCode}
            placeholder="e.g. 99101"
            required
          />
          <Input
            label="Opening Balance (PKR)"
            type="number"
            value={accountOpeningBalance}
            onChange={setAccountOpeningBalance}
            required
          />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setIsAddAccountModalOpen(false);
                setEditingAccount(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingAccount ? 'Update Account' : 'Save Account'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Bank Transfer Modal */}
      <Modal
        isOpen={isTransferModalOpen || !!editingTransfer}
        onClose={() => {
          setIsTransferModalOpen(false);
          setEditingTransfer(null);
        }}
        title={editingTransfer ? `Editing Bank Transfer — ${editingTransfer.no}` : 'Record New Bank Transfer'}
      >
        <form onSubmit={handleSaveTransfer} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Transfer Date"
              type="date"
              value={transferDate}
              onChange={setTransferDate}
              required
            />
            <Select
              label="Transfer Type"
              value={transferType}
              onChange={setTransferType}
              options={[
                { value: 'Deposit', label: 'Cash Deposit (Cash -> Bank)' },
                { value: 'Withdrawal', label: 'Cash Withdrawal (Bank -> Cash)' },
              ]}
              required
            />
          </div>

          <Select
            label="Commercial Bank Account"
            value={transferBankId}
            onChange={setTransferBankId}
            options={bankAccounts.map((b) => ({ value: b.id, label: `${b.code || ''} - ${b.name}` }))}
            required
          />

          <Input
            label="Amount (PKR)"
            type="number"
            min="1"
            value={transferAmount}
            onChange={setTransferAmount}
            required
          />

          <Input
            label="Description / Narration"
            value={transferDescription}
            onChange={setTransferDescription}
            placeholder="e.g. Counter deposit for vendor payment"
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setIsTransferModalOpen(false);
                setEditingTransfer(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingTransfer ? 'Update Transfer' : 'Record Transfer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Capital Entry Modal */}
      <Modal
        isOpen={isCapitalModalOpen || !!editingCapital}
        onClose={() => {
          setIsCapitalModalOpen(false);
          setEditingCapital(null);
        }}
        title={editingCapital ? `Editing Capital Entry — ${editingCapital.no || 'Capital'}` : 'Record Capital Entry'}
      >
        <form onSubmit={handleSaveCapital} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={capitalDate}
              onChange={setCapitalDate}
              required
            />
            <Select
              label="Entry Type"
              value={capitalType}
              onChange={setCapitalType}
              options={[
                { value: 'Add', label: 'Capital Addition (Investment)' },
                { value: 'Withdraw', label: 'Capital Drawing (Withdrawal)' },
              ]}
              required
            />
          </div>

          <Input
            label="Amount (PKR)"
            type="number"
            min="1"
            value={capitalAmount}
            onChange={setCapitalAmount}
            required
          />

          <Input
            label="Description / Particulars"
            value={capitalDescription}
            onChange={setCapitalDescription}
            placeholder="e.g. Additional capital invested by proprietor"
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setIsCapitalModalOpen(false);
                setEditingCapital(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingCapital ? 'Update Capital' : 'Save Capital Entry'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bank Account Ledger Modal */}
      <Modal
        isOpen={!!selectedAccountForLedger}
        onClose={() => setSelectedAccountForLedger(null)}
        title={`Account Ledger - ${selectedAccountForLedger?.name}`}
        maxWidth="max-w-5xl"
      >
        {selectedAccountForLedger && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#FAF9F7] p-3 border-2 border-black text-xs">
              <div>
                <span className="text-gray-600 font-bold">Account Name:</span>{' '}
                <span className="font-bold text-black">{selectedAccountForLedger.name}</span>
              </div>
              <div>
                <span className="text-gray-600 font-bold">Opening Balance:</span>{' '}
                <span className="font-mono font-bold text-gray-900 me-4">
                  {fmt(selectedAccountForLedger.openingBalance || 0)}
                </span>
                <span className="text-gray-600 font-bold">Current Balance:</span>{' '}
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {fmt(selectedAccountForLedger.balance)}
                </span>
              </div>
            </div>

            <Table
              headers={['Date', 'Ref #', 'Type', 'Description / Details', 'Received (In)', 'Paid (Out)', 'Running Balance']}
              emptyText="No transactions recorded for this account."
            >
              {getBankLedgerRows(selectedAccountForLedger.name).map((r, idx) => (
                <TR key={idx}>
                  <TD>{formatDate(r.date)}</TD>
                  <TD mono className="font-bold text-[#1E3A5F]">{r.refNo}</TD>
                  <TD>
                    <Badge variant={r.received > 0 ? 'green' : 'orange'}>{r.type}</Badge>
                  </TD>
                  <TD className="text-xs text-gray-700">{r.description}</TD>
                  <TD mono right className="text-emerald-800 font-bold">
                    {r.received > 0 ? fmt(r.received) : '-'}
                  </TD>
                  <TD mono right className="text-red-700 font-bold">
                    {r.paid > 0 ? fmt(r.paid) : '-'}
                  </TD>
                  <TD mono right className="font-bold text-black">
                    {fmt(r.balance)}
                  </TD>
                </TR>
              ))}
            </Table>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedAccountForLedger(null)}>
                Close Ledger
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Bank Transfer Modal */}
      <Modal
        isOpen={!!viewingTransfer}
        onClose={() => setViewingTransfer(null)}
        title={`Bank Transfer — ${viewingTransfer?.no}`}
        maxWidth="max-w-xl"
      >
        {viewingTransfer && (
          <div className="space-y-4 p-2">
            <div className="p-4 border-2 border-black bg-gray-50 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-extrabold text-gray-700 block">
                  {viewingTransfer.type === 'Deposit' ? 'Cash Deposited to Bank' : 'Cash Withdrawn from Bank'}
                </span>
                <span className="text-xs text-gray-600">Bank: <strong>{viewingTransfer.bankAccountName}</strong></span>
              </div>
              <span className="text-2xl font-black font-mono text-emerald-800">{fmt(viewingTransfer.amount)}</span>
            </div>
            <div className="text-sm space-y-1">
              <div><strong>Date:</strong> {formatDate(viewingTransfer.date)}</div>
              <div><strong>Reference No:</strong> {viewingTransfer.no}</div>
              <div><strong>Narration:</strong> {viewingTransfer.description || '-'}</div>
            </div>
            <div className="flex justify-end pt-2 border-t border-black">
              <Button variant="secondary" onClick={() => setViewingTransfer(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Capital Modal */}
      <Modal
        isOpen={!!viewingCapital}
        onClose={() => setViewingCapital(null)}
        title={`Capital Entry — ${viewingCapital?.no || 'Capital'}`}
        maxWidth="max-w-xl"
      >
        {viewingCapital && (
          <div className="space-y-4 p-2">
            <div className="p-4 border-2 border-black bg-gray-50 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-extrabold text-gray-700 block">
                  {viewingCapital.type === 'Withdraw' ? 'Owner Capital Withdrawal' : 'Owner Capital Investment'}
                </span>
                <span className="text-xs text-gray-600">{viewingCapital.description}</span>
              </div>
              <span className="text-2xl font-black font-mono text-black">{fmt(viewingCapital.amount)}</span>
            </div>
            <div className="text-sm space-y-1">
              <div><strong>Date:</strong> {formatDate(viewingCapital.date)}</div>
              <div><strong>Entry No:</strong> {viewingCapital.no || viewingCapital.id}</div>
              <div><strong>Type:</strong> {viewingCapital.type}</div>
            </div>
            <div className="flex justify-end pt-2 border-t border-black">
              <Button variant="secondary" onClick={() => setViewingCapital(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Account Dialog */}
      <ConfirmDialog
        isOpen={!!deletingAccountId}
        title="Delete Bank Account"
        message="Are you sure you want to delete this commercial bank account? This cannot be undone."
        confirmLabel="Delete Account"
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeletingAccountId(null)}
      />

      {/* Delete Transfer Dialog */}
      <ConfirmDialog
        isOpen={!!deletingTransferId}
        title="Delete Bank Transfer"
        message="Are you sure you want to delete this transfer? This will reverse the effects on bank and cash balances."
        confirmLabel="Delete Transfer"
        onConfirm={handleDeleteTransfer}
        onCancel={() => setDeletingTransferId(null)}
      />

      {/* Delete Capital Dialog */}
      <ConfirmDialog
        isOpen={!!deletingCapitalId}
        title="Delete Capital Entry"
        message="Are you sure you want to delete this capital entry?"
        confirmLabel="Delete Entry"
        onConfirm={handleDeleteCapital}
        onCancel={() => setDeletingCapitalId(null)}
      />
    </div>
  );
}
