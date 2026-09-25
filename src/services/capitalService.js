import { db } from '../db/database.js';

export const capitalService = {
  async getAll() {
    try {
      if (!db.capitalEntries) return [];
      return await db.capitalEntries.reverse().toArray();
    } catch {
      return [];
    }
  },

  async getBalance() {
    try {
      if (!db.capitalEntries) return 500000;
      const entries = await db.capitalEntries.toArray();
      if (entries.length === 0) {
        return 500000; // Default baseline owner capital injection
      }
      let balance = 0;
      entries.forEach((e) => {
        if (e.type === 'Add' || e.type === 'Initial') {
          balance += Number(e.amount || 0);
        } else if (e.type === 'Withdraw') {
          balance -= Number(e.amount || 0);
        }
      });
      return balance;
    } catch {
      return 500000;
    }
  },

  async addEntry(entryData) {
    const id = entryData.id || 'cap_' + Date.now();
    const newEntry = {
      id,
      date: entryData.date || new Date().toISOString().split('T')[0],
      type: entryData.type || 'Add', // 'Add' or 'Withdraw'
      amount: Number(entryData.amount || 0),
      description: entryData.description || 'Owner Capital Investment',
    };

    if (db.capitalEntries) {
      await db.capitalEntries.add(newEntry);
    }
    return newEntry;
  },
};
