// Verification script for Party-wise Quality Analysis logic
import assert from 'assert';

function flattenInvoices(invoices, isPurchase) {
  const flat = [];
  let invTotal = 0;

  invoices.forEach((inv) => {
    invTotal += Number(inv.total || 0);
    const partyId = isPurchase ? (inv.supplierId || '') : (inv.customerId || '');
    const partyName = isPurchase
      ? (inv.supplierName || 'Unknown Supplier')
      : (inv.customerName || 'Unknown Customer');
    const invNo = inv.no || inv.invoiceNo || String(inv.id);
    const invDate = inv.date;

    (inv.items || []).forEach((it, idx) => {
      const isService = it.type === 'service';
      const qty = Number(it.qty ?? it.weight ?? it.quantity ?? 0);
      const rate = Number(it.rate || 0);
      const amount = Number(
        it.amount !== undefined && it.amount !== null && it.amount !== ''
          ? it.amount
          : qty * rate
      );
      const nugs = Number(it.nugs || 0);
      const unitType = it.unitType || (nugs > 0 ? 'Nug' : 'KG');
      const quality = (it.quality || '').trim();
      const itemId = it.itemId || it.id || '';
      const itemName = it.itemName || (isService ? (it.serviceDescription || 'Service') : 'Item');

      flat.push({
        lineId: `${inv.id || invNo}_${idx}`,
        invoiceId: inv.id,
        invoiceNo: invNo,
        date: invDate,
        partyId,
        partyName,
        itemId,
        itemName,
        quality,
        unitType,
        nugs,
        qty,
        rate,
        amount,
        isService,
      });
    });
  });

  const qualityLines = flat.filter((l) => !l.isService && Boolean(l.quality));
  const serviceLines = flat.filter((l) => l.isService || !l.quality);

  return {
    allLines: flat,
    qualityLines,
    serviceLines,
    invoicesGrandTotal: invTotal,
    allStockTotal: qualityLines.reduce((s, l) => s + l.amount, 0),
    allServicesTotal: serviceLines.reduce((s, l) => s + l.amount, 0),
  };
}

function computePartyQuality(qualityLines, selectedPartyId) {
  let targetLines = qualityLines;
  if (selectedPartyId) {
    targetLines = targetLines.filter((l) => l.partyId === selectedPartyId);
  }

  const partyMap = new Map();
  targetLines.forEach((line) => {
    const pKey = line.partyId || line.partyName;
    if (!partyMap.has(pKey)) {
      partyMap.set(pKey, {
        partyId: line.partyId,
        partyName: line.partyName,
        itemsMap: new Map(),
        totalQty: 0,
        totalAmount: 0,
        invoicesSet: new Set(),
      });
    }

    const pGroup = partyMap.get(pKey);
    pGroup.totalQty += line.qty;
    pGroup.totalAmount += line.amount;
    pGroup.invoicesSet.add(line.invoiceNo);

    const itemKey = `${line.itemId || line.itemName}:::${line.quality}`;
    if (!pGroup.itemsMap.has(itemKey)) {
      pGroup.itemsMap.set(itemKey, {
        itemKey,
        itemId: line.itemId,
        itemName: line.itemName,
        quality: line.quality,
        lines: [],
        totalQty: 0,
        totalAmount: 0,
        invoicesSet: new Set(),
      });
    }

    const itGroup = pGroup.itemsMap.get(itemKey);
    itGroup.lines.push(line);
    itGroup.totalQty += line.qty;
    itGroup.totalAmount += line.amount;
    itGroup.invoicesSet.add(line.invoiceNo);
  });

  return Array.from(partyMap.values()).map((p) => {
    const itemRows = Array.from(p.itemsMap.values()).map((it) => ({
      ...it,
      avgRate: it.totalQty > 0 ? it.totalAmount / it.totalQty : 0,
      invoicesCount: it.invoicesSet.size,
    }));
    itemRows.sort((a, b) => b.totalQty - a.totalQty);
    return {
      ...p,
      itemRows,
      avgRate: p.totalQty > 0 ? p.totalAmount / p.totalQty : 0,
      invoicesCount: p.invoicesSet.size,
    };
  });
}

