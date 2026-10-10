import Dexie from 'dexie';
import {
  initialParties,
  initialQualities,
  initialItems,
  initialWarehouses,
  initialStockEntries,
  initialPurchases,
  initialIssues,
  initialProductions,
  initialSales,
  initialReceipts,
  initialPayments,
  initialExpenses,
  initialAccounts,
  initialCashBookEntries,
  initialBankTransfers,
  initialUsers,
  initialSettings,
} from './seed.js';

export const db = new Dexie('YaseenMerchantsDB');

// Define Database Schema
db.version(2).stores({
  parties: 'id, name, type, city, phone',
  qualities: 'id, name',
  items: 'id, code, name, category, quality',
  warehouses: 'id, name, type',
  stockEntries: 'id, itemId, itemName, warehouseId, category',
  purchases: 'id, no, date, supplierId, warehouseId',
  issues: 'id, no, date, fromWarehouse',
  productions: 'id, no, date, product',
  sales: 'id, no, date, customerId, warehouseId',
  receipts: 'id, no, date, partyId, account',
  payments: 'id, no, date, partyId, account',
  expenses: 'id, date, category, account',
  accounts: 'id, name',
  cashBookEntries: 'id, date, type, partyId, bankAccountId, linkedTransactionId',
  bankTransfers: 'id, no, date, bankAccountId, type',
  users: 'id, name, email, role',
  settings: 'id, key',
});

db.version(3).stores({
  parties: 'id, name, type, city, phone',
  qualities: 'id, name',
  items: 'id, code, name, category, quality',
  warehouses: 'id, name, type',
  stockEntries: 'id, itemId, itemName, warehouseId, category',
  purchases: 'id, no, date, supplierId, warehouseId',
  issues: 'id, no, date, fromWarehouse',
  productions: 'id, no, date, product',
  sales: 'id, no, date, customerId, warehouseId',
  receipts: 'id, no, date, partyId, account',
  payments: 'id, no, date, partyId, account',
  expenses: 'id, date, category, account',
  accounts: 'id, name',
  cashBookEntries: 'id, date, type, partyId, bankAccountId, linkedTransactionId',
  bankTransfers: 'id, no, date, bankAccountId, type',
  capitalEntries: 'id, date, type',
  users: 'id, name, email, role',
  settings: 'id, key',
});

db.version(4).stores({
  parties: 'id, name, type, city, phone',
  qualities: 'id, name',
  items: 'id, code, name, category, quality',
  warehouses: 'id, name, type',
  stockEntries: 'id, itemId, itemName, warehouseId, category',
  purchases: 'id, no, date, supplierId, warehouseId',
  issues: 'id, no, date, fromWarehouse',
  productions: 'id, no, date, product',
  sales: 'id, no, date, customerId, warehouseId',
  receipts: 'id, no, date, partyId, account',
  payments: 'id, no, date, partyId, account',
  expenses: 'id, date, category, account',
  accounts: 'id, name',
  cashBookEntries: 'id, date, type, partyId, bankAccountId, linkedTransactionId',
  bankTransfers: 'id, no, date, bankAccountId, type',
  capitalEntries: 'id, date, type',
  users: 'id, name, email, role',
  settings: 'id, key',
  autoBackups: 'id, timestamp, createdAt',
});

db.version(5).stores({
  stockAdjustments: 'id, no, date, itemId, itemName, quality, warehouseId, type, createdAt',
});

db.version(6).stores({
  journalEntries: 'id, no, date, refNo, createdAt',
});

db.version(7).stores({
  capitalEntries: 'id, date, type, linkedTransactionId',
});

/**
 * Clear all transactional, inventory, ledger, and party tables and reset database to clean state.
 * Preserves system configuration: Settings/Company Profile, Document Numbering, and Users.
 */
