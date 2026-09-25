import { db } from '../db/database.js';

export const qualityService = {
  async getAll() {
    return await db.qualities.toArray();
  },

  async add(data) {
    const id = data.id || 'q_' + Date.now();
    const item = { id, name: data.name, description: data.description || '' };
    await db.qualities.add(item);
    return item;
  },

  async update(id, data) {
    const existing = await db.qualities.get(id);
    if (!existing) throw new Error('Quality not found');
    const updated = { ...existing, ...data };
    await db.qualities.put(updated);
    return updated;
  },

  async delete(id) {
    return await db.qualities.delete(id);
  },
};
