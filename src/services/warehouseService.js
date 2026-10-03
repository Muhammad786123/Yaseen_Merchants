import { db } from '../db/database.js';

export const warehouseService = {
  async getAll() {
    return await db.warehouses.toArray();
  },

  async add(data) {
    const id = data.id || 'w_' + Date.now();
    const cleanName = (data.name || '').replace(/wirehouse/gi, 'Warehouse');
    const item = { id, name: cleanName, type: data.type || 'Raw Material', location: data.location || '' };
    await db.warehouses.add(item);
    return item;
  },

  async update(id, data) {
    const existing = await db.warehouses.get(id);
    if (!existing) throw new Error('Warehouse not found');
    const cleanName = data.name ? data.name.replace(/wirehouse/gi, 'Warehouse') : existing.name;
    const updated = { ...existing, ...data, name: cleanName };
    await db.warehouses.put(updated);
    return updated;
  },

  async delete(id) {
    return await db.warehouses.delete(id);
  },
};
