import React, { useState } from 'react';
import ClassicLedgerView from '../../components/common/ClassicLedgerView.jsx';
import { usePartyLedger } from '../../hooks/usePartyLedger.js';
import Button from '../../components/ui/Button.jsx';
import { X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PartyDetails({ party, onClose }) {
  if (!party) return null;
  const navigate = useNavigate();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { ledgerRows, openingBalance } = usePartyLedger(party.id);

  const getBadgeText = (p) => {
    if (!p) return 'پارٹی';
    if (p.type === 'Customer') return 'خریدار';
    if (p.type === 'Supplier') return 'سپلائر';
    return 'کھاتہ';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print border-b border-[#E0DBD3] pb-3">
        <div>
          <h3 className="text-base font-bold text-[#1E3A5F]">{party.name} — A/C Ledger</h3>
          <p className="text-xs text-gray-500">
            {party.type} | {party.city || 'No city'} | Phone: {party.phone || '-'}
            {party.balance !== undefined && (
              <span className="ms-2 font-mono font-bold text-gray-800" dir="ltr">
                | Balance: Rs. {Math.abs(Number(party.balance)).toLocaleString('en-US', { maximumFractionDigits: 2 })} {Number(party.balance) > 0 ? 'Cr' : Number(party.balance) < 0 ? 'Dr' : ''}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={ExternalLink}
            onClick={() => navigate(`/party-ledger?party=${party.id}`)}
          >
            Open Full Screen
          </Button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <ClassicLedgerView
        accountType={party.type || 'Customer'}
        acCode={party.code || party.id || '10051'}
        accountName={`${party.name} (${party.city || ''})`}
        urduName={party?.urduName || party?.nameUrdu}
        englishName={party?.name}
        phone={party?.phone}
        badgeText={getBadgeText(party)}
        rows={ledgerRows}
        openingBalance={openingBalance}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        mode="currency"
        unitLabel="Rs"
      />
    </div>
  );
}
