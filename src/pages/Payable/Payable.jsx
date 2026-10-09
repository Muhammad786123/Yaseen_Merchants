import React from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import { useParties } from '../../hooks/useParties.js';
import { fmt } from '../../utils/formatters.js';
import { splitPartyBalances } from '../../utils/partyBalances.js';
import { TrendingDown } from 'lucide-react';

export default function Payable() {
  const { parties } = useParties();

  // Payables single source of truth: balance > 0 (we owe the party money, Jama / Credit)
  const { payableParties: creditors, totalPayable } = splitPartyBalances(parties);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts Payable"
        subtitle="Outstanding raw material purchase debts owed to suppliers and vendors (Jama / Credit accounts)"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Accounts Payable"
          value={fmt(totalPayable)}
          sub={`Owed to ${creditors.length} account(s)`}
          icon={TrendingDown}
          color="text-red-600"
        />
      </div>

      <Table
        headers={['Party Name', 'Category', 'Party Side', 'City', 'Phone', 'Payable Owed']}
        emptyText="No outstanding payables."
      >
        {creditors.map((c) => (
          <TR key={c.id}>
            <TD className="font-bold text-[#1E3A5F]">{c.name}</TD>
            <TD><Badge variant="orange">{c.type}</Badge></TD>
            <TD><Badge variant="green">جمع (Jama / Credit)</Badge></TD>
            <TD>{c.city || '-'}</TD>
            <TD className="num">{c.phone || '-'}</TD>
            <TD right className="num font-bold text-red-600">
              {fmt(c.balance)}
            </TD>
          </TR>
        ))}
      </Table>
    </div>
  );
}
