import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import ClassicLedgerView from '../../components/common/ClassicLedgerView.jsx';
import Select from '../../components/ui/Select.jsx';
import { useParties } from '../../hooks/useParties.js';
import { usePartyLedger } from '../../hooks/usePartyLedger.js';
import { useNavigate } from 'react-router-dom';

export default function PartyLedger() {
  const navigate = useNavigate();
  const { parties } = useParties();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const [selectedPartyId, setSelectedPartyId] = useState(searchParams?.get('party') || parties[0]?.id || 'p1');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { selectedParty, ledgerRows, openingBalance } = usePartyLedger(selectedPartyId);

  const getBadgeText = (p) => {
    if (!p) return 'پارٹی';
    if (p.type === 'Customer') return 'خریدار';
    if (p.type === 'Supplier') return 'سپلائر';
    return 'کھاتہ';
  };

  const handleRowClick = (row) => {
    if (!row) return;
    const bill = (row.billNo || '').toLowerCase();
    const type = (row.type || '').toLowerCase();
    if (bill.startsWith('pur') || type.includes('purchase')) {
      navigate('/purchase');
    } else if (bill.startsWith('sal') || bill.startsWith('sv') || type.includes('sale')) {
      navigate('/sale');
    } else if (bill.startsWith('iss') || type.includes('issue')) {
      navigate('/issue');
    } else if (bill.startsWith('cb') || type.includes('cash')) {
      navigate('/cash-book');
    } else if (bill.startsWith('rct') || type.includes('receipt')) {
      navigate('/receipt');
    } else if (bill.startsWith('pay') || type.includes('payment')) {
      navigate('/payment');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Party Statement & Ledger"
        subtitle="Traditional bordered PERBALACC-style account ledger for customers and suppliers"
      />

      <ClassicLedgerView
        accountType={selectedParty?.type || 'Customer'}
        acCode={selectedParty?.code || selectedParty?.id || '10051'}
        accountName={selectedParty ? `${selectedParty.name} (${selectedParty.city || ''})` : ''}
        badgeText={getBadgeText(selectedParty)}
        rows={ledgerRows}
        openingBalance={openingBalance}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        onRowClick={handleRowClick}
        mode="currency"
        unitLabel="Rs"
        entitySelector={
          <div className="w-full sm:w-80">
            <Select
              label="Select Party Account"
              value={selectedPartyId}
              onChange={(val) => {
                setSelectedPartyId(val);
                navigate(`/party-ledger?party=${val}`, { replace: true });
              }}
              options={parties.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.type} - ${p.city || ''})`,
              }))}
            />
          </div>
        }
      />
    </div>
  );
}



