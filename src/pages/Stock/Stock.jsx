import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Badge from '../../components/ui/Badge.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import { useStock } from '../../hooks/useStock.js';
import { fmt } from '../../utils/formatters.js';
import { Package, DollarSign } from 'lucide-react';

export default function Stock() {
  const { stockEntries } = useStock();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');

  const totalQty = stockEntries.reduce((sum, s) => sum + Number(s.qty || 0), 0);
  const totalVal = stockEntries.reduce((sum, s) => sum + Number(s.value || 0), 0);

  const filtered = stockEntries.filter((s) => {
    const matchSearch =
      s.itemName.toLowerCase().includes(search.toLowerCase()) ||
      s.quality.toLowerCase().includes(search.toLowerCase()) ||
      s.warehouseName.toLowerCase().includes(search.toLowerCase());

    const matchCat = filterCat === 'All' || s.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Inventory Status"
        subtitle="Current warehouse inventory levels, average rates, and total stock valuations"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Inventory Volume"
          value={`${totalQty.toLocaleString('en-PK')} KG`}
          sub="Across all warehouses"
          icon={Package}
        />
        <StatCard
          label="Total Stock Valuation"
          value={fmt(totalVal)}
          sub="Based on average purchase costs"
          icon={DollarSign}
          color="text-emerald-600"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E0DBD3]">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by item, quality grade or warehouse..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-1 bg-[#F5F4F0] p-1 rounded-lg">
          {['All', 'Raw Material', 'Finished Product'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filterCat === cat
                  ? 'bg-white text-[#1E3A5F] shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <Table
        headers={['Item Name', 'Category', 'Quality Grade', 'Warehouse Store', 'Qty (KG)', 'Avg Rate', 'Total Value']}
        emptyText="No stock entries found."
      >
        {filtered.map((s) => (
          <TR key={s.id}>
            <TD className="font-bold text-[#1E3A5F]">{s.itemName}</TD>
            <TD>
              <Badge variant={s.category === 'Raw Material' ? 'orange' : 'green'}>
                {s.category}
              </Badge>
            </TD>
            <TD>
              <Badge variant="gray">{s.quality}</Badge>
            </TD>
            <TD>{s.warehouseName}</TD>
            <TD mono right className="font-bold text-gray-900">{s.qty}</TD>
            <TD mono right>{fmt(s.avgRate)}</TD>
            <TD mono right className="font-bold text-[#1E3A5F]">{fmt(s.value)}</TD>
          </TR>
        ))}
      </Table>
    </div>
  );
}