function computeQualityParty(qualityLines, selectedQuality, selectedItemId) {
  let targetLines = qualityLines;
  if (selectedQuality) {
    targetLines = targetLines.filter((l) => l.quality.toLowerCase() === selectedQuality.toLowerCase());
  }
  if (selectedItemId) {
    targetLines = targetLines.filter((l) => l.itemId === selectedItemId || l.itemName.toLowerCase() === selectedItemId.toLowerCase());
  }

  const partyMap = new Map();
  targetLines.forEach((line) => {
    const pKey = line.partyId || line.partyName;
    if (!partyMap.has(pKey)) {
      partyMap.set(pKey, {
        partyId: line.partyId,
        partyName: line.partyName,
        lines: [],
        totalQty: 0,
        totalAmount: 0,
        invoicesSet: new Set(),
      });
    }

    const pGroup = partyMap.get(pKey);
    pGroup.lines.push(line);
    pGroup.totalQty += line.qty;
    pGroup.totalAmount += line.amount;
    pGroup.invoicesSet.add(line.invoiceNo);
  });

  const result = Array.from(partyMap.values()).map((p) => ({
    ...p,
    avgRate: p.totalQty > 0 ? p.totalAmount / p.totalQty : 0,
    invoicesCount: p.invoicesSet.size,
  }));
  result.sort((a, b) => b.totalQty - a.totalQty);
  return result;
}

console.log('=== TEST 1: SUPPLIER WITH 2 PURCHASES OF DIFFERENT QUALITIES ===');
const testPurchases = [
  {
    id: 'pur_1',
    no: 'PUR-001',
    date: '2026-10-01',
    supplierId: 'sup_1',
    supplierName: 'Al-Madina Cotton Mills',
    total: 30000,
    items: [
      { itemId: 'item_1', itemName: 'Raw Cotton', quality: 'Cotton A', qty: 200, rate: 150, amount: 30000 },
    ],
  },
  {
    id: 'pur_2',
    no: 'PUR-002',
    date: '2026-10-02',
    supplierId: 'sup_1',
    supplierName: 'Al-Madina Cotton Mills',
    total: 36000,
    items: [
      { itemId: 'item_2', itemName: 'Comber Cotton', quality: 'Comber Noil', qty: 300, rate: 120, amount: 36000 },
    ],
  },
];

const purData = flattenInvoices(testPurchases, true);
assert.strictEqual(purData.invoicesGrandTotal, 66000);
assert.strictEqual(purData.allStockTotal, 66000);
assert.strictEqual(purData.qualityLines.length, 2);

const purPQ = computePartyQuality(purData.qualityLines, 'sup_1');
console.log('Supplier Party -> Quality groups:');
purPQ[0].itemRows.forEach(r => {
  console.log(`  - ${r.quality}: Qty=${r.totalQty}kg, AvgRate=${r.avgRate}, Amount=${r.totalAmount}, Invoices=${r.invoicesCount}`);
});

assert.strictEqual(purPQ[0].itemRows.length, 2);
const purCottonA = purPQ[0].itemRows.find(r => r.quality === 'Cotton A');
const purComber = purPQ[0].itemRows.find(r => r.quality === 'Comber Noil');
assert.strictEqual(purCottonA.totalQty, 200);
assert.strictEqual(purCottonA.avgRate, 150);
assert.strictEqual(purCottonA.totalAmount, 30000);
assert.strictEqual(purCottonA.invoicesCount, 1);

assert.strictEqual(purComber.totalQty, 300);
assert.strictEqual(purComber.avgRate, 120);
assert.strictEqual(purComber.totalAmount, 36000);
assert.strictEqual(purComber.invoicesCount, 1);

// Overall subtotal
assert.strictEqual(purPQ[0].totalQty, 500);
assert.strictEqual(purPQ[0].avgRate, 66000 / 500); // 132
assert.strictEqual(purPQ[0].totalAmount, 66000);
console.log('✓ Supplier Party -> Quality verified!');

// Quality -> Party
const purQP_CottonA = computeQualityParty(purData.qualityLines, 'Cotton A', null);
assert.strictEqual(purQP_CottonA.length, 1);
assert.strictEqual(purQP_CottonA[0].partyName, 'Al-Madina Cotton Mills');
assert.strictEqual(purQP_CottonA[0].totalQty, 200);
assert.strictEqual(purQP_CottonA[0].avgRate, 150);
assert.strictEqual(purQP_CottonA[0].totalAmount, 30000);
console.log('✓ Supplier Quality -> Party verified!');