export async function clearAllDatabaseData() {
  await db.transaction('rw', db.tables, async () => {
    // 1. Transactional & Voucher tables
    await db.purchases.clear();
    await db.sales.clear();
    await db.issues.clear();
    await db.productions.clear();
    await db.receipts.clear();
    await db.payments.clear();
    await db.expenses.clear();
    if (db.stockAdjustments) await db.stockAdjustments.clear();
    if (db.journalEntries) await db.journalEntries.clear();

    // 2. Ledgers, Cash Book, Banking & Capital
    await db.cashBookEntries.clear();
    await db.bankTransfers.clear();
    if (db.capitalEntries) await db.capitalEntries.clear();

    // 3. Inventory & Master data tables
    await db.parties.clear();
    await db.qualities.clear();
    await db.items.clear();
    await db.warehouses.clear();
    await db.stockEntries.clear();

    // 4. Reset Accounts to baseline structures with zero balances (Cash, Meezan, HBL, UBL)
    await db.accounts.clear();
    await db.accounts.bulkAdd(initialAccounts);

    // 5. Clear auto backups if table exists
    if (db.autoBackups) await db.autoBackups.clear();

    // Note: db.settings (Company Profile, Document Numbering) and db.users are explicitly
    // preserved as system configuration per specification.
  });

  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('yaseen_last_manual_backup');
      localStorage.removeItem('yaseen_last_auto_backup');
    }
  } catch {
    // ignore
  }
}

/**
 * Initialize and verify database setup. Automatically purges all data to a clean state.
 */
export async function initDatabase() {
  try {
    const PURGE_KEY = 'yaseen_data_purge_v2026_10_05';
    const isPurged = typeof window !== 'undefined' ? localStorage.getItem(PURGE_KEY) : null;

    if (!isPurged) {
      console.log('Purging database to clean baseline state as requested...');
      await clearAllDatabaseData();
      if (typeof window !== 'undefined') {
        localStorage.setItem(PURGE_KEY, 'true');
      }
      console.log('Database successfully reset to clean state!');
    }

    // Ensure basic accounts exist
    const accountCount = await db.accounts.count();
    if (accountCount === 0) {
      await db.accounts.bulkAdd(initialAccounts);
    }
    // Ensure basic admin user exists
    const userCount = await db.users.count();
    if (userCount === 0) {
      await db.users.bulkAdd(initialUsers);
    }
    // Ensure basic settings exist
    const settingCount = await db.settings.count();
    if (settingCount === 0) {
      await db.settings.bulkAdd(initialSettings);
    }

    // Automatically correct any legacy "Wirehouse" typos at the database source
    await migrateWarehousesTypo();

    // Automatically recalculate and repair stockEntries from actual transaction history
    try {
      const { syncStockEntriesToDb } = await import('../utils/stockUtils.js');
      await syncStockEntriesToDb();
    } catch (e) {
      console.error('Failed to sync stock entries on init:', e);
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

/**
 * Scan database records and correct "Wirehouse" typos to "Warehouse"
 */
export async function migrateWarehousesTypo() {
  try {
    const warehouses = await db.warehouses.toArray();
    for (const w of warehouses) {
      if (w.name && /wirehouse/i.test(w.name)) {
        await db.warehouses.update(w.id, {
          name: w.name.replace(/wirehouse/gi, 'Warehouse'),
        });
      }
    }
    const purchases = await db.purchases.toArray();
    for (const p of purchases) {
      if (p.warehouseName && /wirehouse/i.test(p.warehouseName)) {
        await db.purchases.update(p.id, {
          warehouseName: p.warehouseName.replace(/wirehouse/gi, 'Warehouse'),
        });
      }
    }
    const sales = await db.sales.toArray();
    for (const s of sales) {
      if (s.warehouseName && /wirehouse/i.test(s.warehouseName)) {
        await db.sales.update(s.id, {
          warehouseName: s.warehouseName.replace(/wirehouse/gi, 'Warehouse'),
        });
      }
    }
    const stocks = await db.stockEntries.toArray();
    for (const st of stocks) {
      if (st.warehouseName && /wirehouse/i.test(st.warehouseName)) {
        await db.stockEntries.update(st.id, {
          warehouseName: st.warehouseName.replace(/wirehouse/gi, 'Warehouse'),
        });
      }
    }
    const issues = await db.issues.toArray();
    for (const iss of issues) {
      if (iss.fromWarehouse && /wirehouse/i.test(iss.fromWarehouse)) {
        await db.issues.update(iss.id, {
          fromWarehouse: iss.fromWarehouse.replace(/wirehouse/gi, 'Warehouse'),
        });
      }
    }
  } catch (error) {
    console.error('Failed to migrate warehouse typos:', error);
  }
}
