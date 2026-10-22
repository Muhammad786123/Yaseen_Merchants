import React, { useState, useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { safePrint } from '../../utils/printUtils.js';
import { getPartyBalanceBeforeInvoice } from '../../services/partyService.js';
import { db } from '../../db/database.js';

import {
  formatBillDate,
  formatWeight,
  formatRate,
  formatAmount,
  formatCount,
  computeSaleBillBalances,
  getLineLabel,
} from '../../utils/saleBillMemoUtils.js';

export {
  formatBillDate,
  formatWeight,
  formatRate,
  formatAmount,
  formatCount,
  computeSaleBillBalances,
  getLineLabel,
};


export default function SaleBillMemo({
  sale,
  party = null,
  onClose = null,
  onPrint = null,
}) {
  const [previousBalance, setPreviousBalance] = useState(0);
  const [partyDetails, setPartyDetails] = useState(party);
  const [loading, setLoading] = useState(true);
  const [viewLang, setViewLang] = useState('urdu'); // 'urdu' | 'roman'

  const billTotal = Number(sale?.total || 0);
  const billReceived = Number(sale?.received !== undefined ? sale.received : (sale?.receivedAmount || 0));

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        let currentParty = party;
        if (!currentParty && sale?.customerId && db && db.parties) {
          currentParty = await db.parties.get(sale.customerId);
        }
        if (isMounted && currentParty) {
          setPartyDetails(currentParty);
        }

        if (sale) {
          const prevBal = await getPartyBalanceBeforeInvoice(
            currentParty || sale.customerId,
            sale
          );
          if (isMounted) {
            setPreviousBalance(prevBal);
          }
        }
      } catch (err) {
        console.warn('Error computing previous balance for Sale Bill:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [sale, party]);

  const {
    previousAbs,
    previousSide,
    billSide,
    finalAbs,
    finalSide,
  } = computeSaleBillBalances({
    previousBalance,
    total: billTotal,
    received: billReceived,
  });

  const billNo = sale?.no || sale?.billNo || sale?.id || '';
  const billDate = formatBillDate(sale?.date || new Date());
  const customerName = partyDetails?.name || sale?.customerName || '';
  const customerAddress = partyDetails?.address || partyDetails?.city || '';

  const items = sale?.items || [];

  // Calculate total تعداد (sum of line.count; blank if none was entered)
  let hasAnyCount = false;
  const totalCount = items.reduce((sum, it) => {
    if (it.type === 'service') return sum;
    if (it.count !== undefined && it.count !== null && it.count !== '') {
      const val = Number(it.count);
      if (!isNaN(val)) {
        hasAnyCount = true;
        return sum + val;
      }
    }
    return sum;
  }, 0);

  const isRoman = viewLang === 'roman';

  return (
    <div className="sale-bill-memo-container w-full flex flex-col items-center print:block print:p-0 print:m-0 print:w-full print:h-auto print:overflow-visible">
      {/* ── Toolbar (Hidden when printing) ────────────────────────── */}
      <div className="no-print w-full max-w-[850px] mb-3 flex items-center justify-between bg-white border border-gray-300 p-2 shadow-sm rounded">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={Printer}
            onClick={() => safePrint()}
          >
            Print Bill / Memo
          </Button>
          <div className="flex items-center border border-black rounded text-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setViewLang('urdu')}
              className={`px-2.5 py-1 font-bold cursor-pointer transition-colors ${
                !isRoman ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              اردو
            </button>
            <button
              type="button"
              onClick={() => setViewLang('roman')}
              className={`px-2.5 py-1 font-bold cursor-pointer transition-colors ${
                isRoman ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              Roman Urdu
            </button>
          </div>
          <span className="text-xs text-gray-500 hidden sm:inline">
            Solid Black Bar • Customer Copy Original • Slashed Zero
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded text-gray-600 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Bill / Memo Sheet ───────────────────────────────────────── */}
      <div
        id="bill-memo-print-area"
        className="print-area sale-bill-memo-sheet w-full max-w-[820px] bg-white text-black border border-black shadow-lg print:shadow-none print:border-black print:m-0 print:w-full print:max-w-none"
        style={{
          boxSizing: 'border-box',
          fontVariantNumeric: 'slashed-zero tabular-nums',
          fontFeatureSettings: "'zero' 1, 'tnum' 1",
        }}
      >
        {/* 1) Top Bar: solid BLACK strip, full width, white bold text */}
        <div
          className="w-full bg-black text-white px-3 py-1.5 flex justify-between items-center text-xs sm:text-sm font-bold tracking-wide"
          style={{
            backgroundColor: '#000000',
            color: '#ffffff',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          <span className="font-bold tracking-wider uppercase">
            {isRoman ? 'BIKRI BILL' : 'BILL / MEMO'}
          </span>
          <span className="font-bold tracking-wider">Customer Copy Original</span>
        </div>

        <div className="p-4 sm:p-5">
          {/* Below top bar: Title BILL/MEMO, bold, underlined, centred */}
          <div className="text-center my-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-widest uppercase underline underline-offset-4 decoration-2 inline-block">
              {isRoman ? 'BIKRI BILL' : 'BILL/MEMO'}
            </h1>
          </div>

          {/* Header Metadata */}
          {isRoman ? (
            <div className="flex justify-between items-start mt-2 mb-4 px-1 text-sm font-bold" dir="ltr">
              <div className="flex flex-col gap-1">
                <div><span className="text-gray-600">Tareekh:</span> <span className="font-mono text-black">{billDate}</span></div>
                <div><span className="text-gray-600">Bill No.:</span> <span className="font-mono text-black">{billNo}</span></div>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <div><span className="text-gray-600">Party ka Naam:</span> <span className="text-base text-black font-extrabold">{customerName}</span></div>
                {sale?.warehouseName && <div><span className="text-gray-600">Godam:</span> <span className="text-black">{sale.warehouseName}</span></div>}
                {customerAddress && <div><span className="text-gray-600">Pata:</span> <span className="text-black">{customerAddress}</span></div>}
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-start mt-2 mb-4 px-1" dir="ltr">
              {/* Left: تاریخ and نمبر */}
              <div className="flex flex-col gap-1 text-sm sm:text-base font-bold min-w-[180px]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-black num w-28 text-left tracking-wider">
                    {billDate}
                  </span>
                  <span className="font-urdu font-bold text-base select-none">تاریخ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-black num w-28 text-left tracking-wider">
                    {billNo}
                  </span>
                  <span className="font-urdu font-bold text-base select-none">نمبر</span>
                </div>
              </div>

              {/* Right: Party Name in large Nastaleeq with پتہ below */}
              <div className="text-right flex flex-col items-end">
                <div
                  className="font-urdu font-bold text-2xl sm:text-3xl text-black leading-snug tracking-wide"
                  dir="rtl"
                >
                  میسرز {customerName}
                </div>
                <div
                  className="font-urdu text-sm sm:text-base text-gray-800 flex items-center gap-1.5 mt-0.5"
                  dir="rtl"
                >
                  <span className="font-bold">پتہ:</span>
                  <span>{customerAddress || ''}</span>
                </div>
              </div>
            </div>
          )}

          {/* 2) Table Header & Columns */}
          <div className="w-full border border-black overflow-hidden">
            <table
              className="w-full border-collapse text-sm sm:text-base"
              dir={isRoman ? 'ltr' : 'rtl'}
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontVariantNumeric: 'slashed-zero tabular-nums',
                fontFeatureSettings: "'zero' 1, 'tnum' 1",
              }}
            >
              <thead>
                <tr
                  className="table-header-hatch text-black font-urdu font-bold border-b border-black text-center"
                  style={{
                    background:
                      'repeating-linear-gradient(45deg, #c8c8c8 0px, #c8c8c8 1px, #ebebeb 1px, #ebebeb 5px)',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  {isRoman ? (
                    hasAnyCount ? (
                      <>
                        <th className="py-1.5 px-2 border-r border-black font-bold text-center" style={{ width: '13%' }}>Boron ki Tadaad</th>
                        <th className="py-1.5 px-2 border-r border-black font-bold text-left" style={{ width: '41%' }}>Maal ki Tafseel</th>
                        <th className="py-1.5 px-2 border-r border-black font-bold text-right" style={{ width: '16%' }}>Wazan (KG)</th>
                        <th className="py-1.5 px-2 border-r border-black font-bold text-right" style={{ width: '14%' }}>Rate (Rs.)</th>
                        <th className="py-1.5 px-2 font-bold text-right" style={{ width: '16%' }}>Raqam (Rs.)</th>
                      </>
                    ) : (
                      <>
                        <th className="py-1.5 px-2 border-r border-black font-bold text-left" style={{ width: '54%' }}>Maal ki Tafseel</th>
                        <th className="py-1.5 px-2 border-r border-black font-bold text-right" style={{ width: '16%' }}>Wazan (KG)</th>
                        <th className="py-1.5 px-2 border-r border-black font-bold text-right" style={{ width: '14%' }}>Rate (Rs.)</th>
                        <th className="py-1.5 px-2 font-bold text-right" style={{ width: '16%' }}>Raqam (Rs.)</th>
                      </>
                    )
                  ) : (
                    <>
                      {/* Right to Left: بوروں کی تعداد | تفصیل | وزن | ریٹ | رقم */}
                      <th
                        className="py-1.5 px-2 border-l border-black font-urdu font-extrabold text-center"
                        style={{ width: '13%' }}
                      >
                        بوروں کی تعداد
                      </th>
                      <th
                        className="py-1.5 px-2 border-l border-black font-urdu font-extrabold text-center"
                        style={{ width: '41%' }}
                      >
                        تفصیل
                      </th>
                      <th
                        className="py-1.5 px-2 border-l border-black font-urdu font-extrabold text-center"
                        style={{ width: '16%' }}
                      >
                        وزن
                      </th>
                      <th
                        className="py-1.5 px-2 border-l border-black font-urdu font-extrabold text-center"
                        style={{ width: '14%' }}
                      >
                        ریٹ
                      </th>
                      <th
                        className="py-1.5 px-2 font-urdu font-extrabold text-center"
                        style={{ width: '16%' }}
                      >
                        رقم
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* Item rows */}
                {items.map((item, idx) => {
                  const isService = item.type === 'service';
                  const itemCount = isService
                    ? ''
                    : (item.count !== undefined && item.count !== null && item.count !== ''
                        ? item.count
                        : '');
                  const itemDesc = getLineLabel(item);
                  const itemWeight = isService ? '' : item.qty;
                  const itemRate = isService ? '' : item.rate;
                  const itemAmount = item.amount;

                  if (isRoman) {
                    return (
                      <tr
                        key={idx}
                        className="border-b border-black/30 hover:bg-gray-50/50"
                        style={{ height: '32px' }}
                      >
                        {hasAnyCount && (
                          <td className="py-1 px-2 border-r border-black text-center font-mono num">
                            {itemCount !== '' ? formatCount(itemCount) : ''}
                          </td>
                        )}
                        <td className="py-1 px-3 border-r border-black font-medium text-left">
                          {itemDesc}
                        </td>
                        <td className="py-1 px-2 border-r border-black text-right font-mono num">
                          {isService ? '' : formatWeight(itemWeight)}
                        </td>
                        <td className="py-1 px-2 border-r border-black text-right font-mono num">
                          {isService ? '' : formatRate(itemRate)}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold num">
                          {formatAmount(itemAmount)}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={idx}
                      className="border-b border-black/30 hover:bg-gray-50/50"
                      style={{ height: '32px' }}
                    >
                      {/* تعداد */}
                      <td
                        className="py-1 px-2 border-l border-black text-center font-mono num"
                        dir="ltr"
                      >
                        {itemCount !== '' ? formatCount(itemCount) : ''}
                      </td>
                      {/* تفصیل */}
                      <td
                        className="py-1 px-3 border-l border-black font-urdu font-semibold text-right"
                        dir="auto"
                      >
                        {itemDesc}
                      </td>
                      {/* وزن (with 3 decimals) */}
                      <td
                        className="py-1 px-2 border-l border-black text-right font-mono num"
                        dir="ltr"
                      >
                        {isService ? '' : formatWeight(itemWeight)}
                      </td>
                      {/* ریٹ (with 2 decimals) */}
                      <td
                        className="py-1 px-2 border-l border-black text-right font-mono num"
                        dir="ltr"
                      >
                        {isService ? '' : formatRate(itemRate)}
                      </td>
                      {/* رقم (with thousands separators) */}
                      <td
                        className="py-1 px-2 text-right font-mono font-bold num"
                        dir="ltr"
                      >
                        {formatAmount(itemAmount)}
                      </td>
                    </tr>
                  );
                })}

                {/* Vertical black lines run the FULL height down to the total row */}
                <tr style={{ height: `${Math.max(260 - (items.length * 32), 160)}px` }}>
                  {isRoman ? (
                    hasAnyCount ? (
                      <>
                        <td className="border-r border-black">&nbsp;</td>
                        <td className="border-r border-black">&nbsp;</td>
                        <td className="border-r border-black">&nbsp;</td>
                        <td className="border-r border-black">&nbsp;</td>
                        <td>&nbsp;</td>
                      </>
                    ) : (
                      <>
                        <td className="border-r border-black">&nbsp;</td>
                        <td className="border-r border-black">&nbsp;</td>
                        <td className="border-r border-black">&nbsp;</td>
                        <td>&nbsp;</td>
                      </>
                    )
                  ) : (
                    <>
                      <td className="border-l border-black">&nbsp;</td>
                      <td className="border-l border-black">&nbsp;</td>
                      <td className="border-l border-black">&nbsp;</td>
                      <td className="border-l border-black">&nbsp;</td>
                      <td>&nbsp;</td>
                    </>
                  )}
                </tr>

                {/* 3) Total Row: bold, thick top border */}
                <tr
                  className="font-bold border-t-2 border-black"
                  style={{
                    borderTop: '2px solid black',
                    height: '34px',
                  }}
                >
                  {isRoman ? (
                    hasAnyCount ? (
                      <>
                        <td className="py-1 px-2 border-r border-black text-center font-mono font-bold num">
                          {hasAnyCount ? formatCount(totalCount) : ''}
                        </td>
                        <td className="py-1 px-3 border-r border-black font-bold text-center text-sm">
                          Bhool Chook Lain Dain
                        </td>
                        <td className="py-1 px-2 border-r border-black">&nbsp;</td>
                        <td className="py-1 px-2 border-r border-black text-center font-bold text-sm">
                          {billSide === 'نام' ? 'Naam' : 'Jama'}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold num text-base">
                          {formatAmount(billTotal)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-1 px-3 border-r border-black font-bold text-center text-sm">
                          Bhool Chook Lain Dain
                        </td>
                        <td className="py-1 px-2 border-r border-black">&nbsp;</td>
                        <td className="py-1 px-2 border-r border-black text-center font-bold text-sm">
                          {billSide === 'نام' ? 'Naam' : 'Jama'}
                        </td>
                        <td className="py-1 px-2 text-right font-mono font-bold num text-base">
                          {formatAmount(billTotal)}
                        </td>
                      </>
                    )
                  ) : (
                    <>
                      {/* تعداد in the first cell */}
                      <td
                        className="py-1 px-2 border-l border-black text-center font-mono font-bold num"
                        dir="ltr"
                      >
                        {hasAnyCount ? formatCount(totalCount) : ''}
                      </td>
                      {/* "بھول چوک لین دین" in the تفصیل cell */}
                      <td
                        className="py-1 px-3 border-l border-black font-urdu font-bold text-center text-base"
                        dir="rtl"
                      >
                        بھول چوک لین دین
                      </td>
                      {/* وزن: empty spacer */}
                      <td className="py-1 px-2 border-l border-black">&nbsp;</td>
                      {/* side word of the bill (نام for Sale bill) in the ریٹ cell */}
                      <td
                        className="py-1 px-2 border-l border-black text-center font-urdu font-bold text-base"
                        dir="rtl"
                      >
                        {billSide}
                      </td>
                      {/* bill total in the رقم cell */}
                      <td
                        className="py-1 px-2 text-right font-mono font-bold num text-base"
                        dir="ltr"
                      >
                        {formatAmount(billTotal)}
                      </td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4) Three stacked boxes under the table on the LEFT */}
          <div className="mt-3 flex justify-start items-start w-full">
            <div className="flex flex-col gap-1.5" dir="ltr">
              {/* Box 1: "سابقہ رقم" + side word (جمع / نام): grey box, amount in RED */}
              <div className="flex items-center gap-2">
                <div
                  className="w-36 h-7 px-2 border border-black flex items-center justify-end font-mono font-bold text-red-600 num text-sm sm:text-base"
                  style={{
                    backgroundColor: '#e0e0e0',
                    color: '#dc2626',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  {previousAbs > 0 ? formatAmount(previousAbs) : '0'}
                </div>
                <div
                  className={`${isRoman ? 'font-sans font-bold text-xs sm:text-sm' : 'font-urdu font-bold text-sm sm:text-base'} text-black select-none`}
                  dir={isRoman ? 'ltr' : 'rtl'}
                  title={`سابقہ نام رقم`}
                >
                  {isRoman
                    ? previousSide ? `Sabiqa Raqam ${previousSide === 'نام' ? 'Naam' : 'Jama'}` : 'Sabiqa Raqam'
                    : previousSide ? `سابقہ رقم ${previousSide}` : 'سابقہ رقم'}
                </div>
              </div>

              {/* Box 2: "وصول پائے": grey box (empty if nothing received) */}
              <div className="flex items-center gap-2">
                <div
                  className="w-36 h-7 px-2 border border-black flex items-center justify-end font-mono font-bold text-black num text-sm sm:text-base"
                  style={{
                    backgroundColor: '#e0e0e0',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  {billReceived > 0 ? formatAmount(billReceived) : ''}
                </div>
                <div
                  className={`${isRoman ? 'font-sans font-bold text-xs sm:text-sm' : 'font-urdu font-bold text-sm sm:text-base'} text-black select-none`}
                  dir={isRoman ? 'ltr' : 'rtl'}
                >
                  {isRoman ? 'Wasool Paey' : 'وصول پائے'}
                </div>
              </div>

              {/* Box 3: "ٹوٹل بقایا رقم" + side word: black box, white bold amount */}
              <div className="flex items-center gap-2">
                <div
                  className="w-36 h-7 px-2 border border-black flex items-center justify-end font-mono font-bold text-white num text-sm sm:text-base"
                  style={{
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  {formatAmount(finalAbs)}
                </div>
                <div
                  className={`${isRoman ? 'font-sans font-bold text-xs sm:text-sm' : 'font-urdu font-bold text-sm sm:text-base'} text-black select-none`}
                  dir={isRoman ? 'ltr' : 'rtl'}
                  title={`ٹوٹل بقایا نام رقم`}
                >
                  {isRoman
                    ? finalSide ? `Total Baqaya Raqam ${finalSide === 'نام' ? 'Naam' : 'Jama'}` : 'Total Baqaya Raqam'
                    : finalSide ? `ٹوٹل بقایا رقم ${finalSide}` : 'ٹوٹل بقایا رقم'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
