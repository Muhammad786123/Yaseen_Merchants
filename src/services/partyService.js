import { db } from '../db/database.js';

export const partyService = {
  async getAll() {
    return await db.parties.toArray();
  },

  async getById(id) {
    return await db.parties.get(id);
  },

  async add(partyData) {
    const id = partyData.id || 'p_' + Date.now();
    const newParty = {
      id,
      name: partyData.name,
      type: partyData.type || 'Supplier',
      phone: partyData.phone || '',
      city: partyData.city || '',
      openingBalance: Number(partyData.openingBalance || 0),
      balance: Number(partyData.openingBalance || 0),
    };
    await db.parties.add(newParty);
    return newParty;
  },

  async update(id, partyData) {
    const existing = await db.parties.get(id);
    if (!existing) throw new Error('Party not found');
    const updated = {
      ...existing,
      ...partyData,
      openingBalance: partyData.openingBalance !== undefined ? Number(partyData.openingBalance) : existing.openingBalance,
    };
    await db.parties.put(updated);
    return updated;
  },

  async delete(id) {
    return await db.parties.delete(id);
  },
};
