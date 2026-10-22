import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import Modal from '../../components/ui/Modal.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import { useCashBook } from '../../hooks/useCashBook.js';
import { useParties } from '../../hooks/useParties.js';
import { useFinances } from '../../hooks/useFinances.js';
import { useStock } from '../../hooks/useStock.js';
import { useApp } from '../../context/AppContext.jsx';
import { safePrint } from '../../utils/printUtils.js';
import { fmt, formatDate, getTodayStr } from '../../utils/formatters.js';
import { balanceSide } from '../../utils/partySide.js';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { cashBookService, extractVoucherInfo } from '../../services/cashBookService.js';
import { cashService, compareCashEntries, calculateCashBalanceFromEntries } from '../../services/cashService.js';
import { saleService } from '../../services/saleService.js';
import { purchaseService } from '../../services/purchaseService.js';
import SaleForm from '../../components/forms/SaleForm.jsx';
import PurchaseForm from '../../components/forms/PurchaseForm.jsx';
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  AlertTriangle,
} from 'lucide-react';

import SearchableAccountDropdown, { TRADING_ACCOUNTS } from '../../components/common/SearchableAccountDropdown.jsx';
import { deriveMallHead } from '../../services/cashBookService.js';
import { salePurchaseService } from '../../services/salePurchaseService.js';

const DENOMINATIONS = [5000, 1000, 500, 100, 50, 20, 10, 5];
const EXPENSE_HEADS = ['Labour', 'Transport', 'Electricity', 'Rent', 'Other'];

