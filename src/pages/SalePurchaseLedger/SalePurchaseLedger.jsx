import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Select from '../../components/ui/Select.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import { salePurchaseService } from '../../services/salePurchaseService.js';
import { usePurchases } from '../../hooks/usePurchases.js';
import { useSales } from '../../hooks/useSales.js';
import { useFinances } from '../../hooks/useFinances.js';
import { fmt, formatDate } from '../../utils/formatters.js';
import { TrendingUp, TrendingDown, Scale, MinusCircle } from 'lucide-react';

export default function SalePurchaseLedger() {
  const { purchases } = usePurchases();
  const { sales } = useSales();
  const { expenses } = useFinances();

  const [ledger, setLedger] = useState([]);
  const [summary, setSummary] = useState({ totalSales: 0, totalPurchases: 0, totalExpenses: 0, netBalance: 0 });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    async function load() {
      const data = await salePurchaseService.getLedger();
      const sum = await salePurchaseService.getSummary();
      setLedger(data);
      setSummary(sum);
    }
    load();
  }, [purchases, sales, expenses]);

  const filtered = ledger.filter((item) => {
    const matchSearch =
      item.no.toLowerCase().includes(search.toLowerCase()) ||
      item.partyName.toLowerCase().includes(search.toLowerCase()) ||
      item.type.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));

    const matchCategory =
      categoryFilter === 'ALL' ||
      (categoryFilter === 'PURCHASE' && item.category === 'Purchase') ||
      (categoryFilter === 'SALE' && item.category === 'Sale') ||
      (categoryFilter === 'EXPENSE' && item.category !== 'Purchase' && item.category !== 'Sale');

    const matchFrom = !dateFrom || item.date >= dateFrom;
    const matchTo = !dateTo || item.date <= dateTo;

    return matchSearch && matchCategory && matchFrom && matchTo;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sale Purchase A/C (Mall A/C)"
        subtitle="Single controlling account for Goods Purchases (Mal Kharid), Goods Sales (Mal Farokht), and Operating Expenses"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Purchases (Mal Kharid)"
          value={fmt(summary.totalPurchases)}
          sub="Goods Inward Cost"
          icon={TrendingDown}
          color="text-red-600"
        />
        <StatCard
          label="Total Sales (Mal Farokht)"
          value={fmt(summary.totalSales)}
          sub="Goods & Services Revenue"
          icon={TrendingUp}
          color="text-emerald-600"
        />
        <StatCard
          label="Total Operating Expenses"
          value={fmt(summary.totalExpenses)}
          sub="Labour, Utilities, Rent, etc."
          icon={MinusCircle}
          color="text-amber-600"
        />
        <StatCard
          label="Mall A/C Net Position"
          value={fmt(summary.netBalance)}
          sub="Sales − Purchases − Expenses"
          icon={Scale}
          color={summary.netBalance >= 0 ? 'text-[#1E3A5F]' : 'text-red-600'}
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E0DBD3]">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search invoice #, party, category..."
            className="w-full sm:w-72"
          />
          <div className="w-48">
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'ALL', label: 'All Transactions' },
                { value: 'PURCHASE', label: 'Purchases (Mal Kharid)' },
                { value: 'SALE', label: 'Sales (Mal Farokht)' },
                { value: 'EXPENSE', label: 'Operating Expenses' },
              ]}
            />
          </div>
        </div>

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
          {(dateFrom || dateTo || categoryFilter !== 'ALL') && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setCategoryFilter('ALL');
              }}
              className="text-xs text-red-600 underline font-semibold hover:text-red-800"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <Table
        headers={[
          'Date',
          'Voucher / Ref #',
          'Transaction Type / Category',
          'Party / Description',
          'Debit (Purchases & Expenses)',
          'Credit (Sales Revenue)',
          'Mall A/C Balance',
        ]}
        emptyText="No transactions posted to Sale Purchase A/C (Mall A/C)."
      >
        {filtered.map((r, idx) => {
          let badgeVariant = 'orange';
          if (r.category === 'Sale') badgeVariant = 'green';
          else if (r.category === 'Purchase') badgeVariant = 'orange';
          else badgeVariant = 'amber';

          return (
            <TR key={idx}>
              <TD>{formatDate(r.date)}</TD>
              <TD mono className="font-bold text-[#1E3A5F]">
                {r.no}
              </TD>
              <TD>
                <Badge variant={badgeVariant}>{r.type}</Badge>
              </TD>
              <TD>
                <div className="font-semibold text-gray-900">{r.partyName}</div>
                <div className="text-xs text-gray-500 truncate max-w-xs">{r.description || '-'}</div>
              </TD>
              <TD mono right className="text-red-600 font-bold">
                {r.debit > 0 ? fmt(r.debit) : '-'}
              </TD>
              <TD mono right className="text-emerald-600 font-bold">
                {r.credit > 0 ? fmt(r.credit) : '-'}
              </TD>
              <TD mono right className="font-extrabold text-[#1E3A5F]">
                {fmt(r.balance)}
              </TD>
            </TR>
          );
        })}
      </Table>
    </div>
  );
}

