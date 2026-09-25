import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { usePurchases } from '../../hooks/usePurchases.js';
import { useSales } from '../../hooks/useSales.js';
import { useStock } from '../../hooks/useStock.js';
import { useProductions } from '../../hooks/useProductions.js';
import { useFinances } from '../../hooks/useFinances.js';
import { useParties } from '../../hooks/useParties.js';
import { capitalService } from '../../services/capitalService.js';
import { fmt, formatDate } from '../../utils/formatters.js';
import { CheckCircle, AlertTriangle, Plus, DollarSign } from 'lucide-react';

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'purchase';

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('2026-09-01');
  const [dateTo, setDateTo] = useState('2026-09-30');

  // Modal for Capital injection / withdrawal
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
  const [capType, setCapType] = useState('Add');
  const [capAmount, setCapAmount] = useState(50000);
  const [capDesc, setCapDesc] = useState('Owner Capital Injection');
  const [capitalBalance, setCapitalBalance] = useState(500000);

  const { purchases } = usePurchases();
  const { sales } = useSales();
  const { stockEntries } = useStock();
  const { productions } = useProductions();
  const { expenses, accounts } = useFinances();
  const { parties } = useParties();

  const cashBookEntries = useLiveQuery(() => db.cashBookEntries.toArray(), []) || [];
  const capitalEntries = useLiveQuery(() => db.capitalEntries?.toArray() || [], []) || [];

  useEffect(() => {
    async function loadCapital() {
      const bal = await capitalService.getBalance();
      setCapitalBalance(bal);
    }
    loadCapital();
  }, [capitalEntries]);

  const tabs = [
    { id: 'purchase', label: 'Purchase Report' },
    { id: 'sale', label: 'Sale Report' },
    { id: 'stock', label: 'Stock Valuation' },
    { id: 'production', label: 'Production Yield' },
    { id: 'tb', label: 'Trial Balance' },
    { id: 'pl', label: 'P&L & Balance Sheet' },
  ];

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const handleCapitalSubmit = async (e) => {
    e.preventDefault();
    await capitalService.addEntry({
      type: capType,
      amount: Number(capAmount),
      description: capDesc,
    });
    const updated = await capitalService.getBalance();
    setCapitalBalance(updated);
    setIsCapitalModalOpen(false);
  };

  // Reusable calculations from live data sources
  const totalSales = sales.reduce((a, b) => a + Number(b.total || 0), 0);
  const totalPurchases = purchases.reduce((a, b) => a + Number(b.total || 0), 0);
  const stockValuation = stockEntries.reduce((a, b) => a + Number(b.value || 0), 0);
  const totalExpenses = expenses.reduce((a, b) => a + Number(b.amount || 0), 0);

  // Mall A/C Net Trading Position (Sales - Purchases - Expenses)
  const mallNetPosition = totalSales - (totalPurchases + totalExpenses);

  // Customer Receivables (party balance < 0, customer owes us)
  const receivableParties = parties.filter((p) => Number(p.balance || 0) < 0);
  const totalReceivables = receivableParties.reduce((sum, p) => sum + Math.abs(Number(p.balance || 0)), 0);

  // Supplier Payables (party balance > 0, we owe supplier)
  const payableParties = parties.filter((p) => Number(p.balance || 0) > 0);
  const totalPayables = payableParties.reduce((sum, p) => sum + Number(p.balance || 0), 0);

  // Cash in Hand (from latest cashBook entry or cash account)
  const latestCashEntry = cashBookEntries[cashBookEntries.length - 1];
  const cashInHand = latestCashEntry
    ? Number(latestCashEntry.balance || 0)
    : Number(accounts.find((a) => a.name === 'Cash')?.balance || 0);

  // Bank Balances (excluding Cash)
  const bankAccounts = accounts.filter((a) => a.name !== 'Cash');
  const totalBankBalances = bankAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  // Balance Sheet Totals
  const grossProfit = totalSales + stockValuation - totalPurchases;
  const netProfit = grossProfit - totalExpenses; // Equals mallNetPosition + stockValuation

  const totalAssets = cashInHand + totalBankBalances + totalReceivables + stockValuation;
  const totalLiabilitiesEquity = totalPayables + capitalBalance + netProfit;

  const isEquationBalanced = Math.abs(totalAssets - totalLiabilitiesEquity) < 1;
  const equationDiff = Math.abs(totalAssets - totalLiabilitiesEquity);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Reports & Financial Analytics"
        subtitle="Comprehensive financial statements, trial balance, stock valuation, and yield summaries"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={Plus} onClick={() => setIsCapitalModalOpen(true)}>
              Owner Capital
            </Button>
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              Print Statement
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1.5 rounded-xl border border-[#E0DBD3] overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
              activeTab === t.id
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-gray-600 hover:bg-[#F5F4F0]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Date & Search Controls for Reports */}
      {activeTab !== 'pl' && activeTab !== 'tb' && activeTab !== 'stock' && (
        <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-[#E0DBD3]">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-[#E0DBD3] rounded-lg outline-none focus:border-[#1E3A5F]"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 border border-[#E0DBD3] rounded-lg outline-none focus:border-[#1E3A5F]"
            />
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Filter records..." />
        </div>
      )}

      {/* Purchase Report */}
      {activeTab === 'purchase' && (
        <Card>
          <Table headers={['Date', 'Invoice #', 'Supplier', 'Items', 'Qty (KG)', 'Total Amount']}>
            {purchases
              .filter(
                (p) =>
                  (p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
                    p.no.toLowerCase().includes(search.toLowerCase())) &&
                  (!dateFrom || p.date >= dateFrom) &&
                  (!dateTo || p.date <= dateTo)
              )
              .map((p) => (
                <TR key={p.id}>
                  <TD>{p.date}</TD>
                  <TD mono className="font-bold text-[#1E3A5F]">{p.no}</TD>
                  <TD>{p.supplierName}</TD>
                  <TD>{p.items?.map((i) => i.itemName).join(', ') || '-'}</TD>
                  <TD mono right>{p.items?.reduce((a, b) => a + Number(b.qty || 0), 0)}</TD>
                  <TD mono right className="font-bold text-[#1E3A5F]">{fmt(p.total)}</TD>
                </TR>
              ))}
          </Table>
          <div className="p-4 border-t border-[#E0DBD3] flex justify-end text-sm">
            <span className="text-gray-500">
              Total Purchases Value:{' '}
              <span className="font-bold text-[#1E3A5F]">
                {fmt(purchases.reduce((a, b) => a + Number(b.total || 0), 0))}
              </span>
            </span>
          </div>
        </Card>
      )}

      {/* Sale Report */}
      {activeTab === 'sale' && (
        <Card>
          <Table headers={['Date', 'Invoice #', 'Customer', 'Products', 'Qty (KG)', 'Total Amount']}>
            {sales
              .filter(
                (s) =>
                  (s.customerName.toLowerCase().includes(search.toLowerCase()) ||
                    s.no.toLowerCase().includes(search.toLowerCase())) &&
                  (!dateFrom || s.date >= dateFrom) &&
                  (!dateTo || s.date <= dateTo)
              )
              .map((s) => (
                <TR key={s.id}>
                  <TD>{s.date}</TD>
                  <TD mono className="font-bold text-[#1E3A5F]">{s.no}</TD>
                  <TD>{s.customerName}</TD>
                  <TD>{s.items?.map((i) => i.itemName).join(', ') || '-'}</TD>
                  <TD mono right>{s.items?.reduce((a, b) => a + Number(b.qty || 0), 0)}</TD>
                  <TD mono right className="font-bold text-emerald-600">{fmt(s.total)}</TD>
                </TR>
              ))}
          </Table>
          <div className="p-4 border-t border-[#E0DBD3] flex justify-end text-sm">
            <span className="text-gray-500">
              Total Sales Value:{' '}
              <span className="font-bold text-emerald-600">
                {fmt(sales.reduce((a, b) => a + Number(b.total || 0), 0))}
              </span>
            </span>
          </div>
        </Card>
      )}

      {/* Stock Report */}
      {activeTab === 'stock' && (
        <Card>
          <div className="p-4 border-b border-[#E0DBD3]">
            <SearchInput value={search} onChange={setSearch} placeholder="Filter stock items..." />
          </div>
          <Table headers={['Item', 'Quality Grade', 'Warehouse', 'Qty (KG)', 'Avg Rate', 'Value']}>
            {stockEntries
              .filter((s) => s.itemName.toLowerCase().includes(search.toLowerCase()))
              .map((s, idx) => (
                <TR key={idx}>
                  <TD className="font-bold text-[#1E3A5F]">{s.itemName}</TD>
                  <TD>{s.quality}</TD>
                  <TD>{s.warehouseName}</TD>
                  <TD mono right className="font-semibold">{s.qty.toLocaleString()}</TD>
                  <TD mono right>{fmt(s.avgRate)}</TD>
                  <TD mono right className="font-bold text-[#1E3A5F]">{fmt(s.value)}</TD>
                </TR>
              ))}
          </Table>
          <div className="p-4 border-t border-[#E0DBD3] flex justify-end text-sm">
            <span className="text-gray-500">
              Total Inventory Valuation:{' '}
              <span className="font-bold text-[#1E3A5F]">{fmt(stockValuation)}</span>
            </span>
          </div>
        </Card>
      )}

      {/* Production Yield Report */}
      {activeTab === 'production' && (
        <Card>
          <Table headers={['Date', 'Production #', 'Product', 'Input (KG)', 'Output (KG)', 'Waste Loss (KG)', 'Yield %']}>
            {productions
              .filter(
                (p) =>
                  p.product.toLowerCase().includes(search.toLowerCase()) &&
                  (!dateFrom || p.date >= dateFrom) &&
                  (!dateTo || p.date <= dateTo)
              )
              .map((p) => (
                <TR key={p.id}>
                  <TD>{p.date}</TD>
                  <TD mono className="font-bold text-[#1E3A5F]">{p.no}</TD>
                  <TD>{p.product}</TD>
                  <TD mono right>{p.totalInput}</TD>
                  <TD mono right className="text-emerald-600 font-bold">{p.outputQty}</TD>
                  <TD mono right className="text-red-500">{p.wasteQty}</TD>
                  <TD mono right>
                    <Badge variant="green">{p.yieldPct}%</Badge>
                  </TD>
                </TR>
              ))}
          </Table>
        </Card>
      )}

      {/* Trial Balance Report */}
      {activeTab === 'tb' && (
        <Card>
          <div className="p-4 border-b border-[#E0DBD3] flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-base font-bold text-[#1E3A5F]">Trial Balance Statement</h3>
              <p className="text-xs text-gray-500">
                Internal accounting consistency check derived directly from live ledger balances
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isEquationBalanced ? 'green' : 'red'}>
                {isEquationBalanced ? '✓ Trial Balance Equal' : `⚠ Unbalanced by ${fmt(equationDiff)}`}
              </Badge>
            </div>
          </div>

          <Table headers={['Account Name / Category', 'Account Type', 'Debit Balance (PKR)', 'Credit Balance (PKR)']}>
            {/* 1. Cash in Hand */}
            <TR>
              <TD className="font-bold text-gray-900">Cash in Hand (Cash Book)</TD>
              <TD><Badge variant="blue">Liquid Cash</Badge></TD>
              <TD mono right className="font-bold text-[#1E3A5F]">{fmt(cashInHand)}</TD>
              <TD mono right className="text-gray-400">-</TD>
            </TR>

            {/* 2. Bank Accounts */}
            {bankAccounts.map((b) => (
              <TR key={b.id}>
                <TD className="font-semibold text-gray-900">{b.name} (Bank A/C)</TD>
                <TD><Badge variant="blue">Bank Asset</Badge></TD>
                <TD mono right className="font-bold text-[#1E3A5F]">{fmt(b.balance)}</TD>
                <TD mono right className="text-gray-400">-</TD>
              </TR>
            ))}

            {/* 3. Accounts Receivable (Customers) */}
            <TR>
              <TD className="font-semibold text-gray-900">Accounts Receivable (Customers)</TD>
              <TD><Badge variant="amber">Asset Receivable</Badge></TD>
              <TD mono right className="font-bold text-[#1E3A5F]">{fmt(totalReceivables)}</TD>
              <TD mono right className="text-gray-400">-</TD>
            </TR>

            {/* 4. Stock Inventory Valuation */}
            <TR>
              <TD className="font-semibold text-gray-900">Stock Inventory Valuation</TD>
              <TD><Badge variant="green">Stock Asset</Badge></TD>
              <TD mono right className="font-bold text-[#1E3A5F]">{fmt(stockValuation)}</TD>
              <TD mono right className="text-gray-400">-</TD>
            </TR>

            {/* 5. Accounts Payable (Suppliers) */}
            <TR>
              <TD className="font-semibold text-gray-900">Accounts Payable (Suppliers)</TD>
              <TD><Badge variant="orange">Liability Payable</Badge></TD>
              <TD mono right className="text-gray-400">-</TD>
              <TD mono right className="font-bold text-red-600">{fmt(totalPayables)}</TD>
            </TR>

            {/* 6. Owner Capital Investment */}
            <TR>
              <TD className="font-semibold text-gray-900">Investment A/C (Owner's Capital)</TD>
              <TD><Badge variant="green">Capital Equity</Badge></TD>
              <TD mono right className="text-gray-400">-</TD>
              <TD mono right className="font-bold text-emerald-700">{fmt(capitalBalance)}</TD>
            </TR>

            {/* 7. Sale Purchase A/C (Mall A/C) - Balancing Entry */}
            <TR>
              <TD className="font-bold text-[#1E3A5F]">Sale Purchase A/C (Mall A/C Net Trading Position)</TD>
              <TD><Badge variant="purple">Trading Control</Badge></TD>
              <TD mono right className={mallNetPosition < 0 ? 'font-bold text-[#1E3A5F]' : 'text-gray-400'}>
                {mallNetPosition < 0 ? fmt(Math.abs(mallNetPosition)) : '-'}
              </TD>
              <TD mono right className={mallNetPosition >= 0 ? 'font-bold text-emerald-700' : 'text-gray-400'}>
                {mallNetPosition >= 0 ? fmt(mallNetPosition) : '-'}
              </TD>
            </TR>
          </Table>

          {/* Trial Balance Totals Footer */}
          {(() => {
            const sumDebits = cashInHand + totalBankBalances + totalReceivables + stockValuation + (mallNetPosition < 0 ? Math.abs(mallNetPosition) : 0);
            const sumCredits = totalPayables + capitalBalance + (mallNetPosition >= 0 ? mallNetPosition : 0);

            return (
              <div className="p-4 bg-[#F8FAFC] border-t-2 border-[#1E3A5F] flex flex-wrap justify-between items-center text-sm font-bold">
                <span className="text-[#1E3A5F]">Trial Balance Column Totals:</span>
                <div className="flex gap-8">
                  <span>
                    Total Debits: <span className="text-[#1E3A5F]">{fmt(sumDebits)}</span>
                  </span>
                  <span>
                    Total Credits: <span className="text-emerald-700">{fmt(sumCredits)}</span>
                  </span>
                </div>
              </div>
            );
          })()}
        </Card>
      )}

      {/* Profit & Loss & Balance Sheet Statement */}
      {activeTab === 'pl' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Part 1: Profit & Loss Statement */}
          <Card>
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#1E3A5F] border-b border-[#E0DBD3] pb-3">
                Profit & Loss Trading Statement
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-[#F0EDE8]">
                  <span className="font-semibold text-emerald-700">Total Sales Revenue (Mal Farokht)</span>
                  <span className="font-bold text-emerald-700">{fmt(totalSales)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#F0EDE8]">
                  <span className="font-semibold text-[#1E3A5F]">Add: Closing Stock Inventory Valuation</span>
                  <span className="font-bold text-[#1E3A5F]">{fmt(stockValuation)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#F0EDE8]">
                  <span className="text-red-500">Less: Goods Purchases (Mal Kharid)</span>
                  <span className="text-red-500">({fmt(totalPurchases)})</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#E0DBD3] font-bold text-[#1E3A5F]">
                  <span>Gross Trading Surplus</span>
                  <span className={grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}>{fmt(grossProfit)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#F0EDE8]">
                  <span className="text-red-500">Less: Total Operating Expenses</span>
                  <span className="text-red-500">({fmt(totalExpenses)})</span>
                </div>
                <div
                  className={`flex justify-between p-4 rounded-xl font-bold text-base ${
                    netProfit >= 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <span>Net Business Profit / (Loss)</span>
                  <span>{fmt(netProfit)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Part 2: Balance Sheet & Accounting Consistency Check */}
          <Card>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#E0DBD3] pb-3">
                <h3 className="text-base font-bold text-[#1E3A5F]">Balance Sheet Statement</h3>
                <div className="flex items-center gap-1 text-xs">
                  {isEquationBalanced ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> ✓ Balanced
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> ⚠ Unbalanced ({fmt(equationDiff)})
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4 text-sm">
                {/* Assets Column */}
                <div>
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Assets</h4>
                  <div className="space-y-2 pl-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cash in Hand</span>
                      <span className="font-semibold text-gray-900">{fmt(cashInHand)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bank Accounts Balance</span>
                      <span className="font-semibold text-gray-900">{fmt(totalBankBalances)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Accounts Receivable (Customers)</span>
                      <span className="font-semibold text-gray-900">{fmt(totalReceivables)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stock Inventory Valuation</span>
                      <span className="font-semibold text-gray-900">{fmt(stockValuation)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#E0DBD3] font-bold text-[#1E3A5F]">
                      <span>Total Assets</span>
                      <span className="text-[#1E3A5F]">{fmt(totalAssets)}</span>
                    </div>
                  </div>
                </div>

                {/* Liabilities & Equity Column */}
                <div className="pt-2 border-t border-[#E0DBD3]">
                  <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-2">Liabilities & Capital</h4>
                  <div className="space-y-2 pl-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Accounts Payable (Suppliers)</span>
                      <span className="font-semibold text-gray-900">{fmt(totalPayables)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Owner Capital Investment</span>
                      <span className="font-semibold text-gray-900">{fmt(capitalBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Net Business Profit</span>
                      <span className="font-semibold text-emerald-700">{fmt(netProfit)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[#E0DBD3] font-bold text-[#1E3A5F]">
                      <span>Total Liabilities & Equity</span>
                      <span className="text-[#1E3A5F]">{fmt(totalLiabilitiesEquity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal for Capital Entry */}
      <Modal
        isOpen={isCapitalModalOpen}
        onClose={() => setIsCapitalModalOpen(false)}
        title="Manage Investment / Owner's Capital A/C"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCapitalSubmit} className="space-y-4">
          <Select
            label="Transaction Type"
            value={capType}
            onChange={setCapType}
            options={[
              { value: 'Add', label: 'Add Capital (Owner Injection)' },
              { value: 'Withdraw', label: 'Withdraw Capital (Owner Drawing)' },
            ]}
          />
          <Input
            label="Amount (PKR)"
            type="number"
            value={capAmount}
            onChange={setCapAmount}
            required
          />
          <Input
            label="Description / Note"
            value={capDesc}
            onChange={setCapDesc}
            placeholder="e.g. Owner fresh capital deposit"
            required
          />

          <div className="p-3 bg-[#FAF9F7] rounded-lg border border-[#E0DBD3] flex justify-between items-center text-xs">
            <span className="text-gray-600">Current Capital Balance:</span>
            <span className="font-bold text-emerald-700">{fmt(capitalBalance)}</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
            <Button variant="secondary" onClick={() => setIsCapitalModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Capital Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
