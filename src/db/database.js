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

/**
 * Initialize and seed the database if empty
 */
export async function initDatabase() {
  try {
    const partyCount = await db.parties.count();
    if (partyCount === 0) {
      console.log('Seeding database with initial data...');
      await db.transaction('rw', db.tables, async () => {
        await db.parties.bulkAdd(initialParties);
        await db.qualities.bulkAdd(initialQualities);
        await db.items.bulkAdd(initialItems);
        await db.warehouses.bulkAdd(initialWarehouses);
        await db.stockEntries.bulkAdd(initialStockEntries);
        await db.purchases.bulkAdd(initialPurchases);
        await db.issues.bulkAdd(initialIssues);
        await db.productions.bulkAdd(initialProductions);
        await db.sales.bulkAdd(initialSales);
        await db.receipts.bulkAdd(initialReceipts);
        await db.payments.bulkAdd(initialPayments);
        await db.expenses.bulkAdd(initialExpenses);
        await db.accounts.bulkAdd(initialAccounts);
        await db.cashBookEntries.bulkAdd(initialCashBookEntries);
        await db.bankTransfers.bulkAdd(initialBankTransfers);
        await db.users.bulkAdd(initialUsers);
        await db.settings.bulkAdd(initialSettings);
      });
      console.log('Database seeded successfully!');
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}