console.log('\n=== TEST 2: CUSTOMER WITH 3 SALES ACROSS 2 QUALITIES (PLUS SERVICE LINE) ===');
const testSales = [
  {
    id: 'sal_1',
    no: 'SAL-001',
    date: '2026-10-03',
    customerId: 'cust_1',
    customerName: 'Bismillah Fabrics',
    total: 30000,
    items: [
      { itemId: 'item_1', itemName: 'Raw Cotton', quality: 'Cotton A', qty: 150, rate: 200, amount: 30000 },
    ],
  },
  {
    id: 'sal_2',
    no: 'SAL-002',
    date: '2026-10-04',
    customerId: 'cust_1',
    customerName: 'Bismillah Fabrics',
    total: 54000,
    items: [
      { itemId: 'item_1', itemName: 'Raw Cotton', quality: 'Cotton A', qty: 250, rate: 210, amount: 52500 },
      { type: 'service', serviceDescription: 'Loading & Delivery', amount: 1500 },
    ],
  },
  {
    id: 'sal_3',
    no: 'SAL-003',
    date: '2026-10-05',
    customerId: 'cust_1',
    customerName: 'Bismillah Fabrics',
    total: 64000,
    items: [
      { itemId: 'item_2', itemName: 'Comber Cotton', quality: 'Comber Noil', qty: 400, rate: 160, amount: 64000 },
    ],
  },
];

const saleData = flattenInvoices(testSales, false);
console.log(`Invoice Grand Total: Rs. ${saleData.invoicesGrandTotal}`);
console.log(`Stock Total: Rs. ${saleData.allStockTotal}`);
console.log(`Services Total: Rs. ${saleData.allServicesTotal}`);
assert.strictEqual(saleData.invoicesGrandTotal, 148000);
assert.strictEqual(saleData.allStockTotal, 146500);
assert.strictEqual(saleData.allServicesTotal, 1500);
assert.strictEqual(saleData.allStockTotal + saleData.allServicesTotal, saleData.invoicesGrandTotal);

const salePQ = computePartyQuality(saleData.qualityLines, 'cust_1');
console.log('Customer Party -> Quality groups:');
salePQ[0].itemRows.forEach(r => {
  console.log(`  - ${r.quality}: Qty=${r.totalQty}kg, WeightedAvgRate=${r.avgRate}, Amount=${r.totalAmount}, Invoices=${r.invoicesCount}`);
});

const saleCottonA = salePQ[0].itemRows.find(r => r.quality === 'Cotton A');
const saleComber = salePQ[0].itemRows.find(r => r.quality === 'Comber Noil');

// Invoices 1 and 2 had Cotton A:
// Inv 1: 150 kg @ 200 = 30000
// Inv 2: 250 kg @ 210 = 52500
// Total Qty = 400 kg. Total Amount = 82500. Weighted Avg Rate = 82500 / 400 = 206.25!
assert.strictEqual(saleCottonA.totalQty, 400);
assert.strictEqual(saleCottonA.totalAmount, 82500);
assert.strictEqual(saleCottonA.avgRate, 206.25);
assert.strictEqual(saleCottonA.invoicesCount, 2);

// Invoice 3 had Comber Noil:
// 400 kg @ 160 = 64000
assert.strictEqual(saleComber.totalQty, 400);
assert.strictEqual(saleComber.totalAmount, 64000);
assert.strictEqual(saleComber.avgRate, 160);
assert.strictEqual(saleComber.invoicesCount, 1);

// Quality -> Party:
const saleQP_CottonA = computeQualityParty(saleData.qualityLines, 'Cotton A', null);
assert.strictEqual(saleQP_CottonA.length, 1);
assert.strictEqual(saleQP_CottonA[0].partyName, 'Bismillah Fabrics');
assert.strictEqual(saleQP_CottonA[0].totalQty, 400);
assert.strictEqual(saleQP_CottonA[0].avgRate, 206.25);
assert.strictEqual(saleQP_CottonA[0].totalAmount, 82500);
assert.strictEqual(saleQP_CottonA[0].invoicesCount, 2);

const saleQP_Comber = computeQualityParty(saleData.qualityLines, 'Comber Noil', null);
assert.strictEqual(saleQP_Comber.length, 1);
assert.strictEqual(saleQP_Comber[0].partyName, 'Bismillah Fabrics');
assert.strictEqual(saleQP_Comber[0].totalQty, 400);
assert.strictEqual(saleQP_Comber[0].avgRate, 160);
assert.strictEqual(saleQP_Comber[0].totalAmount, 64000);
assert.strictEqual(saleQP_Comber[0].invoicesCount, 1);

console.log('✓ All Customer Quality -> Party checks passed!');
console.log('✓ Reconciliation verified: Stock (146,500) + Services (1,500) = Invoice Total (148,000)');
console.log('\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🎯');
