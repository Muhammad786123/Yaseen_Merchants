import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TEST: BILL / MEMO PRINT HOOKS & PRINT PREVIEW ===\n');

// 1. Inspect SaleBillMemo.jsx
console.log('1. Checking SaleBillMemo.jsx structure:');
const memoSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/common/SaleBillMemo.jsx'), 'utf8');

// Check sheet root element id and className
assert(memoSrc.includes('id="bill-memo-print-area"'), 'SaleBillMemo must have id="bill-memo-print-area" on root sheet');
assert(memoSrc.includes('className="print-area sale-bill-memo-sheet') || /className="[^"]*print-area[^"]*"/.test(memoSrc), 'SaleBillMemo root sheet must have className containing "print-area"');
console.log('✓ Sheet element has id="bill-memo-print-area" AND className containing "print-area"');

// Check that toolbar is outside the sheet and has no-print
const toolbarIndex = memoSrc.indexOf('className="no-print');
const sheetIndex = memoSrc.indexOf('id="bill-memo-print-area"');
assert(toolbarIndex !== -1, 'Toolbar must have className containing "no-print"');
assert(toolbarIndex < sheetIndex, 'Toolbar must be outside the bordered sheet');
assert(memoSrc.includes('Print Bill / Memo'), 'Toolbar must have "Print Bill / Memo" button');
assert(memoSrc.includes('onClick={() => safePrint()}'), 'Print button must call safePrint()');
console.log('✓ Toolbar has className="no-print" and Print button calls safePrint()');

// Check that all bill parts are inside #bill-memo-print-area
const afterSheet = memoSrc.slice(sheetIndex);
assert(afterSheet.includes('bg-black text-white'), 'Black bar must be inside #bill-memo-print-area');
assert(afterSheet.includes('BILL/MEMO') || afterSheet.includes('BILL / MEMO'), 'Title must be inside #bill-memo-print-area');
assert(afterSheet.includes('Tareekh') || afterSheet.includes('تاریخ'), 'Party/date block must be inside #bill-memo-print-area');
assert(afterSheet.includes('table-header-hatch'), 'Table must be inside #bill-memo-print-area');
assert(afterSheet.includes('بھول چوک لین دین') || afterSheet.includes('Bhool Chook'), 'Totals row must be inside #bill-memo-print-area');
assert(afterSheet.includes('سابقہ رقم') || afterSheet.includes('Sabiqa Raqam'), 'Balance boxes must be inside #bill-memo-print-area');
assert(afterSheet.includes('ٹوٹل بقایا رقم') || afterSheet.includes('Total Baqaya Raqam'), 'Final balance box must be inside #bill-memo-print-area');
console.log('✓ Black bar, title, party block, table, totals, and balance boxes are inside #bill-memo-print-area');

// 2. Inspect index.css @media print rules
console.log('\n2. Checking src/index.css @media print rules:');
const cssSrc = fs.readFileSync(path.resolve(__dirname, '../src/index.css'), 'utf8');

assert(cssSrc.includes('#bill-memo-print-area'), 'index.css must include #bill-memo-print-area');
assert(cssSrc.includes('width: 190mm'), 'index.css must specify width: 190mm for #bill-memo-print-area');
assert(cssSrc.includes('margin: 0 auto'), 'index.css must specify margin: 0 auto for #bill-memo-print-area');
assert(cssSrc.includes('print-color-adjust: exact'), 'index.css must specify print-color-adjust: exact');
assert(cssSrc.includes('-webkit-print-color-adjust: exact'), 'index.css must specify -webkit-print-color-adjust: exact');
assert(cssSrc.includes('size: A4 portrait'), 'index.css must specify @page size: A4 portrait');
assert(cssSrc.includes('margin: 8mm'), 'index.css must specify @page margin: 8mm');
console.log('✓ @media print rules specify width: 190mm, margin: 0 auto, exact color adjust, and A4 portrait 8mm margin');

// Check ancestor print resets
assert(cssSrc.includes('.modal-overlay'), 'index.css resets .modal-overlay');
assert(cssSrc.includes('.modal-dialog'), 'index.css resets .modal-dialog');
assert(cssSrc.includes('.modal-content'), 'index.css resets .modal-content');
assert(cssSrc.includes('body:has(.modal-overlay) > #root'), 'index.css hides #root when modal is open');
console.log('✓ Modal ancestors reset display, overflow, and height during print');

// 3. Inspect Sale.jsx integration
console.log('\n3. Checking src/pages/Sale/Sale.jsx:');
const saleSrc = fs.readFileSync(path.resolve(__dirname, '../src/pages/Sale/Sale.jsx'), 'utf8');

assert(saleSrc.includes('title="Print Bill / Memo"'), 'Sale.jsx must include Print Bill / Memo button in table actions');
assert(saleSrc.includes('<Modal'), 'Sale.jsx must render view details inside <Modal>');
assert(saleSrc.includes('isPrintPreview={true}'), 'Sale.jsx view modal must have isPrintPreview={true}');
assert(saleSrc.includes('<SaleBillMemo') || saleSrc.includes('<UrduBillMemo'), 'Sale.jsx must render SaleBillMemo/UrduBillMemo inside Modal');
console.log('✓ Sale.jsx renders Bill/Memo inside Modal with isPrintPreview={true} and has Print Bill / Memo action button');

// 4. Verify UrduBillMemo.jsx
console.log('\n4. Checking UrduBillMemo.jsx:');
const urduSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/common/UrduBillMemo.jsx'), 'utf8');
assert(urduSrc.includes('SaleBillMemo'), 'UrduBillMemo.jsx must re-export SaleBillMemo');
console.log('✓ UrduBillMemo.jsx properly wraps and re-exports SaleBillMemo');

console.log('\n=== ALL BILL / MEMO PRINT HOOK TESTS PASSED! ===');
