import React from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import { useParties } from '../../hooks/useParties.js';
import { fmt } from '../../utils/formatters.js';
import { TrendingDown } from 'lucide-react';

export default function Payable() {
  const { parties } = useParties();

  // Payables are suppliers or parties with positive balance owed by us
  const creditors = parties.filter((p) => p.balance > 0 && p.type !== 'Customer');

  const totalPayable = creditors.reduce((sum, p) => sum + Number(p.balance || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts Payable"
        subtitle="Outstanding raw material purchase debts owed to suppliers and vendors"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Accounts Payable"
          value={fmt(totalPayable)}
          sub={`Owed to ${creditors.length} supplier(s)`}
          icon={TrendingDown}
          color="text-red-600"
        />
      </div>

      <Table
        headers={['Supplier Name', 'Category', 'City', 'Phone', 'Payable Owed']}
        emptyText="No outstanding supplier payables."
      >
        {creditors.map((c) => (
          <TR key={c.id}>
            <TD className="font-bold text-[#1E3A5F]">{c.name}</TD>
            <TD><Badge variant="orange">{c.type}</Badge></TD>
            <TD>{c.city || '-'}</TD>
            <TD mono>{c.phone || '-'}</TD>
            <TD mono right className="font-bold text-red-600">
              {fmt(c.balance)}
            </TD>
          </TR>
        ))}
      </Table>
    </div>
  );
}
