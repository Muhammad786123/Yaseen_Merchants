import React, { useState } from 'react';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import PrintHeader from '../../components/common/PrintHeader.jsx';
import UrduPartyStatement from '../../components/common/UrduPartyStatement.jsx';
import PrintFooter from '../../components/common/PrintFooter.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import { usePartyLedger } from '../../hooks/usePartyLedger.js';
import { fmt, fmtNum, formatDate } from '../../utils/formatters.js';
import { Phone, MapPin, Printer } from 'lucide-react';

export default function PartyDetails({ party, onClose }) {
  if (!party) return null;

  const [viewMode, setViewMode] = useState('english'); // 'english' | 'urdu'
  const { ledgerRows, openingBalance } = usePartyLedger(party.id);

  // Compute summary totals for English statement & footer
  const totalDebit = ledgerRows.reduce((sum, r) => sum + Number(r.debit || 0), 0);
  const totalCredit = ledgerRows.reduce((sum, r) => sum + Number(r.credit || 0), 0);
  const totalQty = ledgerRows.reduce(
    (sum, r) => sum + (typeof r.quantity === 'number' ? r.quantity : (Number(r.quantity) || 0)),
    0
  );
  const totalWeight = ledgerRows.reduce(
    (sum, r) => sum + (typeof r.weight === 'number' ? r.weight : (Number(r.weight) || 0)),
    0
  );
  const closingBalance =
    ledgerRows.length > 0
      ? Number(ledgerRows[ledgerRows.length - 1].balance || 0)
      : openingBalance;

  const handlePrint = (mode) => {
    setViewMode(mode);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div id="party-details-print-area" className="print-area space-y-6">
      <div className="flex items-center justify-between no-print">
        <h3 className="text-base font-bold text-[#1E3A5F]">Party Account Details</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Printer}
            onClick={() => handlePrint('english')}
          >
            Print English
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Printer}
            onClick={() => handlePrint('urdu')}
          >
            پرنٹ (Urdu)
          </Button>
        </div>
      </div>

      {viewMode === 'urdu' ? (
        <UrduPartyStatement
          party={party}
          ledgerRows={ledgerRows}
          openingBalance={openingBalance}
        />
      ) : (
        <>
          <PrintHeader
            documentTitle="PARTY STATEMENT OF ACCOUNT"
            partyName={`${party.name} (${party.city || ''})`}
            subtitle="Complete ledger audit statement reflecting purchases, sales, settlements, and physical cash movements"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF9F7] p-4 rounded-xl border border-[#E0DBD3]">
            <div className="space-y-2">
              <div className="text-xs text-gray-500 font-medium">Party Category</div>
              <div>
                <Badge
                  variant={
                    party.type === 'Supplier'
                      ? 'orange'
                      : party.type === 'Customer'
                      ? 'blue'
                      : 'purple'
                  }
                >
                  {party.type}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{party.phone || 'No phone provided'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{party.city || 'No city provided'}</span>
              </div>
            </div>

            <div className="space-y-3 bg-white p-3 rounded-lg border border-[#E0DBD3]">
              <div>
                <div className="text-xs text-gray-500">Opening Balance</div>
                <div className="text-sm font-semibold text-gray-800">
                  {fmt(party.openingBalance || 0)}
                </div>
              </div>
              <div className="pt-2 border-t border-[#E0DBD3]">
                <div className="text-xs text-gray-500">Current Ledger Balance</div>
                <div
                  className={`text-lg font-bold ${
                    party.balance > 0
                      ? 'text-red-600'
                      : party.balance < 0
                      ? 'text-emerald-600'
                      : 'text-gray-800'
                  }`}
                >
                  {fmt(party.balance || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* 9-Column Party Statement Table */}
          <div className="space-y-3">
            <Table
              headers={[
                'Date',
                'Detail',
                'Bill No.',
                'Quantity',
                'Weight',
                'Rate',
                'Debit (Dr)',
                'Credit (Cr)',
                'Balance',
              ]}
              emptyText="No ledger transactions recorded for this party."
            >
              <TR highlight>
                <TD>-</TD>
                <TD className="font-medium text-gray-700">Opening Balance — Initial record</TD>
                <TD mono>-</TD>
                <TD mono right>-</TD>
                <TD mono right>-</TD>
                <TD mono right>-</TD>
                <TD mono right>-</TD>
                <TD mono right>-</TD>
                <TD mono right className="font-bold text-[#1E3A5F]">
                  {fmt(openingBalance)}
                </TD>
              </TR>
              {ledgerRows.map((r, idx) => (
                <TR key={idx}>
                  <TD>{formatDate(r.date)}</TD>
                  <TD className="text-xs text-gray-900 font-medium max-w-xs">{r.detail}</TD>
                  <TD mono className="font-bold text-[#1E3A5F]">
                    {r.billNo}
                  </TD>
                  <TD mono right>
                    {r.quantity !== '-' && r.quantity !== undefined ? fmtNum(r.quantity) : '-'}
                  </TD>
                  <TD mono right>
                    {r.weight !== '-' && r.weight !== undefined ? fmtNum(r.weight) : '-'}
                  </TD>
                  <TD mono right>
                    {r.rate !== '-' && r.rate !== undefined
                      ? typeof r.rate === 'number'
                        ? fmtNum(r.rate)
                        : r.rate
                      : '-'}
                  </TD>
                  <TD mono right className="text-emerald-600 font-bold">
                    {r.debit ? fmt(r.debit) : '-'}
                  </TD>
                  <TD mono right className="text-red-500 font-bold">
                    {r.credit ? fmt(r.credit) : '-'}
                  </TD>
                  <TD mono right className="font-bold text-[#1E3A5F]">
                    {fmt(r.balance)}
                  </TD>
                </TR>
              ))}

              {/* Total Summary Row for English Statement */}
              {ledgerRows.length > 0 && (
                <TR highlight className="font-bold bg-[#F5F4F0] border-t-2 border-[#1E3A5F]">
                  <TD className="font-extrabold text-[#1E3A5F]">Total</TD>
                  <TD className="font-bold">{ledgerRows.length} Transactions</TD>
                  <TD mono>-</TD>
                  <TD mono right>{totalQty > 0 ? fmtNum(totalQty) : '-'}</TD>
                  <TD mono right>{totalWeight > 0 ? fmtNum(totalWeight) : '-'}</TD>
                  <TD mono right>-</TD>
                  <TD mono right className="text-emerald-700 font-extrabold">{fmt(totalDebit)}</TD>
                  <TD mono right className="text-red-600 font-extrabold">{fmt(totalCredit)}</TD>
                  <TD mono right className="font-extrabold text-[#1E3A5F]">{fmt(closingBalance)}</TD>
                </TR>
              )}
            </Table>

            {/* Closing Footer Block for English Statement */}
            <PrintFooter
              lang="en"
              totalDebit={totalDebit}
              totalCredit={totalCredit}
              closingBalance={closingBalance}
              printedBy="Shahid Yaseen"
            />
          </div>
        </>
      )}

      <div className="flex items-center justify-end no-print">
        <Button variant="secondary" onClick={onClose}>
          Close Details
        </Button>
      </div>
    </div>
  );
}


