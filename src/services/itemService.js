import { db } from '../db/database.js';

export const itemService = {
  async getAll() {
    return await db.items.toArray();
  },

  async getById(id) {
    return await db.items.get(id);
  },

  async add(itemData) {
    const id = itemData.id || 'i_' + Date.now();
    const newItem = {
      id,
      code: itemData.code || `RM-${Math.floor(100 + Math.random() * 900)}`,
      name: itemData.name,
      category: itemData.category || 'Raw Material',
      quality: itemData.quality || '',
      unit: itemData.unit || 'KG',
      defaultRate: Number(itemData.defaultRate || 0),
    };
    await db.items.add(newItem);
    return newItem;
  },

  async update(id, itemData) {
    const existing = await db.items.get(id);
    if (!existing) throw new Error('Item not found');
    const updated = { ...existing, ...itemData };
    await db.items.put(updated);
    return updated;
  },

  async delete(id) {
    return await db.items.delete(id);
  },
};
