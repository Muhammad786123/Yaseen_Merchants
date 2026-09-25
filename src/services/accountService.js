import { db } from '../db/database.js';

export const accountService = {
  async getAll() {
    return await db.accounts.toArray();
  },

  async add(accountData) {
    const id = accountData.id || 'acc_' + Date.now();
    const item = {
      id,
      name: accountData.name,
      balance: Number(accountData.balance || 0),
    };
    await db.accounts.add(item);
    return item;
  },

  async updateBalance(id, newBalance) {
    return await db.accounts.update(id, { balance: Number(newBalance) });
  },

  async delete(id) {
    return await db.accounts.delete(id);
  },
};
