import React from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import { useParties } from '../../hooks/useParties.js';
import { fmt } from '../../utils/formatters.js';
import { splitPartyBalances } from '../../utils/partyBalances.js';
import { TrendingUp } from 'lucide-react';

export default function Receivable() {
  const { parties } = useParties();

  // Receivables single source of truth: balance < 0 (party owes us money, Naam / Debit)
  const { receivableParties: debtors, totalReceivable } = splitPartyBalances(parties);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts Receivable"
        subtitle="Outstanding payment debts due from buyers and customers (Naam / Debit accounts)"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Accounts Receivable"
          value={fmt(totalReceivable)}
          sub={`From ${debtors.length} account(s)`}
          icon={TrendingUp}
          color="text-emerald-600"
        />
      </div>

      <Table
        headers={['Party Name', 'Category', 'Party Side', 'City', 'Phone', 'Receivable Amount']}
        emptyText="No outstanding receivables."
      >
        {debtors.map((d) => (
          <TR key={d.id}>
            <TD className="font-bold text-[#1E3A5F]">{d.name}</TD>
            <TD><Badge variant="blue">{d.type}</Badge></TD>
            <TD><Badge variant="amber">بنام (Naam / Debit)</Badge></TD>
            <TD>{d.city || '-'}</TD>
            <TD className="num">{d.phone || '-'}</TD>
            <TD right className="num font-bold text-emerald-600">
              {fmt(Math.abs(d.balance))}
            </TD>
          </TR>
        ))}
      </Table>
    </div>
  );
}
