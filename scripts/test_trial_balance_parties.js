import assert from 'assert';

// Mock fmt function matching project
function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n) || n === '') return '0';
  const num = Number(n);
  const hasDecimals = num % 1 !== 0;
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}
function fmt(n) {
  if (n === null || n === undefined || isNaN(n) || n === '') return 'Rs. 0';
  return 'Rs. ' + fmtNum(n);
}

// Parties scenario from prompt:
// Zubair: 116,000 Cr (payable / credit) -> balance = 116000
// Aqib: 121,000 Cr (payable / credit) -> balance = 121000
// Rafaqat: 440,000 Dr (receivable / debit) -> balance = -440000

const mockParties = [
  { id: 'p1', code: 'P-01', name: 'Zubair', urduName: 'زبیر', balance: 116000 },
  { id: 'p2', code: 'P-02', name: 'Aqib', urduName: 'عاقب', balance: 121000 },
  { id: 'p3', code: 'P-03', name: 'Rafaqat', urduName: 'رفاقت', balance: -440000 },
  { id: 'p4', code: 'P-04', name: 'Zero Balance Party', urduName: 'صفر بیلنس', balance: 0 },
];

// Logic from tbRows:
const sortedParties = [...mockParties]
  .filter((p) => Number(p.balance || 0) !== 0)
  .sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }));

let idx = 1;
const tbRows = [];
sortedParties.forEach((p) => {
  const bal = Number(p.balance || 0);
  const isRec = bal < 0;
  const debit = isRec ? Math.abs(bal) : 0;
  const credit = !isRec ? bal : 0;
  tbRows.push({
    id: p.id,
    idx: idx++,
    code: p.code,
    name: p.name,
    urduName: p.urduName,
    group: 'party',
    debit,
    credit,
    balance: bal,
  });
});

const tbParties = tbRows.filter((r) => r.group === 'party');
const tbPartiesDebit = tbParties.reduce((s, r) => s + r.debit, 0);
const tbPartiesCredit = tbParties.reduce((s, r) => s + r.credit, 0);

console.log('=== Party Rows in Trial Balance ===');
const renderedRows = [];
let sumRowDebits = 0;
let sumRowCredits = 0;

tbParties.forEach((p) => {
  const deb = Number(p.debit || 0);
  const cred = Number(p.credit || 0);
  if (deb === 0 && cred === 0) return;

  const debCell = deb > 0 ? fmt(deb) : '';
  const credCell = cred > 0 ? fmt(cred) : '';
  sumRowDebits += deb;
  sumRowCredits += cred;

  renderedRows.push({
    code: p.code,
    name: p.name,
    urduName: p.urduName,
    debit: debCell,
    credit: credCell,
    rawDeb: deb,
    rawCred: cred,
  });

  console.log(`${p.code} | ${p.name} (${p.urduName}) | Benaam (Dr): "${debCell}" | Jama (Cr): "${credCell}"`);
});

console.log('\n=== Footer Totals ===');
console.log(`ٹوٹل Benaam: "${fmt(tbPartiesDebit)}" (Raw: ${tbPartiesDebit})`);
console.log(`ٹوٹل Jama: "${fmt(tbPartiesCredit)}" (Raw: ${tbPartiesCredit})`);

// Assertions
assert.strictEqual(renderedRows.length, 3, 'Zero balance party should be filtered out');

// Zubair row
const zubair = renderedRows.find((r) => r.name === 'Zubair');
assert(zubair, 'Zubair should be present');
assert.strictEqual(zubair.debit, '', 'Zubair debit should be blank');
assert.strictEqual(zubair.credit, 'Rs. 116,000', 'Zubair credit should be Rs. 116,000');

// Aqib row
const aqib = renderedRows.find((r) => r.name === 'Aqib');
assert(aqib, 'Aqib should be present');
assert.strictEqual(aqib.debit, '', 'Aqib debit should be blank');
assert.strictEqual(aqib.credit, 'Rs. 121,000', 'Aqib credit should be Rs. 121,000');

// Rafaqat row
const rafaqat = renderedRows.find((r) => r.name === 'Rafaqat');
assert(rafaqat, 'Rafaqat should be present');
assert.strictEqual(rafaqat.debit, 'Rs. 440,000', 'Rafaqat debit should be Rs. 440,000');
assert.strictEqual(rafaqat.credit, '', 'Rafaqat credit should be blank');

// Sum equality
assert.strictEqual(sumRowDebits, tbPartiesDebit, 'Sum of row debits must equal footer Benaam total');
assert.strictEqual(sumRowCredits, tbPartiesCredit, 'Sum of row credits must equal footer Jama total');
assert.strictEqual(tbPartiesDebit, 440000, 'Footer Benaam should be 440,000');
assert.strictEqual(tbPartiesCredit, 237000, 'Footer Jama should be 237,000 (116k + 121k)');

console.log('\n✔ ALL TRIAL BALANCE PARTY TESTS PASSED WITH 100% ACCURACY!');
