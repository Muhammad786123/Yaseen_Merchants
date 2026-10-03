import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader.jsx';
import PrintHeader from '../../components/common/PrintHeader.jsx';
import UrduPartyStatement from '../../components/common/UrduPartyStatement.jsx';
import PrintFooter from '../../components/common/PrintFooter.jsx';
import { Table, TR, TD } from '../../components/ui/Table.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { useParties } from '../../hooks/useParties.js';
import { usePartyLedger } from '../../hooks/usePartyLedger.js';
import { fmt, fmtNum, formatDate } from '../../utils/formatters.js';
import { Printer, Globe } from 'lucide-react';

export default function PartyLedger() {
  const { parties } = useParties();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const [selectedPartyId, setSelectedPartyId] = useState(searchParams?.get('party') || parties[0]?.id || 'p1');
  const [viewMode, setViewMode] = useState(searchParams?.get('mode') || 'english'); // 'english' | 'urdu'

  const { selectedParty, ledgerRows, openingBalance } = usePartyLedger(selectedPartyId);

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
    <div className="space-y-6">
      <PageHeader
        title="Party Statement & Ledger"
        subtitle="Complete financial debit/credit audit ledger reflecting purchases, sales, settlements, and physical cash movements"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              icon={Printer}
              onClick={() => handlePrint('english')}
            >
              Print English Statement
            </Button>
            <Button
              variant="primary"
              icon={Printer}
              onClick={() => handlePrint('urdu')}
            >
              پرنٹ (Urdu Statement)
            </Button>
          </div>
        }
      />

      {/* Filter and View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="bg-white p-4 rounded-xl border border-[#E0DBD3] w-full sm:w-80">
          <Select
            label="Select Party Account"
            value={selectedPartyId}
            onChange={setSelectedPartyId}
            options={parties.map((p) => ({ value: p.id, label: `${p.name} (${p.type} - ${p.city})` }))}
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-[#E0DBD3]">
          <button
            onClick={() => setViewMode('english')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'english'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-gray-600 hover:bg-[#F5F4F0]'
            }`}
          >
            English Statement
          </button>
          <button
            onClick={() => setViewMode('urdu')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'urdu'
                ? 'bg-[#1E3A5F] text-white shadow-xs'
                : 'text-gray-600 hover:bg-[#F5F4F0]'
            }`}
          >
            پارٹی اسٹیٹمنٹ (Urdu)
          </button>
        </div>
      </div>

      <div id="party-ledger-print-area" className="print-area space-y-6">
        {viewMode === 'urdu' ? (
          <UrduPartyStatement
            party={selectedParty}
            ledgerRows={ledgerRows}
            openingBalance={openingBalance}
          />
        ) : (
          <>
            <PrintHeader
              documentTitle="PARTY STATEMENT OF ACCOUNT"
              partyName={selectedParty ? `${selectedParty.name} (${selectedParty.city || ''})` : ''}
              subtitle="Complete ledger audit statement reflecting purchases, sales, settlements, and physical cash movements"
            />

            {selectedParty && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-[#E0DBD3] text-xs">
                <div>
                  <span className="text-gray-500">Party Type:</span>{' '}
                  <Badge variant="blue">{selectedParty.type}</Badge>
                </div>
                <div>
                  <span className="text-gray-500">Opening Balance:</span>{' '}
                  <span className="font-bold">{fmt(openingBalance)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Current Balance:</span>{' '}
                  <span
                    className={`font-bold text-sm ${
                      (selectedParty.balance || 0) > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {fmt(selectedParty.balance || 0)}
                  </span>
                </div>
              </div>
            )}

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
          </>
        )}
      </div>
    </div>
  );
}


