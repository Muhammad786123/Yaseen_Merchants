import { db } from '../db/database.js';

/**
 * Checks how many transactions reference a given Party.
 */
export async function getPartyUsageCount(partyId, partyName) {
  let count = 0;
  if (!partyId && !partyName) return 0;

  const purchases = db.purchases ? await db.purchases.toArray() : [];
  count += purchases.filter((p) => p.supplierId === partyId || p.supplierName === partyName).length;

  const sales = db.sales ? await db.sales.toArray() : [];
  count += sales.filter((s) => s.customerId === partyId || s.customerName === partyName).length;

  const receipts = db.receipts ? await db.receipts.toArray() : [];
  count += receipts.filter((r) => r.partyId === partyId || r.partyName === partyName).length;

  const payments = db.payments ? await db.payments.toArray() : [];
  count += payments.filter((p) => p.partyId === partyId || p.partyName === partyName).length;

  const issues = db.issues ? await db.issues.toArray() : [];
  count += issues.filter(
    (i) => i.partyId === partyId || i.customerId === partyId || i.supplierId === partyId
  ).length;

  const cashBook = db.cashBookEntries ? await db.cashBookEntries.toArray() : [];
  count += cashBook.filter((c) => c.partyId === partyId || c.partyName === partyName).length;

  const journals = db.journalEntries ? await db.journalEntries.toArray() : [];
  journals.forEach((j) => {
    const hasParty = (j.lines || []).some(
      (l) => l.accountId === partyId || l.accountName === partyName
    );
    if (hasParty) count++;
  });

  return count;
}

/**
 * Checks how many transactions reference a given Item.
 */
export async function getItemUsageCount(itemId, itemName) {
  let count = 0;
  if (!itemId && !itemName) return 0;

  const purchases = db.purchases ? await db.purchases.toArray() : [];
  purchases.forEach((p) => {
    if ((p.items || []).some((i) => i.itemId === itemId || i.itemName === itemName)) count++;
  });

  const sales = db.sales ? await db.sales.toArray() : [];
  sales.forEach((s) => {
    if ((s.items || []).some((i) => i.itemId === itemId || i.itemName === itemName)) count++;
  });

  const issues = db.issues ? await db.issues.toArray() : [];
  issues.forEach((iss) => {
    if ((iss.items || []).some((i) => i.itemId === itemId || i.itemName === itemName)) count++;
  });

  const productions = db.productions ? await db.productions.toArray() : [];
  productions.forEach((prd) => {
    if (
      prd.product === itemName ||
      (prd.inputs || []).some((i) => i.itemId === itemId || i.itemName === itemName)
    ) {
      count++;
    }
  });

  const adjustments = db.stockAdjustments ? await db.stockAdjustments.toArray() : [];
  count += adjustments.filter((a) => a.itemId === itemId || a.itemName === itemName).length;

  return count;
}

/**
 * Checks how many transactions/items reference a given Quality Grade.
 */
export async function getQualityUsageCount(qualityId, qualityName) {
  let count = 0;
  if (!qualityId && !qualityName) return 0;

  const items = db.items ? await db.items.toArray() : [];
  count += items.filter((i) => i.quality === qualityName || i.qualityId === qualityId).length;

  const purchases = db.purchases ? await db.purchases.toArray() : [];
  purchases.forEach((p) => {
    if ((p.items || []).some((i) => i.quality === qualityName)) count++;
  });

  const sales = db.sales ? await db.sales.toArray() : [];
  sales.forEach((s) => {
    if ((s.items || []).some((i) => i.quality === qualityName)) count++;
  });

  const issues = db.issues ? await db.issues.toArray() : [];
  issues.forEach((iss) => {
    if ((iss.items || []).some((i) => i.quality === qualityName)) count++;
  });

  const adjustments = db.stockAdjustments ? await db.stockAdjustments.toArray() : [];
  count += adjustments.filter((a) => a.quality === qualityName).length;

  return count;
}

/**
 * Checks how many transactions reference a given Warehouse.
 */
export async function getWarehouseUsageCount(warehouseId, warehouseName) {
  let count = 0;
  if (!warehouseId && !warehouseName) return 0;

  const purchases = db.purchases ? await db.purchases.toArray() : [];
  count += purchases.filter(
    (p) => p.warehouseId === warehouseId || p.warehouseName === warehouseName
  ).length;

  const sales = db.sales ? await db.sales.toArray() : [];
  count += sales.filter(
    (s) => s.warehouseId === warehouseId || s.warehouseName === warehouseName
  ).length;

  const issues = db.issues ? await db.issues.toArray() : [];
  count += issues.filter(
    (iss) =>
      iss.warehouseId === warehouseId ||
      iss.fromWarehouse === warehouseName ||
      iss.fromWarehouse === warehouseId
  ).length;

  const adjustments = db.stockAdjustments ? await db.stockAdjustments.toArray() : [];
  count += adjustments.filter(
    (a) => a.warehouseId === warehouseId || a.warehouseName === warehouseName
  ).length;

  return count;
}

/**
 * Checks how many transactions reference a given Cash or Bank Account.
 */
export async function getAccountUsageCount(accountId, accountName) {
  let count = 0;
  if (!accountId && !accountName) return 0;

  const receipts = db.receipts ? await db.receipts.toArray() : [];
  count += receipts.filter((r) => r.account === accountName || r.accountId === accountId).length;

  const payments = db.payments ? await db.payments.toArray() : [];
  count += payments.filter((p) => p.account === accountName || p.accountId === accountId).length;

  const expenses = db.expenses ? await db.expenses.toArray() : [];
  count += expenses.filter((e) => e.account === accountName || e.accountId === accountId).length;

  const cashBook = db.cashBookEntries ? await db.cashBookEntries.toArray() : [];
  count += cashBook.filter(
    (cb) => cb.bankAccountId === accountId || cb.bankAccountName === accountName
  ).length;

  const transfers = db.bankTransfers ? await db.bankTransfers.toArray() : [];
  count += transfers.filter(
    (t) => t.bankAccountId === accountId || t.bankAccountName === accountName
  ).length;

  const journals = db.journalEntries ? await db.journalEntries.toArray() : [];
  journals.forEach((j) => {
    const hasAcc = (j.lines || []).some(
      (l) => l.accountId === accountId || l.accountName === accountName
    );
    if (hasAcc) count++;
  });

  return count;
}
