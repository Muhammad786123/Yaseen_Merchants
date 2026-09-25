import React from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import { useParties } from '../../hooks/useParties.js';
import { fmt } from '../../utils/formatters.js';
import { TrendingUp } from 'lucide-react';

export default function Receivable() {
  const { parties } = useParties();

  // Receivables are customers or parties with negative balance (meaning customer owes us) or positive receivable balance
  const debtors = parties.filter((p) => p.balance < 0 || (p.type === 'Customer' && p.balance !== 0));

  const totalReceivable = debtors.reduce((sum, p) => sum + Math.abs(Number(p.balance || 0)), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts Receivable"
        subtitle="Outstanding payment debts due from buyers and customers"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Accounts Receivable"
          value={fmt(totalReceivable)}
          sub={`From ${debtors.length} customer account(s)`}
          icon={TrendingUp}
          color="text-emerald-600"
        />
      </div>

      <Table
        headers={['Customer Name', 'Category', 'City', 'Phone', 'Receivable Amount']}
        emptyText="No outstanding customer receivables."
      >
        {debtors.map((d) => (
          <TR key={d.id}>
            <TD className="font-bold text-[#1E3A5F]">{d.name}</TD>
            <TD><Badge variant="blue">{d.type}</Badge></TD>
            <TD>{d.city || '-'}</TD>
            <TD mono>{d.phone || '-'}</TD>
            <TD mono right className="font-bold text-emerald-600">
              {fmt(Math.abs(d.balance))}
            </TD>
          </TR>
        ))}
      </Table>
    </div>
  );
}
