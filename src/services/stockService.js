import { db } from '../db/database.js';

export const stockService = {
  async getAll() {
    return await db.stockEntries.toArray();
  },

  async addOrUpdate(stockData) {
    const existing = await db.stockEntries.get(stockData.id);
    if (existing) {
      await db.stockEntries.put({ ...existing, ...stockData });
    } else {
      const id = stockData.id || 'stk_' + Date.now();
      await db.stockEntries.add({ ...stockData, id });
    }
  },

  async delete(id) {
    return await db.stockEntries.delete(id);
  },
};
