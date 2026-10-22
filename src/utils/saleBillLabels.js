export const SALE_BILL_LABELS_ROMAN_URDU = {
  title: 'BIKRI BILL',
  billNo: 'Bill No.:',
  date: 'Tareekh:',
  customer: 'Party ka Naam',
  warehouse: 'Godam',
  itemsHeading: 'Maal ki Tafseel',
  columns: {
    srNo: 'Nambar',
    itemName: 'Maal ka Naam',
    count: 'Tadaad',
    tadaad: 'Tadaad',
    weight: 'Wazan (KG)',
    rate: 'Rate (Rs. per KG)',
    amount: 'Raqam (Rs.)',
  },
  totals: {
    totalBill: 'Kul Bill:',
    receivedAmount: 'Wasool Shuda Raqam:',
    balanceReceivable: 'Baqaya Raqam (Party ne dene hain):',
    wordsPrefix: 'Alfaaz mein:',
  },
};

/**
 * Returns column definitions for Roman Urdu invoice:
 * "Tadaad" is included only if at least one line has a count entered;
 * otherwise the column is left out.
 */
export function getSaleBillRomanUrduColumns(items = []) {
  const hasCount = items.some(
    (it) => it.type !== 'service' && it.count !== undefined && it.count !== null && it.count !== ''
  );
  const cols = { ...SALE_BILL_LABELS_ROMAN_URDU.columns };
  if (!hasCount) {
    delete cols.count;
    delete cols.tadaad;
  }
  return cols;
}

