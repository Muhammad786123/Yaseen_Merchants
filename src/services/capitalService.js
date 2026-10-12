import { db } from '../db/database.js';

export const capitalService = {
  async getAll() {
    try {
      if (!db.capitalEntries) return [];
      const entries = await db.capitalEntries.toArray();
      return entries.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    } catch {
      return [];
    }
  },

  async getBalance() {
    try {
      if (!db.capitalEntries) return 0;
      const entries = await db.capitalEntries.toArray();
      if (entries.length === 0) return 0;
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
      return 0;
    }
  },

  async addEntry(entryData) {
    const id = entryData.id || 'cap_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const count = db.capitalEntries ? await db.capitalEntries.count() : 0;
    const no = entryData.no || `CAP-${String(count + 1).padStart(4, '0')}`;
    const newEntry = {
      id,
      no,
      date: entryData.date || new Date().toISOString().split('T')[0],
      type: entryData.type || 'Add', // 'Add' or 'Withdraw'
      amount: Number(entryData.amount || 0),
      description: entryData.description || 'Owner Capital Investment',
      linkedTransactionId: entryData.linkedTransactionId || null,
      createdAt: entryData.createdAt || new Date().toISOString(),
      updatedAt: null,
      editCount: 0,
    };

    if (db.capitalEntries) {
      await db.capitalEntries.add(newEntry);
    }
    return newEntry;
  },

  async update(id, data) {
    if (!db.capitalEntries) return null;
    const existing = await db.capitalEntries.get(id);
    if (!existing) throw new Error('Capital entry not found');

    const updated = {
      ...existing,
      date: data.date || existing.date,
      type: data.type || existing.type,
      amount: Number(data.amount !== undefined ? data.amount : existing.amount),
      description: data.description !== undefined ? data.description : existing.description,
      updatedAt: new Date().toISOString(),
      editCount: (Number(existing.editCount) || 0) + 1,
    };

    await db.capitalEntries.put(updated);
    return updated;
  },

  async delete(id) {
    if (!db.capitalEntries) return;
    await db.capitalEntries.delete(id);
  },
};
