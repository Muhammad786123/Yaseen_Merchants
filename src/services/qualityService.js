import { db } from '../db/database.js';
import { getQualityUsageCount } from '../utils/masterUsageChecker.js';

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
    const existing = await db.qualities.get(id);
    if (!existing) return;
    const count = await getQualityUsageCount(existing.id, existing.name);
    if (count > 0) {
      throw new Error(`This record is used in ${count} transactions. Delete or edit those first`);
    }
    return await db.qualities.delete(id);
  },
};