const createEmptyRow = (idx) => ({
  id: `row_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
  accountType: 'party', // 'party' | 'bank' | 'mall'
  accountNo: '',
  accountId: '',
  accountName: '',
  head: null,
  detail: '',
  credit: '',
  debit: '',
});

export default function CashBook() {
  const navigate = useNavigate();
  const { cashBookEntries, currentCashBalance } = useCashBook();
  const { parties } = useParties();
  const { accounts } = useFinances();
  const { stockEntries } = useStock();
  const { showToast } = useApp();

  const items = useLiveQuery(() => (db.items ? db.items.toArray() : []), []) || [];
  const warehouses = useLiveQuery(() => (db.warehouses ? db.warehouses.toArray() : []), []) || [];

  const bankAccounts = accounts.filter((a) => !a.name.toLowerCase().includes('cash'));

  // --- MANUAL CASH BOOK ENTRY SCREEN STATE ---
  const [cashBookNo, setCashBookNo] = useState(1);
  const [bookNoInput, setBookNoInput] = useState('0001');
  const [isSavedBook, setIsSavedBook] = useState(false);
  const [entryDate, setEntryDate] = useState(getTodayStr());
  const [topAccountNo, setTopAccountNo] = useState('');
  const [topAccountId, setTopAccountId] = useState('');
  const [topAccountName, setTopAccountName] = useState('');
  const [topAccountType, setTopAccountType] = useState('party');
  const [activeAccountBalance, setActiveAccountBalance] = useState(0);

  // 8 default rows matching the reference layout
  const [rows, setRows] = useState(() => Array.from({ length: 8 }, (_, i) => createEmptyRow(i)));

  // Cash Details denominations: count per denomination
  const [denominations, setDenominations] = useState(() =>
    DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: '' }), {})
  );

  // Modals & Dialogs
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [voucherFilter, setVoucherFilter] = useState('');
  const [showDeleteBookDialog, setShowDeleteBookDialog] = useState(false);

  // Source Invoice editing state (when clicking SAL-... or PUR-... in grid)
  const [editingSale, setEditingSale] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);

  // Edit / Delete individual entry state (for Search modal)
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingEntryId, setDeletingEntryId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editPartyId, setEditPartyId] = useState('');
  const [editBankId, setEditBankId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDebit, setEditDebit] = useState(0);
  const [editCredit, setEditCredit] = useState(0);

  // Initial load: compute next book number once on first page load
  useEffect(() => {
    let isMounted = true;
    async function initPage() {
      try {
        const nextNo = await cashBookService.getNextBookNo();
        if (isMounted) {
          setCashBookNo(nextNo);
          setBookNoInput(String(nextNo).padStart(4, '0'));
          setIsSavedBook(false);
        }
      } catch {
        if (isMounted) {
          setCashBookNo(1);
          setBookNoInput('0001');
          setIsSavedBook(false);
        }
      }
    }
    initPage();
    return () => {
      isMounted = false;
    };
  }, []);

  // Keyboard navigation: PageUp = previous, PageDown = next
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'textarea') return;
      if (e.key === 'PageUp') {
        e.preventDefault();
        handleNavigatePrevious();
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        handleNavigateNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cashBookNo]);

  // Load a specific Cash Book by number
  const loadBook = async (targetNo) => {
    try {
      const { sheet, entries, exists } = await cashBookService.getBook(targetNo);
      if (!exists) {
        const nextNo = await cashBookService.getNextBookNo();
        if (targetNo === nextNo) {
          await handleNewCashBook(targetNo);
          return;
        }
        showToast(`Cash Book ${String(targetNo).padStart(4, '0')} not found`, 'error');
        setBookNoInput(String(cashBookNo).padStart(4, '0'));
        return;
      }

      setCashBookNo(targetNo);
      setBookNoInput(String(targetNo).padStart(4, '0'));
      setEntryDate(sheet?.date || entries[0]?.date || getTodayStr());
      setDenominations(
        sheet?.denominations || DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: '' }), {})
      );

      const loadedRows = entries.map((e, idx) => {
        let accountType = e.accountType || (e.bankAccountId || e.bankAccountName ? 'bank' : e.partyId || e.partyName ? 'party' : 'general');
        let accountId = e.partyId || e.bankAccountId || e.accountId || '';
        let accountName = e.partyName || e.bankAccountName || e.accountName || '';
        let accountNo = '';
        let head = e.head || null;

        if (accountType === 'mall' || e.accountType === 'mall') {
          accountType = 'mall';
          head = e.head || deriveMallHead(accountName, accountId);
          accountNo = head === 'Sale' ? '99011' : head === 'Purchase' ? '99012' : '99010';
          accountName = e.accountName || (head === 'Sale' ? 'Sale A/C - سیل' : head === 'Purchase' ? 'Purchase A/C - پرچیز' : 'Mall A/C - مال کھاتہ');
          accountId = accountNo;
        } else if (accountType === 'party' || e.partyId) {
          const p = parties.find((party) => party.id === accountId || party.name === accountName);
          if (p) {
            accountType = 'party';
            accountId = p.id;
            accountName = p.name;
            accountNo = p.code || p.id;
          }
        } else if (accountType === 'bank' || e.bankAccountId) {
          const b = bankAccounts.find((bank) => bank.id === accountId || bank.name === accountName);
          if (b) {
            accountType = 'bank';
            accountId = b.id;
            accountName = b.name;
            accountNo = b.code || b.id;
          }
        }

        return {
          id: e.id || `row_${idx}_${Date.now()}`,
          accountType,
          accountNo,
          accountId,
          accountName,
          head,
          detail: e.description || '',
          credit: e.credit ? String(e.credit) : '',
          debit: e.debit ? String(e.debit) : '',
          linkedTransactionId: e.linkedTransactionId || e.linkedInvoiceId || null,
        };
      });

      setRows(loadedRows.length > 0 ? loadedRows : Array.from({ length: 8 }, (_, i) => createEmptyRow(i)));
      setIsSavedBook(true);

      if (loadedRows[0]?.accountId || loadedRows[0]?.accountName) {
        setTopAccountId(loadedRows[0].accountId);
        setTopAccountNo(loadedRows[0].accountNo);
        setTopAccountName(loadedRows[0].accountName);
        setTopAccountType(loadedRows[0].accountType);
        if (loadedRows[0].accountType === 'party') {
          const p = parties.find(
            (party) =>
              party.id === loadedRows[0].accountId || party.name === loadedRows[0].accountName
          );
          setActiveAccountBalance(Number(p?.balance || 0));
        } else if (loadedRows[0].accountType === 'bank') {
          const b = bankAccounts.find(
            (bank) =>
              bank.id === loadedRows[0].accountId || bank.name === loadedRows[0].accountName
          );
          setActiveAccountBalance(Number(b?.balance || 0));
        } else if (loadedRows[0].accountType === 'mall') {
          try {
            const sum = await salePurchaseService.getSummary();
            setActiveAccountBalance(Number(sum.netBalance || 0));
          } catch {
            setActiveAccountBalance(0);
          }
        }
      } else {
        setTopAccountId('');
        setTopAccountNo('');
        setTopAccountName('');
        setTopAccountType('party');
        setActiveAccountBalance(0);
      }
    } catch (err) {
      console.error('Error loading cash book:', err);
      showToast('Failed to load cash book', 'error');
    }
  };

  // Navigation handlers
  const handleNavigateFirst = async () => {
    const numbers = await cashBookService.getAllBookNumbers();
    if (numbers.length > 0) {
      await loadBook(numbers[0]);
    } else {
      await handleNewCashBook(1);
    }
  };

  const handleNavigatePrevious = async () => {
    const numbers = await cashBookService.getAllBookNumbers();
    const prevNos = numbers.filter((n) => n < cashBookNo);
    if (prevNos.length > 0) {
      await loadBook(Math.max(...prevNos));
    } else {
      showToast('Already at the first Cash Book');
    }
  };

  const handleNavigateNext = async () => {
    const numbers = await cashBookService.getAllBookNumbers();
    const nextNos = numbers.filter((n) => n > cashBookNo);
    if (nextNos.length > 0) {
      await loadBook(Math.min(...nextNos));
    } else {
      const maxNo = numbers.length > 0 ? Math.max(...numbers) : 0;
      if (cashBookNo <= maxNo) {
        await handleNewCashBook(maxNo + 1);
      } else {
        showToast('Already at the latest new Cash Book');
      }
    }
  };

  const handleNavigateLast = async () => {
    const numbers = await cashBookService.getAllBookNumbers();
    if (numbers.length > 0) {
      await loadBook(Math.max(...numbers));
    } else {
      await handleNewCashBook(1);
    }
  };

  const handleNewCashBook = async (explicitNo) => {
    const nextNo =
      explicitNo !== undefined ? explicitNo : await cashBookService.getNextBookNo();
    setCashBookNo(nextNo);
    setBookNoInput(String(nextNo).padStart(4, '0'));
    setEntryDate(getTodayStr());
    setRows(Array.from({ length: 8 }, (_, i) => createEmptyRow(i)));
    setDenominations(DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: '' }), {}));
    setTopAccountId('');
    setTopAccountNo('');
    setTopAccountName('');
    setActiveAccountBalance(0);
    setIsSavedBook(false);
  };

  const handleBookNoInputSubmit = async (val) => {
    const target = parseInt(val, 10);
    if (isNaN(target) || target <= 0) {
      setBookNoInput(String(cashBookNo).padStart(4, '0'));
      return;
    }
    const numbers = await cashBookService.getAllBookNumbers();
    const maxNo = numbers.length > 0 ? Math.max(...numbers) : 0;
    if (numbers.includes(target)) {
      await loadBook(target);
    } else if (target === maxNo + 1) {
      await handleNewCashBook(target);
    } else {
      showToast(`Cash Book ${String(target).padStart(4, '0')} not found`, 'error');
      setBookNoInput(String(cashBookNo).padStart(4, '0'));
    }
  };

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

  // Self-check: compare stored accounts.balance (Cash) with single source of truth getCashBalance()
  const cashAcc = accounts.find(
    (a) => a.name?.toLowerCase() === 'cash' || a.name?.toLowerCase().includes('cash')
  );
  const storedCashBalance = Number(cashAcc?.balance || 0);
  const fullComputedCashBalance = useMemo(() => {
    return calculateCashBalanceFromEntries(cashBookEntries, accounts);
  }, [cashBookEntries, accounts]);

  const isCashOutOfSync = Math.abs(storedCashBalance - fullComputedCashBalance) > 1;

  // Linked system entries whose date equals entryDate and have no cashBookNo
  // (Receipts from Sales, payments of Purchases, Journal cash lines, customer receipts, etc.)
  const systemRowsForDate = useMemo(() => {
    const unnumbered = cashBookEntries.filter(
      (e) => !e.cashBookNo && e.date === entryDate
    );
    return unnumbered.map((e, idx) => {
      const voucherInfo = extractVoucherInfo(e);
      const party = parties.find((p) => p.id === e.partyId || p.name === e.partyName);
      return {
        id: e.id || `sys_${idx}`,
        isSystemRow: true,
        accountType: 'party',
        accountNo: party?.code || party?.id || 'SYS',
        accountId: e.partyId || '',
        accountName: e.partyName || (voucherInfo?.sourceType ? `${voucherInfo.sourceType} Receipt` : 'System Entry'),
        head: null,
        detail: e.description || '',
        credit: Number(e.credit || 0) > 0 ? String(e.credit) : '',
        debit: Number(e.debit || 0) > 0 ? String(e.debit) : '',
        linkedTransactionId: e.linkedTransactionId || null,
        sourceVoucher: voucherInfo?.voucherNo || null,
        sourceType: voucherInfo?.sourceType || null,
        sourceId: voucherInfo?.sourceId || e.linkedTransactionId || null,
      };
    });
  }, [cashBookEntries, entryDate, parties]);

  // Click handler to open the source voucher (Sale or Purchase) for edit
  const handleOpenVoucher = async (row) => {
    const voucherNo = row.sourceVoucher;
    const sourceType = row.sourceType;
    const sourceId = row.sourceId || row.linkedTransactionId;

    if (sourceType === 'Sale' || voucherNo?.startsWith('SAL')) {
      let sale = null;
      if (sourceId) {
        sale = await db.sales.get(sourceId);
      }
      if (!sale && voucherNo) {
        sale = await db.sales.where({ no: voucherNo }).first();
      }
      if (!sale && row.detail) {
        const m = row.detail.match(/SAL-\d+/i);
        if (m) sale = await db.sales.where({ no: m[0].toUpperCase() }).first();
      }
      if (sale) {
        setEditingSale(sale);
        return;
      }
      showToast(`Sale invoice ${voucherNo || ''} not found`, 'error');
    } else if (sourceType === 'Purchase' || voucherNo?.startsWith('PUR')) {
      let pur = null;
      if (sourceId) {
        pur = await db.purchases.get(sourceId);
      }
      if (!pur && voucherNo) {
        pur = await db.purchases.where({ no: voucherNo }).first();
      }
      if (!pur && row.detail) {
        const m = row.detail.match(/PUR-\d+/i);
        if (m) pur = await db.purchases.where({ no: m[0].toUpperCase() }).first();
      }
      if (pur) {
        setEditingPurchase(pur);
        return;
      }
      showToast(`Purchase invoice ${voucherNo || ''} not found`, 'error');
    } else if (voucherNo?.startsWith('JV')) {
      navigate('/journal');
    } else if (voucherNo?.startsWith('RCT')) {
      navigate('/receipts');
    } else if (voucherNo?.startsWith('PAY')) {
      navigate('/payments');
    }
  };

  // Determine manual rows to render ensuring total grid rows (system + manual) is at least 8
  const manualRowsToRender = useMemo(() => {
    const lastFilledIndex = rows.reduce((last, r, i) => {
      return (r.accountName || r.accountId || Number(r.credit) > 0 || Number(r.debit) > 0 || r.detail) ? i : last;
    }, -1);
    const minManualNeeded = Math.max(lastFilledIndex + 1, Math.max(1, 8 - systemRowsForDate.length));
    if (rows.length >= minManualNeeded) {
      return rows.slice(0, minManualNeeded);
    }
    const padded = [...rows];
    while (padded.length < minManualNeeded) {
      padded.push(createEmptyRow(padded.length));
    }
    return padded;
  }, [rows, systemRowsForDate.length]);

  // Previous Balance (green box):
  // Strictly the cash balance before this book's date, including earlier numbered books on this date
  const previousCashBalance = useMemo(() => {
    const balBeforeDate = calculateCashBalanceFromEntries(cashBookEntries, accounts, {
      beforeDate: entryDate,
    });

    if (isSavedBook && Number(cashBookNo) > 1) {
      const earlierBooksToday = cashBookEntries.filter(
        (e) =>
          e.date === entryDate &&
          e.cashBookNo &&
          Number(e.cashBookNo) < Number(cashBookNo)
      );
      const earlierNet = earlierBooksToday.reduce(
        (sum, e) => sum + (Number(e.credit || 0) - Number(e.debit || 0)),
        0
      );
      return balBeforeDate + earlierNet;
    }

    return balBeforeDate;
  }, [cashBookEntries, accounts, entryDate, isSavedBook, cashBookNo]);

  // Helper to extract existing expense head prefix
  const getExpenseHeadPrefix = (detail = '') => {
    const text = String(detail || '').trim();
    for (const h of EXPENSE_HEADS) {
      if (
        text.toLowerCase() === h.toLowerCase() ||
        text.toLowerCase().startsWith(h.toLowerCase() + ' -') ||
        text.toLowerCase().startsWith(h.toLowerCase() + ':')
      ) {
        return h;
      }
    }
    return '';
  };

  // Helper to set/replace/strip expense head prefix in detail text
  const handleApplyExpenseHead = (idx, head) => {
    setRows((prev) => {
      const updated = [...prev];
      const curDetail = String(updated[idx].detail || '').trim();
      if (!head) {
        const existingHead = getExpenseHeadPrefix(curDetail);
        if (existingHead) {
          const stripped = curDetail.replace(new RegExp(`^${existingHead}\\s*[-:]?\\s*`, 'i'), '').trim();
          updated[idx].detail = stripped;
        }
        return updated;
      }

      const existingHead = getExpenseHeadPrefix(curDetail);
      if (existingHead) {
        const stripped = curDetail.replace(new RegExp(`^${existingHead}\\s*[-:]?\\s*`, 'i'), '').trim();
        updated[idx].detail = stripped ? `${head} - ${stripped}` : head;
      } else if (!curDetail) {
        updated[idx].detail = head;
      } else {
        updated[idx].detail = `${head} - ${curDetail}`;
      }
      return updated;
    });
  };

  // Row update handlers
  const handleRowChange = (idx, field, value) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };

      // Typing an amount in one side clears the other side of that row
      if (field === 'credit') {
        if (value && Number(value) > 0) {
          updated[idx].debit = '';
        }
      } else if (field === 'debit') {
        if (value && Number(value) > 0) {
          updated[idx].credit = '';
        }
      }

      if (field === 'accountId') {
        const trading = TRADING_ACCOUNTS.find((t) => t.id === value || t.code === value);
        if (trading) {
          updated[idx].accountType = 'mall';
          updated[idx].accountNo = trading.code;
          updated[idx].accountName = trading.name;
          updated[idx].head = trading.head;
          setTopAccountId(trading.id);
          setTopAccountNo(trading.code);
          setTopAccountName(trading.name);
          setTopAccountType('mall');
          salePurchaseService.getSummary().then((sum) => setActiveAccountBalance(Number(sum?.netBalance || 0))).catch(() => {});
        } else {
          const party = parties.find((p) => p.id === value);
          if (party) {
            updated[idx].accountType = 'party';
            updated[idx].accountNo = party.code || party.id;
            updated[idx].accountName = party.name;
            updated[idx].head = null;
            setActiveAccountBalance(Number(party.balance || 0));
            setTopAccountId(party.id);
            setTopAccountNo(party.code || party.id);
            setTopAccountName(party.name);
            setTopAccountType('party');
          } else {
            const bank = bankAccounts.find((b) => b.id === value);
            if (bank) {
              updated[idx].accountType = 'bank';
              updated[idx].accountNo = bank.code || bank.id;
              updated[idx].accountName = bank.name;
              updated[idx].head = null;
              setActiveAccountBalance(Number(bank.balance || 0));
              setTopAccountId(bank.id);
              setTopAccountNo(bank.code || bank.id);
              setTopAccountName(bank.name);
              setTopAccountType('bank');
            }
          }
        }
      }
      return updated;
    });
  };

  // Row account select from SearchableAccountDropdown
  const handleRowAccountSelect = async (idx, acc) => {
    if (!acc) return;
    setRows((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        accountType: acc.accountType,
        accountId: acc.accountId,
        accountNo: acc.accountNo,
        accountName: acc.accountName,
        head: acc.head || null,
      };
      return updated;
    });

    setTopAccountId(acc.accountId);
    setTopAccountNo(acc.accountNo);
    setTopAccountName(acc.accountName);
    setTopAccountType(acc.accountType);

    if (acc.accountType === 'party') {
      const p = parties.find((party) => party.id === acc.accountId || party.name === acc.accountName);
      setActiveAccountBalance(Number(p?.balance || acc.balance || 0));
    } else if (acc.accountType === 'bank') {
      const b = bankAccounts.find((bank) => bank.id === acc.accountId || bank.name === acc.accountName);
      setActiveAccountBalance(Number(b?.balance || acc.balance || 0));
    } else if (acc.accountType === 'mall') {
      try {
        const sum = await salePurchaseService.getSummary();
        setActiveAccountBalance(Number(sum.netBalance || 0));
      } catch {
        setActiveAccountBalance(0);
      }
    }
  };

  // Top account change handler
  const handleTopAccountSelect = async (val) => {
    if (!val) {
      setTopAccountId('');
      setTopAccountNo('');
      setTopAccountName('');
      setTopAccountType('party');
      setActiveAccountBalance(0);
      return;
    }

    const acc = typeof val === 'object' ? val : null;
    const accountId = acc ? acc.accountId : val;

    const trading = TRADING_ACCOUNTS.find((t) => t.id === accountId || t.code === accountId);
    if (trading || acc?.accountType === 'mall') {
      const item = trading || acc;
      const tid = item.accountId || item.id;
      const tcode = item.accountNo || item.code;
      const tname = item.accountName || item.name;
      const thead = item.head || 'Mall';
      setTopAccountId(tid);
      setTopAccountNo(tcode);
      setTopAccountName(tname);
      setTopAccountType('mall');
      try {
        const sum = await salePurchaseService.getSummary();
        setActiveAccountBalance(Number(sum?.netBalance || 0));
      } catch {
        setActiveAccountBalance(0);
      }

      setRows((prev) => {
        const updated = [...prev];
        if (!updated[0].accountName) {
          updated[0].accountType = 'mall';
          updated[0].accountId = tid;
          updated[0].accountNo = tcode;
          updated[0].accountName = tname;
          updated[0].head = thead;
        }
        return updated;
      });
      return;
    }

    const party = parties.find((p) => p.id === accountId);
    if (party || acc?.accountType === 'party') {
      const p = party || acc;
      const pid = p.accountId || p.id;
      const pcode = p.accountNo || p.code || p.id;
      const pname = p.accountName || p.name;
      setTopAccountId(pid);
      setTopAccountNo(pcode);
      setTopAccountName(pname);
      setTopAccountType('party');
      setActiveAccountBalance(Number(p.balance !== undefined ? p.balance : party?.balance || 0));

      setRows((prev) => {
        const updated = [...prev];
        if (!updated[0].accountName) {
          updated[0].accountType = 'party';
          updated[0].accountId = pid;
          updated[0].accountNo = pcode;
          updated[0].accountName = pname;
          updated[0].head = null;
        }
        return updated;
      });
      return;
    }

    const bank = bankAccounts.find((b) => b.id === accountId);
    if (bank || acc?.accountType === 'bank') {
      const b = bank || acc;
      const bid = b.accountId || b.id;
      const bcode = b.accountNo || b.code || b.id || 'BANK';
      const bname = b.accountName || b.name;
      setTopAccountId(bid);
      setTopAccountNo(bcode);
      setTopAccountName(bname);
      setTopAccountType('bank');
      setActiveAccountBalance(Number(b.balance !== undefined ? b.balance : bank?.balance || 0));

      setRows((prev) => {
        const updated = [...prev];
        if (!updated[0].accountName) {
          updated[0].accountType = 'bank';
          updated[0].accountId = bid;
          updated[0].accountNo = bcode;
          updated[0].accountName = bname;
          updated[0].head = null;
        }
        return updated;
      });
    }
  };

  // Grid live calculations (system rows + manual rows)
  const totalSystemCredit = systemRowsForDate.reduce((sum, r) => sum + (Number(r.credit) || 0), 0);
  const totalSystemDebit = systemRowsForDate.reduce((sum, r) => sum + (Number(r.debit) || 0), 0);

  const totalManualCredit = rows.reduce((sum, r) => sum + (Number(r.credit) || 0), 0);
  const totalManualDebit = rows.reduce((sum, r) => sum + (Number(r.debit) || 0), 0);

  const totalCredit = totalSystemCredit + totalManualCredit;
  const totalDebit = totalSystemDebit + totalManualDebit;
  const currentClosingBalance = previousCashBalance + totalCredit - totalDebit;

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

  // Difference between Physical Cash details and Current/Closing Balance
  const cashDifference = denominationValues.valSum - currentClosingBalance;

  // Handle Save / Update Book (saves only manual rows, never duplicates system rows)
  const handleSaveOrUpdate = async () => {
    const validManualRows = rows.filter(
      (r) => !r.isSystemRow && (r.accountName || r.accountId) && (Number(r.credit) > 0 || Number(r.debit) > 0)
    );

    const hasDenominations = denominations && Object.values(denominations).some((v) => Number(v) > 0);
    if (validManualRows.length === 0 && !hasDenominations && systemRowsForDate.length === 0) {
      alert('Please fill in at least one row with an Account Name and Credit/Debit amount.');
      return;
    }

    try {
      if (isSavedBook) {
        await cashBookService.updateBook({
          cashBookNo,
          date: entryDate,
          denominations,
          rows: validManualRows,
        });
        showToast(`Cash Book #${String(cashBookNo).padStart(4, '0')} updated successfully!`);
      } else {
        await cashBookService.saveBook({
          cashBookNo,
          date: entryDate,
          denominations,
          rows: validManualRows,
        });
        showToast(`Cash Book #${String(cashBookNo).padStart(4, '0')} saved successfully!`);
      }

      await loadBook(cashBookNo);
    } catch (err) {
      console.error('Failed to save/update Cash Book:', err);
      alert(err.message || 'Error saving Cash Book entry. Check console for details.');
    }
  };

  // Handle Delete Book
  const handleDeleteBook = async () => {
    try {
      await cashBookService.deleteBook(cashBookNo);
      showToast(`Cash Book #${String(cashBookNo).padStart(4, '0')} deleted and effects reversed!`);
      setShowDeleteBookDialog(false);

      // Open previous book after delete
      const numbers = await cashBookService.getAllBookNumbers();
      const prevNos = numbers.filter((n) => n < cashBookNo);
      if (prevNos.length > 0) {
        await loadBook(Math.max(...prevNos));
      } else if (numbers.length > 0) {
        await loadBook(numbers[0]);
      } else {
        await handleNewCashBook(1);
      }
    } catch (err) {
      console.error('Failed to delete Cash Book:', err);
      alert(err.message || 'Error deleting Cash Book entry.');
    }
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
    const isMatched = Math.abs(cashDifference) < 0.001;
    if (denominationValues.valSum > 0 && !isMatched) {
      const statusText = cashDifference < 0 ? 'Short' : 'Excess';
      alert(
        `Reconciliation Notice:\nPhysical Cash Count: ${fmt(denominationValues.valSum)}\nCurrent/Closing Balance: ${fmt(currentClosingBalance)}\nDifference: ${fmt(Math.abs(cashDifference))} ${statusText}\n\nPlease recount notes before saving.`
      );
    } else {
      alert(
        `✓ All ${validRows.length} entries verified!\nTotal Credit (Jamma): ${fmt(totalCredit)}\nTotal Debit (Benaam): ${fmt(totalDebit)}\nPrevious Balance: ${fmt(previousCashBalance)}\nClosing Balance: ${fmt(currentClosingBalance)}\nPhysical Cash Reconciliation: Matched.`
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

  // Formatted top active balance representation
  const topParty = parties.find((p) => p.id === topAccountId || p.name === topAccountName);
  const activeBalanceDisplay = useMemo(() => {
    let bal = null;
    if (topParty) {
      bal = topParty.balance;
    } else if (topAccountType === 'mall' || activeAccountBalance !== 0) {
      bal = activeAccountBalance;
    }
    if (bal !== null && bal !== undefined) {
      const side = balanceSide(bal);
      if (side.amount === 0) return '0.00';
      return `${fmt(side.amount)} ${side.ur} (${side.en})`;
    }
    return '0.00';
  }, [topParty, topAccountType, activeAccountBalance]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cash Book"
        subtitle="Traditional Roznamcha Cash In/Out journal, physical denomination count & numbered book navigation"
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

      {/* Self-check sync banner */}
      {isCashOutOfSync && (
        <div className="bg-amber-100 border-2 border-amber-500 p-3 flex flex-wrap items-center justify-between gap-2 text-amber-950 font-bold no-print mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            <span className="text-sm">
              Cash balance out of sync — Recalculate (Computed: {fmt(fullComputedCashBalance)}, Stored: {fmt(storedCashBalance)})
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              const res = await cashService.repairJournalCashRows();
              showToast(`Cash balance recalculated! Physical Cash is ${fmt(res.currentCashBalance)}.`);
            }}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs border border-black cursor-pointer shadow-none"
          >
            Recalculate Cash Balance
          </button>
        </div>
      )}

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
              {isSavedBook ? 'CASH BOOK' : 'CASH BOOK — DAY BOOK'}
            </h1>
          </div>
          {!isSavedBook && (
            <div className="mt-1 text-xs font-bold text-blue-900 bg-blue-50 inline-block px-3 py-0.5 border border-blue-300">
              {systemRowsForDate.length > 0
                ? `Day Book View — ${systemRowsForDate.length} linked receipt/payment entry on ${formattedDateDDMMYY || entryDate}`
                : `Day Book View — Unsaved Sheet for ${formattedDateDDMMYY || entryDate}`}
            </div>
          )}
        </div>

        {/* Top Info Bar (Bordered container) */}
        <div className="cashbook-info-bar max-w-3xl mx-auto mb-4 border-2 border-[#0000CC] bg-[#EBE9ED] print:bg-[#FAF9F7] p-3 space-y-2">
          {/* Row 1: Cash Book Navigation Bar & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-12 print:grid-cols-12 gap-2 items-center text-sm">
            <label className="sm:col-span-2 print:col-span-3 font-bold text-gray-900">Cash Book No</label>
            <div className="sm:col-span-5 print:col-span-3 flex items-center gap-1">
              {/* Print-only View */}
              <span className="hidden print:block w-full bg-white border border-black px-2 py-1 font-mono font-bold text-gray-900 text-center text-sm">
                {String(cashBookNo).padStart(4, '0')}
              </span>

              {/* Interactive Old-Software Navigation Bar */}
              <div className="print:hidden flex items-center gap-1 w-full">
                <button
                  type="button"
                  onClick={handleNavigateFirst}
                  title="First Cash Book (|<)"
                  className="px-1.5 py-1 border border-black bg-white hover:bg-gray-200 text-black font-bold text-xs cursor-pointer"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNavigatePrevious}
                  title="Previous Cash Book (<) [PageUp]"
                  className="px-1.5 py-1 border border-black bg-white hover:bg-gray-200 text-black font-bold text-xs cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  maxLength={4}
                  value={bookNoInput}
                  onChange={(e) => setBookNoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleBookNoInputSubmit(bookNoInput);
                    }
                  }}
                  onBlur={() => handleBookNoInputSubmit(bookNoInput)}
                  className="w-16 bg-white border border-black px-1.5 py-1 font-mono font-bold text-gray-900 outline-none text-center text-sm"
                  title="Type Book Number & Press Enter"
                />
                <button
                  type="button"
                  onClick={handleNavigateNext}
                  title="Next Cash Book (>) [PageDown]"
                  className="px-1.5 py-1 border border-black bg-white hover:bg-gray-200 text-black font-bold text-xs cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNavigateLast}
                  title="Last Cash Book (>|)"
                  className="px-1.5 py-1 border border-black bg-white hover:bg-gray-200 text-black font-bold text-xs cursor-pointer"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNewCashBook()}
                  title="New Cash Book"
                  className="px-2 py-1 border border-black bg-[#E3F2FD] hover:bg-blue-100 text-[#0D47A1] font-bold text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              </div>
            </div>

            <label className="sm:col-span-2 print:col-span-2 font-bold text-gray-900 text-end pe-1">
              Date(DD/MM/YY)
            </label>
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
            <div className="sm:col-span-1 print:col-span-2">
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
            <label className="sm:col-span-2 print:col-span-3 font-bold text-gray-900">Account No</label>
            <div className="sm:col-span-5 print:col-span-3">
              <span className="hidden print:block w-full bg-white border border-black px-1.5 py-1 text-sm font-mono font-bold text-center">
                {topAccountNo || (topParty ? topParty.code || topParty.id : '-')}
              </span>
              <div className="print:hidden">
                <SearchableAccountDropdown
                  id="top-account-selector"
                  value={topAccountId}
                  accountType={topAccountType}
                  accountNo={topAccountNo}
                  accountName={topAccountName}
                  parties={parties}
                  bankAccounts={bankAccounts}
                  tradingAccounts={TRADING_ACCOUNTS}
                  onSelect={handleTopAccountSelect}
                  placeholder="-- Select Account --"
                />
              </div>
            </div>

            <label className="sm:col-span-2 print:col-span-2 font-bold text-gray-900 text-end pe-1">
              Account Name
            </label>
            <div className="sm:col-span-3 print:col-span-4">
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

          {/* Row 3: Account Balance & Previous Cash Balance */}
          <div className="grid grid-cols-1 sm:grid-cols-12 print:grid-cols-12 gap-2 items-center text-sm">
            <label className="sm:col-span-2 print:col-span-3 font-bold text-blue-900">Account Balance</label>
            <div className="sm:col-span-5 print:col-span-3">
              <div
                className="w-full bg-[#E0E7FF] border border-black font-bold font-mono text-sm text-blue-950 px-2 py-1 text-left tabular-nums"
                dir="ltr"
              >
                {activeBalanceDisplay}
              </div>
            </div>

            <label className="sm:col-span-2 print:col-span-2 font-bold text-gray-900 text-end pe-1">
              Previous Balance
            </label>
            <div className="sm:col-span-3 print:col-span-4">
              <div
                className="w-full bg-[#76FF03] border border-black font-bold font-mono text-sm text-black px-2 py-1 text-left tabular-nums"
                dir="ltr"
              >
                {previousCashBalance ? fmt(previousCashBalance) : '0.00'}
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
                      <th className="border border-black px-3 py-2.5 w-48 text-start text-base font-bold">
                        Account Name
                      </th>
                      <th className="border border-black px-3 py-2.5 text-start text-base font-bold">Detail</th>
                      <th className="border border-black px-3 py-2.5 w-28 text-left text-base font-bold" dir="ltr">
                        Credit/Jamma
                      </th>
                      <th className="border border-black px-3 py-2.5 w-28 text-left text-base font-bold" dir="ltr">
                        Debit/Benaam
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 1. Read-only linked system entries from Sales, Purchases, JV, etc. */}
                    {systemRowsForDate.map((sysRow) => (
                      <tr key={sysRow.id} className="bg-amber-50/70 hover:bg-amber-100/80 border-b border-black">
                        {/* Acc/ No */}
                        <td className="border border-black px-2 py-2 text-center">
                          <span className="text-base font-mono font-bold tabular-nums text-gray-900">
                            {sysRow.accountNo || '-'}
                          </span>
                        </td>

                        {/* Account Name */}
                        <td className="border border-black px-3 py-2 text-start">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-base font-bold text-gray-900 truncate">
                              {sysRow.accountName || 'System Party'}
                            </span>
                            <span
                              className="print:hidden inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-400 shrink-0"
                              title="Linked system entry (Read-only)"
                            >
                              <Lock className="w-2.5 h-2.5 text-amber-900" />
                              <span>{sysRow.sourceType || 'System'}</span>
                            </span>
                          </div>
                        </td>

                        {/* Detail Narration with Clickable Voucher Number */}
                        <td className="border border-black px-2 py-1.5 text-start">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {sysRow.sourceVoucher && (
                              <button
                                type="button"
                                onClick={() => handleOpenVoucher(sysRow)}
                                title={`Click to edit source ${sysRow.sourceType || 'voucher'} ${sysRow.sourceVoucher}`}
                                className="print:hidden px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-[#0000CC] border border-blue-500 text-xs font-mono font-bold rounded cursor-pointer underline flex items-center gap-1 shadow-none transition-colors"
                              >
                                <span>{sysRow.sourceVoucher}</span>
                                <Pencil className="w-3 h-3 text-blue-700" />
                              </button>
                            )}
                            <span className="hidden print:inline font-mono font-bold text-xs text-black">
                              {sysRow.sourceVoucher ? `[${sysRow.sourceVoucher}] ` : ''}
                            </span>
                            <span className="text-sm text-gray-800 truncate" title={sysRow.detail}>
                              {sysRow.detail}
                            </span>
                          </div>
                        </td>

                        {/* Credit / Jamma (Cash Received) */}
                        <td className="border border-black px-3 py-2 text-left" dir="ltr">
                          <span className="text-base font-mono font-bold text-emerald-800 tabular-nums">
                            {sysRow.credit && Number(sysRow.credit) > 0
                              ? Number(sysRow.credit).toLocaleString('en-PK')
                              : '-'}
                          </span>
                        </td>

                        {/* Debit / Benaam (Cash Paid) */}
                        <td className="border border-black px-3 py-2 text-left" dir="ltr">
                          <span className="text-base font-mono font-bold text-red-800 tabular-nums">
                            {sysRow.debit && Number(sysRow.debit) > 0
                              ? Number(sysRow.debit).toLocaleString('en-PK')
                              : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* 2. Manual Editable Rows */}
                    {manualRowsToRender.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-blue-50/40">
                        {/* Acc/ No Selector */}
                        <td className="border border-black p-0 text-center">
                          <span className="hidden print:block px-2 py-2 text-base font-mono tabular-nums">
                            {row.accountNo || '-'}
                          </span>
                          <div className="print:hidden">
                            <SearchableAccountDropdown
                              compact={true}
                              id={`row-acc-${idx}`}
                              value={row.accountId}
                              accountType={row.accountType}
                              accountNo={row.accountNo}
                              accountName={row.accountName}
                              parties={parties}
                              bankAccounts={bankAccounts}
                              tradingAccounts={TRADING_ACCOUNTS}
                              onSelect={(acc) => handleRowAccountSelect(idx, acc)}
                              placeholder="-"
                            />
                          </div>
                        </td>

                        {/* Account Name */}
                        <td className="border border-black p-0">
                          <span className="hidden print:block px-3 py-2 text-base font-medium truncate text-start">
                            {row.accountName || ''}
                          </span>
                          <div className="print:hidden flex items-center">
                            {row.linkedTransactionId && (
                              <span
                                className="flex items-center gap-1 ms-2 px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold shrink-0 cursor-help"
                                title="Edit from the original voucher"
                              >
                                <Lock className="w-3 h-3 text-amber-800" />
                                <span>Edit from original voucher</span>
                              </span>
                            )}
                            <input
                              type="text"
                              value={row.accountName}
                              onChange={(e) => handleRowChange(idx, 'accountName', e.target.value)}
                              placeholder="Select or enter account..."
                              dir="auto"
                              className="w-full px-3 py-2 text-base outline-none bg-transparent font-medium text-start"
                            />
                          </div>
                        </td>

                        {/* Detail Narration */}
                        <td className="border border-black p-0">
                          <span className="hidden print:block px-3 py-2 text-base text-gray-800 truncate text-start">
                            {row.detail || ''}
                          </span>
                          <div className="print:hidden p-1">
                            <input
                              type="text"
                              value={row.detail}
                              onChange={(e) => handleRowChange(idx, 'detail', e.target.value)}
                              placeholder="Manual description..."
                              dir="auto"
                              className="w-full px-2 py-1 text-base outline-none bg-transparent text-start"
                            />
                            {/* Expense Head Suggestions when Mall A/C debit (expense) is chosen */}
                            {row.accountType === 'mall' && Number(row.debit) > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-1 px-1">
                                <span className="text-gray-500 font-semibold text-[10px]">Expense:</span>
                                {EXPENSE_HEADS.map((head) => {
                                  const isActive = getExpenseHeadPrefix(row.detail).toLowerCase() === head.toLowerCase();
                                  return (
                                    <button
                                      key={head}
                                      type="button"
                                      onClick={() => handleApplyExpenseHead(idx, isActive ? '' : head)}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                                        isActive
                                          ? 'bg-amber-500 text-white border-amber-600 font-bold'
                                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                      }`}
                                      title={isActive ? 'Click to remove head' : `Tag as ${head}`}
                                    >
                                      {head}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Credit / Jamma (Cash Received) */}
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

                        {/* Debit / Benaam (Cash Paid) */}
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
                <span>Credit/Jamma = Cash Received into Box | Debit/Benaam = Cash Paid out</span>
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
                <div
                  className="w-28 bg-white border border-black px-2.5 py-1.5 text-left font-mono font-bold text-[17px] text-emerald-800 tabular-nums"
                  dir="ltr"
                >
                  {totalCredit ? totalCredit.toLocaleString('en-PK') : '0'}
                </div>
                <div
                  className="w-28 bg-white border border-black px-2.5 py-1.5 text-left font-mono font-bold text-[17px] text-red-800 tabular-nums"
                  dir="ltr"
                >
                  {totalDebit ? totalDebit.toLocaleString('en-PK') : '0'}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-900">Account Balance</span>
                  <div
                    className="bg-[#0000FF] border border-black px-4 py-1.5 text-white font-mono font-bold text-[17px] min-w-[130px] text-center tabular-nums"
                    dir="ltr"
                  >
                    {activeBalanceDisplay}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">Current / Closing Balance</span>
                  <div
                    className={`border border-black px-4 py-1.5 font-mono font-bold text-[17px] min-w-[140px] text-left tabular-nums ${
                      currentClosingBalance < 0
                        ? 'bg-red-100 text-red-700 border-red-600'
                        : 'bg-[#76FF03] text-black'
                    }`}
                    dir="ltr"
                  >
                    {fmt(currentClosingBalance)}
                  </div>
                  {currentClosingBalance < 0 && (
                    <span className="text-xs font-bold text-red-700 bg-red-100 border border-red-400 px-2 py-1">
                      Cash is negative
                    </span>
                  )}
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
                    <th className="border border-black px-2.5 py-2 text-left text-sm font-bold" dir="ltr">
                      Cash
                    </th>
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
                      <td
                        className="border border-black px-2.5 py-1.5 text-left font-mono font-bold text-gray-900 tabular-nums"
                        dir="ltr"
                      >
                        {item.val ? item.val.toLocaleString('en-PK') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#DFDFDF] font-bold">
                    <td className="border border-black px-2.5 py-2 text-gray-900 text-base font-bold text-start">
                      Total
                    </td>
                    <td className="border border-black px-2 py-2 text-center font-mono text-[17px] font-bold tabular-nums">
                      {denominationValues.countSum || 0}
                    </td>
                    <td
                      className="border border-black px-2 py-2 text-left font-mono text-[17px] font-bold text-emerald-900 tabular-nums"
                      dir="ltr"
                    >
                      {denominationValues.valSum.toLocaleString('en-PK')}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Difference Box */}
              <div className="mt-3 pt-2 border-t border-black flex items-center justify-between text-sm">
                <span className="font-bold text-[#A52A2A]">Difference</span>
                <div
                  className={`border border-black px-3 py-1 font-mono font-bold text-sm min-w-[120px] text-center tabular-nums ${
                    Math.abs(cashDifference) < 0.001
                      ? 'bg-[#76FF03] text-black'
                      : 'bg-[#FFEBEE] text-[#B71C1C]'
                  }`}
                  dir="ltr"
                >
                  {Math.abs(cashDifference) < 0.001
                    ? 'Matched'
                    : `${fmt(Math.abs(cashDifference))} ${cashDifference < 0 ? 'Short' : 'Excess'}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Print-only Signatures & Audit Footer */}
        <div className="hidden print:block mt-6 pt-3 border-t border-black">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-6 print-note-text">
            <span>
              Printed on:{' '}
              <strong>
                {new Date().toLocaleDateString('en-GB')}{' '}
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </strong>
            </span>
            <span>
              Cash Book Voucher #<strong>{String(cashBookNo).padStart(4, '0')}</strong>
            </span>
            <span>
              System: <strong>Yaseen Merchants Offline Accounting</strong>
            </span>
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
            {/* Save or Update Button */}
            <button
              type="button"
              onClick={handleSaveOrUpdate}
              className={`px-3 h-10 flex items-center gap-2 border border-black transition-all cursor-pointer font-bold text-xs ${
                isSavedBook
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900'
              }`}
              title={isSavedBook ? 'Update Cash Book' : 'Save Cash Book'}
            >
              <Save className={`w-5 h-5 ${isSavedBook ? 'text-amber-800' : 'text-emerald-800'}`} />
              <span>{isSavedBook ? 'Update Cash Book' : 'Save Cash Book'}</span>
            </button>

            {/* Delete Cash Book (Only if saved) */}
            {isSavedBook && (
              <button
                type="button"
                onClick={() => setShowDeleteBookDialog(true)}
                className="px-3 h-10 flex items-center gap-1.5 border border-black bg-red-100 hover:bg-red-200 text-red-900 transition-all cursor-pointer font-bold text-xs"
                title="Delete Cash Book"
              >
                <Trash2 className="w-4 h-4 text-red-800" />
                <span>Delete Cash Book</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleNewCashBook()}
              className="w-10 h-10 flex items-center justify-center border border-black bg-blue-50 hover:bg-blue-100 text-blue-800 transition-all cursor-pointer"
              title="New Cash Book"
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
              title="Search Past Cash Book Records"
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

        {/* Delete Cash Book Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteBookDialog}
          title={`Delete Cash Book #${String(cashBookNo).padStart(4, '0')}?`}
          message="Are you sure you want to delete this Cash Book? This will reverse all effects on physical cash, party balances, and bank accounts, and permanently remove all rows in this book."
          confirmLabel="Delete Cash Book"
          onConfirm={handleDeleteBook}
          onCancel={() => setShowDeleteBookDialog(false)}
        />

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
                      (e.cashBookNo && String(e.cashBookNo).includes(voucherFilter)) ||
                      (e.partyName && e.partyName.toLowerCase().includes(voucherFilter.toLowerCase())) ||
                      (e.bankAccountName && e.bankAccountName.toLowerCase().includes(voucherFilter.toLowerCase())) ||
                      (e.description && e.description.toLowerCase().includes(voucherFilter.toLowerCase()))
                  )
                  .slice(0, 50)
                  .map((e) => (
                    <TR key={e.id}>
                      <TD mono className="font-bold text-black">
                        <div className="flex items-center gap-1.5">
                          <span>{e.cashBookNo ? `#${String(e.cashBookNo).padStart(4, '0')}` : e.refNo || '-'}</span>
                          {e.editCount > 0 && (
                            <span
                              className="px-1 py-0.2 bg-amber-100 text-amber-800 border border-amber-400 text-[9px] font-bold rounded-sm"
                              title={`Edited ${e.editCount} time(s). Last edited: ${
                                e.updatedAt ? formatDate(e.updatedAt) : 'Recently'
                              }`}
                            >
                              Edited
                            </span>
                          )}
                        </div>
                      </TD>
                      <TD>{formatDate(e.date)}</TD>
                      <TD className="font-semibold">{e.partyName || e.bankAccountName || e.accountName || '-'}</TD>
                      <TD className="text-gray-700">{e.description || '-'}</TD>
                      <TD mono right className="text-red-700 font-bold">
                        {e.debit ? fmt(e.debit) : '-'}
                      </TD>
                      <TD mono right className="text-emerald-800 font-bold">
                        {e.credit ? fmt(e.credit) : '-'}
                      </TD>
                      <TD className="no-print">
                        {e.cashBookNo ? (
                          <div className="flex items-center justify-end no-print">
                            <button
                              type="button"
                              onClick={() => {
                                setIsSearchModalOpen(false);
                                loadBook(Number(e.cashBookNo));
                              }}
                              className="h-9 min-h-[36px] px-3 bg-blue-50 border border-black hover:bg-blue-100 text-blue-900 text-xs font-bold flex items-center justify-center cursor-pointer"
                              title="Open this Cash Book in editor"
                            >
                              Open Book #{String(e.cashBookNo).padStart(4, '0')}
                            </button>
                          </div>
                        ) : e.linkedTransactionId ? (
                          <div className="flex items-center justify-end no-print">
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-500 border border-gray-300 text-xs rounded cursor-not-allowed"
                              title="Created by another voucher (Purchase, Sale, Journal, Expense, Issue). Edit from the original voucher."
                            >
                              <Lock className="w-3.5 h-3.5 text-gray-500" />
                              <span className="text-[11px] font-medium">Edit from original voucher</span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 no-print">
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
                              className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-amber-50 text-amber-700 cursor-pointer"
                              title="Edit Manual Cash Entry"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingEntryId(e.id)}
                              className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center p-1 border border-black bg-white hover:bg-red-50 text-red-700 cursor-pointer"
                              title="Delete Manual Cash Entry"
                            >
                              <Trash2 className="w-4 h-4" />
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
          title={`Editing Cash Book Entry — ${editingEntry?.cashBookNo ? '#' + String(editingEntry.cashBookNo).padStart(4, '0') : editingEntry?.refNo || editingEntry?.id?.slice(0, 8)}`}
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

        {/* Delete Individual Entry Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!deletingEntryId}
          title="Delete Cash Book Entry"
          message="This will reverse all its effects on parties, cash, and bank."
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

        {/* Edit Source Sale Invoice Modal */}
        <Modal
          isOpen={!!editingSale}
          onClose={() => setEditingSale(null)}
          title={editingSale ? `Edit Source Sale Invoice — ${editingSale.no}` : 'Edit Sale Invoice'}
          size="xl"
        >
          {editingSale && (
            <SaleForm
              customers={parties.filter((p) => p.type === 'Customer' || p.type === 'Both')}
              warehouses={warehouses}
              items={items}
              stockEntries={stockEntries}
              accounts={accounts}
              initialData={editingSale}
              onSubmit={async (data) => {
                await saleService.update(editingSale.id, data);
                showToast(`Sale invoice ${editingSale.no} updated successfully!`);
                setEditingSale(null);
              }}
              onCancel={() => setEditingSale(null)}
            />
          )}
        </Modal>

        {/* Edit Source Purchase Invoice Modal */}
        <Modal
          isOpen={!!editingPurchase}
          onClose={() => setEditingPurchase(null)}
          title={editingPurchase ? `Edit Source Purchase Invoice — ${editingPurchase.no}` : 'Edit Purchase Invoice'}
          maxWidth="max-w-3xl"
        >
          {editingPurchase && (
            <PurchaseForm
              suppliers={parties.filter((p) => p.type === 'Supplier' || p.type === 'Both')}
              warehouses={warehouses}
              items={items}
              initialData={editingPurchase}
              onSubmit={async (data) => {
                await purchaseService.update(editingPurchase.id, data);
                showToast(`Purchase invoice ${editingPurchase.no} updated successfully!`);
                setEditingPurchase(null);
              }}
              onCancel={() => setEditingPurchase(null)}
            />
          )}
        </Modal>
      </div>
    </div>
  );
}
